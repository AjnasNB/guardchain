// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./ChainSurePolicyNFT.sol";
import "./ChainSureGovernanceToken.sol";
import "./ChainSureStablecoin.sol";

/**
 * @title ChainSureClaimsEngine
 * @dev Main claims processing engine for the ChainSure platform
 * Features:
 * - Parametric claims (oracle-based instant payouts)
 * - Jury-based claims (community voting)
 * - AI integration for fraud detection
 * - Automated claim processing
 * - Stake management and slashing
 */
contract ChainSureClaimsEngine is Ownable, Pausable, ReentrancyGuard {
    // Events
    event ClaimSubmitted(
        uint256 indexed claimId,
        uint256 indexed policyId,
        address indexed claimant,
        ClaimType claimType,
        uint256 requestedAmount
    );
    event ClaimApproved(uint256 indexed claimId, uint256 payoutAmount, ProcessingType processingType);
    event ClaimRejected(uint256 indexed claimId, string reason);
    event JurySelected(uint256 indexed claimId, address[] jurors);
    event VoteCast(uint256 indexed claimId, address indexed juror, bool approved, uint256 suggestedAmount);
    event ClaimProcessed(uint256 indexed claimId, bool approved, uint256 finalAmount);
    event OracleUpdated(address indexed oracle, bool enabled);
    event FraudDetected(uint256 indexed claimId, uint256 fraudScore, string reason);

    // Enums
    enum ClaimType { Health, Vehicle, Travel, ProductWarranty, Pet, Agricultural }
    enum ClaimStatus { Pending, UnderReview, Approved, Rejected, Paid }
    enum ProcessingType { Parametric, JuryBased, AIAssisted }

    // Structures
    struct Claim {
        uint256 claimId;
        uint256 policyId;
        address claimant;
        ClaimType claimType;
        ClaimStatus status;
        ProcessingType processingType;
        uint256 requestedAmount;
        uint256 approvedAmount;
        uint256 submissionTime;
        uint256 votingDeadline;
        string description;
        string[] evidenceHashes; // IPFS hashes for evidence
        bytes32 aiAnalysisHash; // Hash of AI analysis result
        uint256 fraudScore;
    }

    struct Vote {
        address juror;
        bool approved;
        uint256 suggestedAmount;
        uint256 timestamp;
        string justification;
    }

    struct JuryVoting {
        address[] selectedJurors;
        mapping(address => Vote) votes;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 totalVotes;
        uint256 averageSuggestedAmount;
        bool concluded;
    }

    // Contract references
    ChainSurePolicyNFT public policyNFT;
    ChainSureGovernanceToken public governanceToken;
    ChainSureStablecoin public stablecoin;

    // State variables
    mapping(uint256 => Claim) public claims;
    mapping(uint256 => JuryVoting) public juryVotings;
    mapping(address => bool) public authorizedOracles;
    mapping(ClaimType => uint256) public parametricThresholds; // Auto-approve threshold amounts
    mapping(ClaimType => uint256) public juryThresholds; // Minimum amount requiring jury
    mapping(address => uint256) public jurorRewards;

    uint256 public nextClaimId = 1;
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant MIN_JURY_SIZE = 5;
    uint256 public constant MAX_JURY_SIZE = 15;
    uint256 public constant CONSENSUS_THRESHOLD = 60; // 60% for approval
    uint256 public constant AI_FRAUD_THRESHOLD = 80; // 80% fraud score threshold

    address public aiServiceEndpoint;
    uint256 public totalClaimsProcessed;
    uint256 public totalPayoutAmount;

    modifier onlyAuthorizedOracle() {
        require(authorizedOracles[msg.sender], "ClaimsEngine: not authorized oracle");
        _;
    }

    modifier validClaim(uint256 claimId) {
        require(claims[claimId].claimId != 0, "ClaimsEngine: claim does not exist");
        _;
    }

    modifier onlyClaimant(uint256 claimId) {
        require(claims[claimId].claimant == msg.sender, "ClaimsEngine: not claim owner");
        _;
    }

    constructor(
        address _policyNFT,
        address _governanceToken,
        address _stablecoin,
        address _aiServiceEndpoint
    ) {
        policyNFT = ChainSurePolicyNFT(_policyNFT);
        governanceToken = ChainSureGovernanceToken(_governanceToken);
        stablecoin = ChainSureStablecoin(_stablecoin);
        aiServiceEndpoint = _aiServiceEndpoint;

        // Initialize parametric thresholds (auto-approve amounts)
        parametricThresholds[ClaimType.Health] = 50_000 * 10**18; // 50K tokens
        parametricThresholds[ClaimType.Vehicle] = 100_000 * 10**18; // 100K tokens
        parametricThresholds[ClaimType.Travel] = 10_000 * 10**18; // 10K tokens
        parametricThresholds[ClaimType.ProductWarranty] = 5_000 * 10**18; // 5K tokens
        parametricThresholds[ClaimType.Pet] = 20_000 * 10**18; // 20K tokens
        parametricThresholds[ClaimType.Agricultural] = 200_000 * 10**18; // 200K tokens

        // Initialize jury thresholds (minimum for jury review)
        juryThresholds[ClaimType.Health] = 10_000 * 10**18; // 10K tokens
        juryThresholds[ClaimType.Vehicle] = 20_000 * 10**18; // 20K tokens
        juryThresholds[ClaimType.Travel] = 5_000 * 10**18; // 5K tokens
        juryThresholds[ClaimType.ProductWarranty] = 2_000 * 10**18; // 2K tokens
        juryThresholds[ClaimType.Pet] = 5_000 * 10**18; // 5K tokens
        juryThresholds[ClaimType.Agricultural] = 50_000 * 10**18; // 50K tokens
    }

    /**
     * @dev Submit a new claim
     * @param policyId Policy NFT token ID
     * @param claimType Type of claim
     * @param requestedAmount Amount requested
     * @param description Claim description
     * @param evidenceHashes Array of IPFS hashes for evidence
     */
    function submitClaim(
        uint256 policyId,
        ClaimType claimType,
        uint256 requestedAmount,
        string memory description,
        string[] memory evidenceHashes
    ) external whenNotPaused nonReentrant returns (uint256) {
        // Validate policy
        require(policyNFT.isPolicyActive(policyId), "ClaimsEngine: policy not active");
        require(requestedAmount > 0, "ClaimsEngine: amount must be positive");
        require(
            requestedAmount <= policyNFT.getRemainingCoverage(policyId),
            "ClaimsEngine: amount exceeds remaining coverage"
        );

        // Verify claimant is authorized (policy owner or beneficiary)
        ChainSurePolicyNFT.PolicyData memory policyData = policyNFT.getPolicyData(policyId);
        require(
            msg.sender == policyData.policyholder || msg.sender == policyData.beneficiary,
            "ClaimsEngine: not authorized to claim"
        );

        uint256 claimId = nextClaimId++;

        // Determine processing type
        ProcessingType processingType = _determineProcessingType(claimType, requestedAmount);

        // Create claim
        claims[claimId] = Claim({
            claimId: claimId,
            policyId: policyId,
            claimant: msg.sender,
            claimType: claimType,
            status: ClaimStatus.Pending,
            processingType: processingType,
            requestedAmount: requestedAmount,
            approvedAmount: 0,
            submissionTime: block.timestamp,
            votingDeadline: 0,
            description: description,
            evidenceHashes: evidenceHashes,
            aiAnalysisHash: 0,
            fraudScore: 0
        });

        emit ClaimSubmitted(claimId, policyId, msg.sender, claimType, requestedAmount);

        // Process based on type
        if (processingType == ProcessingType.Parametric) {
            _processParametricClaim(claimId);
        } else {
            _initiateAIAnalysis(claimId);
        }

        return claimId;
    }

    /**
     * @dev Process a parametric claim with oracle data
     * @param claimId Claim ID
     * @param oracleData Oracle-verified data
     * @param approved Whether oracle approves the claim
     */
    function processParametricClaim(
        uint256 claimId,
        bytes memory oracleData,
        bool approved
    ) external onlyAuthorizedOracle validClaim(claimId) {
        Claim storage claim = claims[claimId];
        require(
            claim.processingType == ProcessingType.Parametric,
            "ClaimsEngine: not parametric claim"
        );
        require(claim.status == ClaimStatus.Pending, "ClaimsEngine: claim not pending");

        if (approved) {
            claim.status = ClaimStatus.Approved;
            claim.approvedAmount = claim.requestedAmount;
            _executePayout(claimId);
            emit ClaimApproved(claimId, claim.requestedAmount, ProcessingType.Parametric);
        } else {
            claim.status = ClaimStatus.Rejected;
            emit ClaimRejected(claimId, "Oracle verification failed");
        }
    }

    /**
     * @dev Submit AI analysis result
     * @param claimId Claim ID
     * @param fraudScore Fraud score (0-100)
     * @param analysisHash Hash of detailed analysis
     * @param recommendedAmount AI-recommended payout amount
     */
    function submitAIAnalysis(
        uint256 claimId,
        uint256 fraudScore,
        bytes32 analysisHash,
        uint256 recommendedAmount
    ) external validClaim(claimId) {
        require(msg.sender == aiServiceEndpoint, "ClaimsEngine: not authorized AI service");
        
        Claim storage claim = claims[claimId];
        claim.fraudScore = fraudScore;
        claim.aiAnalysisHash = analysisHash;

        if (fraudScore >= AI_FRAUD_THRESHOLD) {
            claim.status = ClaimStatus.Rejected;
            emit FraudDetected(claimId, fraudScore, "High fraud score");
            emit ClaimRejected(claimId, "AI detected potential fraud");
            return;
        }

        // If low-risk and within parametric threshold, auto-approve
        if (fraudScore < 20 && recommendedAmount <= parametricThresholds[claim.claimType]) {
            claim.status = ClaimStatus.Approved;
            claim.approvedAmount = recommendedAmount;
            _executePayout(claimId);
            emit ClaimApproved(claimId, recommendedAmount, ProcessingType.AIAssisted);
        } else {
            // Send to jury for review
            _initiateJuryVoting(claimId);
        }
    }

    /**
     * @dev Cast vote as a jury member
     * @param claimId Claim ID
     * @param approved Whether to approve the claim
     * @param suggestedAmount Suggested payout amount
     * @param justification Justification for the vote
     */
    function castVote(
        uint256 claimId,
        bool approved,
        uint256 suggestedAmount,
        string memory justification
    ) external validClaim(claimId) {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.UnderReview, "ClaimsEngine: claim not under review");
        require(block.timestamp <= claim.votingDeadline, "ClaimsEngine: voting period ended");

        JuryVoting storage voting = juryVotings[claimId];
        require(_isJuror(claimId, msg.sender), "ClaimsEngine: not selected juror");
        require(voting.votes[msg.sender].juror == address(0), "ClaimsEngine: already voted");

        if (approved) {
            require(suggestedAmount <= claim.requestedAmount, "ClaimsEngine: amount exceeds request");
        }

        // Record vote
        voting.votes[msg.sender] = Vote({
            juror: msg.sender,
            approved: approved,
            suggestedAmount: suggestedAmount,
            timestamp: block.timestamp,
            justification: justification
        });

        voting.totalVotes++;
        if (approved) {
            voting.votesFor++;
            voting.averageSuggestedAmount = 
                (voting.averageSuggestedAmount * (voting.votesFor - 1) + suggestedAmount) / voting.votesFor;
        } else {
            voting.votesAgainst++;
        }

        emit VoteCast(claimId, msg.sender, approved, suggestedAmount);

        // Check if voting is complete
        if (voting.totalVotes == voting.selectedJurors.length || 
            voting.votesFor * 100 / voting.selectedJurors.length >= CONSENSUS_THRESHOLD ||
            voting.votesAgainst * 100 / voting.selectedJurors.length > (100 - CONSENSUS_THRESHOLD)) {
            _finalizeJuryDecision(claimId);
        }
    }

    /**
     * @dev Finalize voting if deadline passed
     * @param claimId Claim ID
     */
    function finalizeVoting(uint256 claimId) external validClaim(claimId) {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.UnderReview, "ClaimsEngine: claim not under review");
        require(block.timestamp > claim.votingDeadline, "ClaimsEngine: voting still active");

        JuryVoting storage voting = juryVotings[claimId];
        require(!voting.concluded, "ClaimsEngine: voting already concluded");

        _finalizeJuryDecision(claimId);
    }

    /**
     * @dev Get claim details
     * @param claimId Claim ID
     * @return Claim struct
     */
    function getClaim(uint256 claimId) external view returns (Claim memory) {
        return claims[claimId];
    }

    /**
     * @dev Get jury voting details
     * @param claimId Claim ID
     * @return jurors Selected jurors array
     * @return votesFor Number of votes for approval
     * @return votesAgainst Number of votes against approval
     * @return totalVotes Total number of votes cast
     * @return averageAmount Average suggested amount
     * @return concluded Whether voting is concluded
     */
    function getJuryVoting(uint256 claimId) external view returns (
        address[] memory jurors,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 totalVotes,
        uint256 averageAmount,
        bool concluded
    ) {
        JuryVoting storage voting = juryVotings[claimId];
        return (
            voting.selectedJurors,
            voting.votesFor,
            voting.votesAgainst,
            voting.totalVotes,
            voting.averageSuggestedAmount,
            voting.concluded
        );
    }

    /**
     * @dev Get juror's vote for a claim
     * @param claimId Claim ID
     * @param juror Juror address
     * @return Vote struct
     */
    function getJurorVote(uint256 claimId, address juror) external view returns (Vote memory) {
        return juryVotings[claimId].votes[juror];
    }

    // Internal functions
    function _determineProcessingType(ClaimType claimType, uint256 amount) internal view returns (ProcessingType) {
        if (amount <= parametricThresholds[claimType]) {
            return ProcessingType.Parametric;
        } else if (amount >= juryThresholds[claimType]) {
            return ProcessingType.JuryBased;
        } else {
            return ProcessingType.AIAssisted;
        }
    }

    function _processParametricClaim(uint256 claimId) internal {
        // In a real implementation, this would trigger oracle calls
        // For now, we'll mark it as pending oracle verification
        claims[claimId].status = ClaimStatus.Pending;
    }

    function _initiateAIAnalysis(uint256 claimId) internal {
        // In a real implementation, this would call the AI service
        // For now, we'll mark as pending AI analysis
        claims[claimId].status = ClaimStatus.Pending;
    }

    function _initiateJuryVoting(uint256 claimId) internal {
        Claim storage claim = claims[claimId];
        claim.status = ClaimStatus.UnderReview;
        claim.votingDeadline = block.timestamp + VOTING_PERIOD;

        // Select jury
        uint256 jurySize = _calculateJurySize(claim.requestedAmount);
        bytes32 seed = keccak256(abi.encodePacked(claimId, block.timestamp, blockhash(block.number - 1)));
        address[] memory selectedJurors = governanceToken.selectJurors(seed, jurySize);

        JuryVoting storage voting = juryVotings[claimId];
        voting.selectedJurors = selectedJurors;

        emit JurySelected(claimId, selectedJurors);
    }

    function _calculateJurySize(uint256 amount) internal pure returns (uint256) {
        // Larger amounts get more jurors
        if (amount >= 1_000_000 * 10**18) return MAX_JURY_SIZE; // 1M+ tokens
        if (amount >= 500_000 * 10**18) return 10; // 500K+ tokens
        if (amount >= 100_000 * 10**18) return 7; // 100K+ tokens
        return MIN_JURY_SIZE; // Default
    }

    function _isJuror(uint256 claimId, address addr) internal view returns (bool) {
        address[] memory jurors = juryVotings[claimId].selectedJurors;
        for (uint256 i = 0; i < jurors.length; i++) {
            if (jurors[i] == addr) return true;
        }
        return false;
    }

    function _finalizeJuryDecision(uint256 claimId) internal {
        Claim storage claim = claims[claimId];
        JuryVoting storage voting = juryVotings[claimId];
        
        voting.concluded = true;
        
        uint256 approvalPercentage = (voting.votesFor * 100) / voting.totalVotes;
        
        if (approvalPercentage >= CONSENSUS_THRESHOLD) {
            claim.status = ClaimStatus.Approved;
            claim.approvedAmount = voting.averageSuggestedAmount;
            _executePayout(claimId);
            _distributeJuryRewards(claimId, true);
            emit ClaimApproved(claimId, claim.approvedAmount, ProcessingType.JuryBased);
        } else {
            claim.status = ClaimStatus.Rejected;
            _distributeJuryRewards(claimId, false);
            emit ClaimRejected(claimId, "Insufficient jury consensus");
        }

        emit ClaimProcessed(claimId, claim.status == ClaimStatus.Approved, claim.approvedAmount);
    }

    function _executePayout(uint256 claimId) internal {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.Approved, "ClaimsEngine: claim not approved");

        // Process payout through policy NFT
        policyNFT.processClaim(
            claim.policyId,
            claim.approvedAmount,
            claim.claimant,
            claimId
        );

        claim.status = ClaimStatus.Paid;
        totalClaimsProcessed++;
        totalPayoutAmount += claim.approvedAmount;
    }

    function _distributeJuryRewards(uint256 claimId, bool approved) internal {
        JuryVoting storage voting = juryVotings[claimId];
        uint256 rewardPerJuror = 100 * 10**18; // 100 tokens per juror

        for (uint256 i = 0; i < voting.selectedJurors.length; i++) {
            address juror = voting.selectedJurors[i];
            Vote memory vote = voting.votes[juror];
            
            if (vote.juror != address(0)) { // Juror voted
                if ((approved && vote.approved) || (!approved && !vote.approved)) {
                    // Honest vote - reward
                    jurorRewards[juror] += rewardPerJuror;
                } else {
                    // Dishonest vote - potential slashing (handled by governance)
                    // This would trigger a governance proposal for slashing
                }
            }
        }
    }

    // Admin functions
    function updateParametricThreshold(ClaimType claimType, uint256 newThreshold) external onlyOwner {
        parametricThresholds[claimType] = newThreshold;
    }

    function updateJuryThreshold(ClaimType claimType, uint256 newThreshold) external onlyOwner {
        juryThresholds[claimType] = newThreshold;
    }

    function addAuthorizedOracle(address oracle) external onlyOwner {
        authorizedOracles[oracle] = true;
        emit OracleUpdated(oracle, true);
    }

    function removeAuthorizedOracle(address oracle) external onlyOwner {
        authorizedOracles[oracle] = false;
        emit OracleUpdated(oracle, false);
    }

    function updateAIServiceEndpoint(address newEndpoint) external onlyOwner {
        aiServiceEndpoint = newEndpoint;
    }

    function withdrawJurorRewards() external {
        uint256 rewards = jurorRewards[msg.sender];
        require(rewards > 0, "ClaimsEngine: no rewards to withdraw");
        
        jurorRewards[msg.sender] = 0;
        governanceToken.transfer(msg.sender, rewards);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
} 