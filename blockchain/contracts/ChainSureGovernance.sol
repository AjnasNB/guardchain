// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./ChainSureGovernanceToken.sol";
import "./ChainSurePolicyNFT.sol";
import "./ChainSureClaimsEngine.sol";
import "./ChainSureSurplusDistributor.sol";

/**
 * @title ChainSureGovernance
 * @dev Governance contract for community-driven decision making
 * Features:
 * - Proposal creation and voting
 * - Token-weighted voting system
 * - Timelock for critical changes
 * - Emergency governance for urgent decisions
 * - Parameter updates for all platform contracts
 */
contract ChainSureGovernance is Ownable, Pausable, ReentrancyGuard {
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        ProposalType proposalType,
        string description,
        uint256 votingStart,
        uint256 votingEnd
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 votes, string reason);
    event ProposalExecuted(uint256 indexed proposalId, bool successful);
    event ProposalCancelled(uint256 indexed proposalId, string reason);
    event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum);
    event VotingPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);

    // Enums
    enum ProposalType {
        ParameterChange,     // Change platform parameters
        CoverTypeAddition,   // Add new insurance cover type
        FeeUpdate,          // Update platform fees
        ContractUpgrade,    // Upgrade contract functionality
        EmergencyAction,    // Emergency governance action
        Treasury,           // Treasury management
        Slashing           // Slashing malicious actors
    }

    enum ProposalStatus {
        Pending,      // Proposal created, voting not started
        Active,       // Voting in progress
        Succeeded,    // Proposal passed
        Failed,       // Proposal failed
        Executed,     // Proposal executed
        Cancelled,    // Proposal cancelled
        Expired       // Proposal expired without execution
    }

    // Structures
    struct Proposal {
        uint256 proposalId;
        address proposer;
        ProposalType proposalType;
        ProposalStatus status;
        string description;
        bytes executionData;
        address targetContract;
        uint256 votingStart;
        uint256 votingEnd;
        uint256 executionDelay;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        mapping(address => bool) hasVoted;
        mapping(address => Vote) votes;
    }

    struct Vote {
        bool support;
        uint256 votes;
        string reason;
    }

    struct ProposalThresholds {
        uint256 proposalThreshold;    // Minimum tokens to create proposal
        uint256 quorumThreshold;      // Minimum participation for validity
        uint256 approvalThreshold;    // Minimum approval percentage
    }

    // Contract references
    ChainSureGovernanceToken public governanceToken;
    ChainSurePolicyNFT public policyNFT;
    ChainSureClaimsEngine public claimsEngine;
    ChainSureSurplusDistributor public surplusDistributor;

    // State variables
    mapping(uint256 => Proposal) public proposals;
    mapping(ProposalType => ProposalThresholds) public thresholds;
    mapping(address => bool) public emergencyGovernors;
    
    uint256 public nextProposalId = 1;
    uint256 public votingPeriod = 7 days;
    uint256 public executionDelay = 2 days;
    uint256 public emergencyVotingPeriod = 1 days;
    uint256 public proposalMaxOperations = 10;

    // Guardian for emergency actions
    address public guardian;
    bool public guardianPaused = false;

    modifier onlyProposer(uint256 proposalId) {
        require(proposals[proposalId].proposer == msg.sender, "Governance: not proposer");
        _;
    }

    modifier onlyGuardian() {
        require(msg.sender == guardian, "Governance: not guardian");
        _;
    }

    modifier whenNotGuardianPaused() {
        require(!guardianPaused, "Governance: guardian paused");
        _;
    }

    constructor(
        address _governanceToken,
        address _policyNFT,
        address _claimsEngine,
        address _surplusDistributor,
        address _guardian
    ) {
        governanceToken = ChainSureGovernanceToken(_governanceToken);
        policyNFT = ChainSurePolicyNFT(_policyNFT);
        claimsEngine = ChainSureClaimsEngine(_claimsEngine);
        surplusDistributor = ChainSureSurplusDistributor(_surplusDistributor);
        guardian = _guardian;

        // Initialize thresholds for different proposal types
        thresholds[ProposalType.ParameterChange] = ProposalThresholds({
            proposalThreshold: 10000 * 10**18,  // 10K tokens
            quorumThreshold: 10,                // 10% participation
            approvalThreshold: 60               // 60% approval
        });

        thresholds[ProposalType.CoverTypeAddition] = ProposalThresholds({
            proposalThreshold: 50000 * 10**18,  // 50K tokens
            quorumThreshold: 15,                // 15% participation
            approvalThreshold: 70               // 70% approval
        });

        thresholds[ProposalType.FeeUpdate] = ProposalThresholds({
            proposalThreshold: 25000 * 10**18,  // 25K tokens
            quorumThreshold: 12,                // 12% participation
            approvalThreshold: 65               // 65% approval
        });

        thresholds[ProposalType.ContractUpgrade] = ProposalThresholds({
            proposalThreshold: 100000 * 10**18, // 100K tokens
            quorumThreshold: 20,                // 20% participation
            approvalThreshold: 75               // 75% approval
        });

        thresholds[ProposalType.EmergencyAction] = ProposalThresholds({
            proposalThreshold: 5000 * 10**18,   // 5K tokens
            quorumThreshold: 5,                 // 5% participation
            approvalThreshold: 50               // 50% approval
        });

        thresholds[ProposalType.Treasury] = ProposalThresholds({
            proposalThreshold: 75000 * 10**18,  // 75K tokens
            quorumThreshold: 18,                // 18% participation
            approvalThreshold: 70               // 70% approval
        });

        thresholds[ProposalType.Slashing] = ProposalThresholds({
            proposalThreshold: 20000 * 10**18,  // 20K tokens
            quorumThreshold: 15,                // 15% participation
            approvalThreshold: 80               // 80% approval
        });
    }

    /**
     * @dev Create a new governance proposal
     * @param proposalType Type of proposal
     * @param description Description of the proposal
     * @param targetContract Contract to execute on (if applicable)
     * @param executionData Encoded function call data
     */
    function propose(
        ProposalType proposalType,
        string memory description,
        address targetContract,
        bytes memory executionData
    ) public whenNotPaused whenNotGuardianPaused returns (uint256) {
        require(bytes(description).length > 0, "Governance: empty description");
        
        // Check proposal threshold
        uint256 proposerVotes = governanceToken.getVotes(msg.sender);
        require(
            proposerVotes >= thresholds[proposalType].proposalThreshold,
            "Governance: insufficient voting power"
        );

        uint256 proposalId = nextProposalId++;
        
        uint256 startTime = block.timestamp;
        uint256 endTime = proposalType == ProposalType.EmergencyAction 
            ? startTime + emergencyVotingPeriod 
            : startTime + votingPeriod;

        Proposal storage proposal = proposals[proposalId];
        proposal.proposalId = proposalId;
        proposal.proposer = msg.sender;
        proposal.proposalType = proposalType;
        proposal.status = ProposalStatus.Active;
        proposal.description = description;
        proposal.targetContract = targetContract;
        proposal.executionData = executionData;
        proposal.votingStart = startTime;
        proposal.votingEnd = endTime;
        proposal.executionDelay = proposalType == ProposalType.EmergencyAction ? 0 : executionDelay;

        emit ProposalCreated(
            proposalId,
            msg.sender,
            proposalType,
            description,
            startTime,
            endTime
        );

        return proposalId;
    }

    /**
     * @dev Cast vote on a proposal
     * @param proposalId Proposal ID to vote on
     * @param support Whether to support the proposal
     * @param reason Reason for the vote
     */
    function castVote(
        uint256 proposalId,
        bool support,
        string memory reason
    ) external whenNotPaused {
        return _castVote(proposalId, msg.sender, support, reason);
    }

    /**
     * @dev Cast vote with signature (for meta-transactions)
     * @param proposalId Proposal ID
     * @param support Support decision
     * @param reason Vote reason
     * @param v,r,s Signature components
     */
    function castVoteBySig(
        uint256 proposalId,
        bool support,
        string memory reason,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external whenNotPaused {
        // Verify signature and extract voter address
        bytes32 message = keccak256(abi.encodePacked(proposalId, support, reason));
        address voter = ecrecover(message, v, r, s);
        require(voter != address(0), "Governance: invalid signature");
        
        _castVote(proposalId, voter, support, reason);
    }

    /**
     * @dev Execute a successful proposal
     * @param proposalId Proposal ID to execute
     */
    function execute(uint256 proposalId) external payable whenNotPaused nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.Succeeded, "Governance: proposal not succeeded");
        require(
            block.timestamp >= proposal.votingEnd + proposal.executionDelay,
            "Governance: execution delay not met"
        );
        require(!proposal.executed, "Governance: already executed");

        proposal.executed = true;
        proposal.status = ProposalStatus.Executed;

        bool success = false;
        if (proposal.targetContract != address(0) && proposal.executionData.length > 0) {
            // Execute the proposal
            (success, ) = proposal.targetContract.call{value: msg.value}(proposal.executionData);
        } else {
            // Proposal without execution (informational)
            success = true;
        }

        emit ProposalExecuted(proposalId, success);
    }

    /**
     * @dev Cancel a proposal (only by proposer or guardian)
     * @param proposalId Proposal ID to cancel
     * @param reason Reason for cancellation
     */
    function cancel(uint256 proposalId, string memory reason) external {
        Proposal storage proposal = proposals[proposalId];
        require(
            msg.sender == proposal.proposer || 
            msg.sender == guardian || 
            governanceToken.getVotes(proposal.proposer) < thresholds[proposal.proposalType].proposalThreshold,
            "Governance: unauthorized cancellation"
        );
        require(
            proposal.status == ProposalStatus.Pending || proposal.status == ProposalStatus.Active,
            "Governance: cannot cancel"
        );

        proposal.status = ProposalStatus.Cancelled;
        emit ProposalCancelled(proposalId, reason);
    }

    /**
     * @dev Internal vote casting logic
     */
    function _castVote(
        uint256 proposalId,
        address voter,
        bool support,
        string memory reason
    ) internal {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.Active, "Governance: voting not active");
        require(block.timestamp <= proposal.votingEnd, "Governance: voting ended");
        require(!proposal.hasVoted[voter], "Governance: already voted");

        uint256 votes = governanceToken.getVotes(voter);
        require(votes > 0, "Governance: no voting power");

        proposal.hasVoted[voter] = true;
        proposal.votes[voter] = Vote({
            support: support,
            votes: votes,
            reason: reason
        });

        if (support) {
            proposal.forVotes += votes;
        } else {
            proposal.againstVotes += votes;
        }

        emit VoteCast(proposalId, voter, support, votes, reason);

        // Check if proposal should be finalized
        _updateProposalStatus(proposalId);
    }

    /**
     * @dev Update proposal status based on voting results
     */
    function _updateProposalStatus(uint256 proposalId) internal {
        Proposal storage proposal = proposals[proposalId];
        
        if (block.timestamp > proposal.votingEnd) {
            uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
            uint256 totalSupply = governanceToken.totalSupply();
            uint256 quorum = thresholds[proposal.proposalType].quorumThreshold;
            uint256 approvalThreshold = thresholds[proposal.proposalType].approvalThreshold;

            if (totalVotes * 100 >= totalSupply * quorum) {
                // Quorum met
                if (proposal.forVotes * 100 >= totalVotes * approvalThreshold) {
                    proposal.status = ProposalStatus.Succeeded;
                } else {
                    proposal.status = ProposalStatus.Failed;
                }
            } else {
                // Quorum not met
                proposal.status = ProposalStatus.Failed;
            }
        }
    }

    /**
     * @dev Create slashing proposal for malicious actors
     * @param targets Array of addresses to slash
     * @param amounts Array of amounts to slash
     * @param reason Reason for slashing
     */
    function proposeSlashing(
        address[] memory targets,
        uint256[] memory amounts,
        string memory reason
    ) external returns (uint256) {
        require(targets.length == amounts.length, "Governance: array length mismatch");
        require(targets.length > 0, "Governance: empty targets");

        bytes memory executionData = abi.encodeWithSignature(
            "slashTokens(address[],uint256[],string)",
            targets,
            amounts,
            reason
        );

        return propose(
            ProposalType.Slashing,
            string(abi.encodePacked("Slash malicious actors: ", reason)),
            address(governanceToken),
            executionData
        );
    }

    /**
     * @dev Emergency pause by guardian
     */
    function emergencyPause() external onlyGuardian {
        guardianPaused = true;
        _pause();
    }

    /**
     * @dev Emergency unpause by guardian
     */
    function emergencyUnpause() external onlyGuardian {
        guardianPaused = false;
        _unpause();
    }

    // View functions
    function getProposal(uint256 proposalId) external view returns (
        address proposer,
        ProposalType proposalType,
        ProposalStatus status,
        string memory description,
        uint256 votingStart,
        uint256 votingEnd,
        uint256 forVotes,
        uint256 againstVotes
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.proposer,
            proposal.proposalType,
            proposal.status,
            proposal.description,
            proposal.votingStart,
            proposal.votingEnd,
            proposal.forVotes,
            proposal.againstVotes
        );
    }

    function getVote(uint256 proposalId, address voter) external view returns (Vote memory) {
        return proposals[proposalId].votes[voter];
    }

    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return proposals[proposalId].hasVoted[voter];
    }

    function getProposalState(uint256 proposalId) external view returns (ProposalStatus) {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.status != ProposalStatus.Active) {
            return proposal.status;
        }

        if (block.timestamp <= proposal.votingEnd) {
            return ProposalStatus.Active;
        }

        // Update status based on results
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 totalSupply = governanceToken.totalSupply();
        uint256 quorum = thresholds[proposal.proposalType].quorumThreshold;
        uint256 approvalThreshold = thresholds[proposal.proposalType].approvalThreshold;

        if (totalVotes * 100 >= totalSupply * quorum) {
            if (proposal.forVotes * 100 >= totalVotes * approvalThreshold) {
                return ProposalStatus.Succeeded;
            }
        }
        
        return ProposalStatus.Failed;
    }

    // Admin functions
    function updateThresholds(
        ProposalType proposalType,
        uint256 proposalThreshold,
        uint256 quorumThreshold,
        uint256 approvalThreshold
    ) external onlyOwner {
        require(quorumThreshold <= 50, "Governance: quorum too high");
        require(approvalThreshold <= 95, "Governance: approval threshold too high");
        require(approvalThreshold >= 50, "Governance: approval threshold too low");

        thresholds[proposalType] = ProposalThresholds({
            proposalThreshold: proposalThreshold,
            quorumThreshold: quorumThreshold,
            approvalThreshold: approvalThreshold
        });
    }

    function updateVotingPeriod(uint256 newVotingPeriod) external onlyOwner {
        require(newVotingPeriod >= 1 days, "Governance: voting period too short");
        require(newVotingPeriod <= 30 days, "Governance: voting period too long");
        
        uint256 oldPeriod = votingPeriod;
        votingPeriod = newVotingPeriod;
        
        emit VotingPeriodUpdated(oldPeriod, newVotingPeriod);
    }

    function updateExecutionDelay(uint256 newDelay) external onlyOwner {
        require(newDelay <= 7 days, "Governance: delay too long");
        executionDelay = newDelay;
    }

    function updateGuardian(address newGuardian) external onlyOwner {
        guardian = newGuardian;
    }

    function addEmergencyGovernor(address governor) external onlyOwner {
        emergencyGovernors[governor] = true;
    }

    function removeEmergencyGovernor(address governor) external onlyOwner {
        emergencyGovernors[governor] = false;
    }
} 