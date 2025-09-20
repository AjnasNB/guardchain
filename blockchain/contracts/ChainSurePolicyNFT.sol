// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./ChainSureStablecoin.sol";

/**
 * @title ChainSurePolicyNFT
 * @dev NFT contract representing insurance policies in the ChainSure platform
 * Each policy NFT contains coverage metadata and can be transferred
 * Features:
 * - Policy creation with coverage details
 * - Premium payment tracking
 * - Policy expiration and renewal
 * - Coverage limits and terms storage
 * - Beneficiary management
 */
contract ChainSurePolicyNFT is ERC721, ERC721URIStorage, ERC721Burnable, Ownable, Pausable {
    using Counters for Counters.Counter;

    // Events
    event PolicyCreated(
        uint256 indexed tokenId,
        address indexed policyholder,
        PolicyType policyType,
        uint256 coverageAmount,
        uint256 premium,
        uint256 expiryDate
    );
    event PolicyRenewed(uint256 indexed tokenId, uint256 newExpiryDate, uint256 renewalPremium);
    event PolicyClaimed(uint256 indexed tokenId, uint256 claimAmount, address claimant);
    event BeneficiaryUpdated(uint256 indexed tokenId, address indexed newBeneficiary);
    event PremiumPaid(uint256 indexed tokenId, uint256 amount, address payer);

    // Enums
    enum PolicyType { Health, Vehicle, Travel, ProductWarranty, Pet, Agricultural }
    enum PolicyStatus { Active, Expired, Claimed, Cancelled }

    // Structures
    struct PolicyData {
        PolicyType policyType;
        PolicyStatus status;
        address policyholder;
        address beneficiary;
        uint256 coverageAmount;
        uint256 premium;
        uint256 creationDate;
        uint256 expiryDate;
        uint256 claimedAmount;
        string coverageTerms;
        bytes32 ipfsHash; // For storing detailed terms on IPFS
    }

    struct ClaimHistory {
        uint256 claimId;
        uint256 amount;
        uint256 timestamp;
        address claimant;
        bool approved;
    }

    // State variables
    Counters.Counter private _tokenIdCounter;
    ChainSureStablecoin public stablecoin;
    
    mapping(uint256 => PolicyData) public policies;
    mapping(uint256 => ClaimHistory[]) public claimHistory;
    mapping(address => uint256[]) public userPolicies;
    mapping(PolicyType => uint256) public basePremiumRates; // Premium per 1000 units coverage
    mapping(PolicyType => uint256) public maxCoverageAmounts;
    mapping(PolicyType => uint256) public defaultTermLength; // In seconds

    uint256 public constant PREMIUM_DECIMALS = 10000; // For basis points calculation
    uint256 public platformFee = 250; // 2.5% platform fee in basis points
    address public treasuryAddress;

    modifier onlyPolicyholder(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "ChainSurePolicyNFT: not policy owner");
        _;
    }

    modifier onlyActivePolicies(uint256 tokenId) {
        require(policies[tokenId].status == PolicyStatus.Active, "ChainSurePolicyNFT: policy not active");
        require(block.timestamp <= policies[tokenId].expiryDate, "ChainSurePolicyNFT: policy expired");
        _;
    }

    constructor(
        address _stablecoin,
        address _treasuryAddress
    ) ERC721("ChainSure Policy NFT", "CSPOLICY") {
        stablecoin = ChainSureStablecoin(_stablecoin);
        treasuryAddress = _treasuryAddress;
        
        // Initialize base premium rates (per 1000 units of coverage)
        basePremiumRates[PolicyType.Health] = 50; // 5% annual premium
        basePremiumRates[PolicyType.Vehicle] = 80; // 8% annual premium
        basePremiumRates[PolicyType.Travel] = 30; // 3% annual premium
        basePremiumRates[PolicyType.ProductWarranty] = 20; // 2% annual premium
        basePremiumRates[PolicyType.Pet] = 100; // 10% annual premium
        basePremiumRates[PolicyType.Agricultural] = 120; // 12% annual premium

        // Set maximum coverage amounts
        maxCoverageAmounts[PolicyType.Health] = 10_000_000 * 10**18; // 10M tokens
        maxCoverageAmounts[PolicyType.Vehicle] = 5_000_000 * 10**18; // 5M tokens
        maxCoverageAmounts[PolicyType.Travel] = 1_000_000 * 10**18; // 1M tokens
        maxCoverageAmounts[PolicyType.ProductWarranty] = 100_000 * 10**18; // 100K tokens
        maxCoverageAmounts[PolicyType.Pet] = 500_000 * 10**18; // 500K tokens
        maxCoverageAmounts[PolicyType.Agricultural] = 50_000_000 * 10**18; // 50M tokens

        // Set default term lengths (1 year for most)
        defaultTermLength[PolicyType.Health] = 365 days;
        defaultTermLength[PolicyType.Vehicle] = 365 days;
        defaultTermLength[PolicyType.Travel] = 30 days;
        defaultTermLength[PolicyType.ProductWarranty] = 365 days;
        defaultTermLength[PolicyType.Pet] = 365 days;
        defaultTermLength[PolicyType.Agricultural] = 365 days;
    }

    /**
     * @dev Create a new insurance policy
     * @param to Address to receive the policy NFT
     * @param policyType Type of insurance policy
     * @param coverageAmount Amount of coverage
     * @param beneficiary Beneficiary address
     * @param coverageTerms Terms and conditions
     * @param ipfsHash IPFS hash for detailed documentation
     * @param customTermLength Custom term length (0 for default)
     */
    function createPolicy(
        address to,
        PolicyType policyType,
        uint256 coverageAmount,
        address beneficiary,
        string memory coverageTerms,
        bytes32 ipfsHash,
        uint256 customTermLength
    ) external whenNotPaused returns (uint256) {
        require(to != address(0), "ChainSurePolicyNFT: invalid recipient");
        require(coverageAmount > 0, "ChainSurePolicyNFT: coverage amount must be positive");
        require(coverageAmount <= maxCoverageAmounts[policyType], "ChainSurePolicyNFT: coverage exceeds maximum");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        // Calculate premium
        uint256 premium = calculatePremium(policyType, coverageAmount);
        
        // Calculate term length
        uint256 termLength = customTermLength > 0 ? customTermLength : defaultTermLength[policyType];
        uint256 expiryDate = block.timestamp + termLength;

        // Create policy data
        policies[tokenId] = PolicyData({
            policyType: policyType,
            status: PolicyStatus.Active,
            policyholder: to,
            beneficiary: beneficiary != address(0) ? beneficiary : to,
            coverageAmount: coverageAmount,
            premium: premium,
            creationDate: block.timestamp,
            expiryDate: expiryDate,
            claimedAmount: 0,
            coverageTerms: coverageTerms,
            ipfsHash: ipfsHash
        });

        // Add to user's policy list
        userPolicies[to].push(tokenId);

        // Collect premium payment
        uint256 platformFeeAmount = (premium * platformFee) / PREMIUM_DECIMALS;
        uint256 poolAmount = premium - platformFeeAmount;

        require(
            stablecoin.transferFrom(msg.sender, address(this), poolAmount),
            "ChainSurePolicyNFT: premium payment failed"
        );
        
        if (platformFeeAmount > 0) {
            require(
                stablecoin.transferFrom(msg.sender, treasuryAddress, platformFeeAmount),
                "ChainSurePolicyNFT: platform fee payment failed"
            );
        }

        // Mint NFT
        _safeMint(to, tokenId);

        emit PolicyCreated(tokenId, to, policyType, coverageAmount, premium, expiryDate);
        emit PremiumPaid(tokenId, premium, msg.sender);

        return tokenId;
    }

    /**
     * @dev Renew an existing policy
     * @param tokenId Policy NFT token ID
     * @param additionalTermLength Additional term to add
     */
    function renewPolicy(
        uint256 tokenId,
        uint256 additionalTermLength
    ) external onlyPolicyholder(tokenId) whenNotPaused {
        require(_exists(tokenId), "ChainSurePolicyNFT: policy does not exist");
        require(additionalTermLength > 0, "ChainSurePolicyNFT: term length must be positive");

        PolicyData storage policy = policies[tokenId];
        
        // Calculate renewal premium (proportional to additional term)
        uint256 renewalPremium = (policy.premium * additionalTermLength) / defaultTermLength[policy.policyType];
        
        // Collect renewal premium
        uint256 platformFeeAmount = (renewalPremium * platformFee) / PREMIUM_DECIMALS;
        uint256 poolAmount = renewalPremium - platformFeeAmount;

        require(
            stablecoin.transferFrom(msg.sender, address(this), poolAmount),
            "ChainSurePolicyNFT: renewal premium payment failed"
        );
        
        if (platformFeeAmount > 0) {
            require(
                stablecoin.transferFrom(msg.sender, treasuryAddress, platformFeeAmount),
                "ChainSurePolicyNFT: platform fee payment failed"
            );
        }

        // Extend expiry date
        policy.expiryDate += additionalTermLength;
        if (policy.status == PolicyStatus.Expired) {
            policy.status = PolicyStatus.Active;
        }

        emit PolicyRenewed(tokenId, policy.expiryDate, renewalPremium);
        emit PremiumPaid(tokenId, renewalPremium, msg.sender);
    }

    /**
     * @dev Update beneficiary for a policy
     * @param tokenId Policy NFT token ID
     * @param newBeneficiary New beneficiary address
     */
    function updateBeneficiary(
        uint256 tokenId,
        address newBeneficiary
    ) external onlyPolicyholder(tokenId) {
        require(_exists(tokenId), "ChainSurePolicyNFT: policy does not exist");
        require(newBeneficiary != address(0), "ChainSurePolicyNFT: invalid beneficiary");

        policies[tokenId].beneficiary = newBeneficiary;
        emit BeneficiaryUpdated(tokenId, newBeneficiary);
    }

    /**
     * @dev Process a claim payout (called by Claims Engine)
     * @param tokenId Policy NFT token ID
     * @param claimAmount Amount to pay out
     * @param claimant Address receiving the payout
     * @param claimId Unique claim identifier
     */
    function processClaim(
        uint256 tokenId,
        uint256 claimAmount,
        address claimant,
        uint256 claimId
    ) external onlyOwner onlyActivePolicies(tokenId) {
        require(_exists(tokenId), "ChainSurePolicyNFT: policy does not exist");
        require(claimAmount > 0, "ChainSurePolicyNFT: claim amount must be positive");

        PolicyData storage policy = policies[tokenId];
        require(
            policy.claimedAmount + claimAmount <= policy.coverageAmount,
            "ChainSurePolicyNFT: claim exceeds remaining coverage"
        );

        // Update claimed amount
        policy.claimedAmount += claimAmount;
        
        // If full coverage claimed, mark as claimed
        if (policy.claimedAmount >= policy.coverageAmount) {
            policy.status = PolicyStatus.Claimed;
        }

        // Record claim history
        claimHistory[tokenId].push(ClaimHistory({
            claimId: claimId,
            amount: claimAmount,
            timestamp: block.timestamp,
            claimant: claimant,
            approved: true
        }));

        // Transfer claim amount
        require(
            stablecoin.transfer(claimant, claimAmount),
            "ChainSurePolicyNFT: claim payout failed"
        );

        emit PolicyClaimed(tokenId, claimAmount, claimant);
    }

    /**
     * @dev Calculate premium for a policy type and coverage amount
     * @param policyType Type of policy
     * @param coverageAmount Coverage amount
     * @return Premium amount
     */
    function calculatePremium(
        PolicyType policyType,
        uint256 coverageAmount
    ) public view returns (uint256) {
        uint256 rate = basePremiumRates[policyType];
        return (coverageAmount * rate) / 1000;
    }

    /**
     * @dev Get policy details
     * @param tokenId Policy NFT token ID
     * @return PolicyData struct
     */
    function getPolicyData(uint256 tokenId) external view returns (PolicyData memory) {
        require(_exists(tokenId), "ChainSurePolicyNFT: policy does not exist");
        return policies[tokenId];
    }

    /**
     * @dev Get all policies owned by an address
     * @param user User address
     * @return Array of token IDs
     */
    function getUserPolicies(address user) external view returns (uint256[] memory) {
        return userPolicies[user];
    }

    /**
     * @dev Get claim history for a policy
     * @param tokenId Policy NFT token ID
     * @return Array of ClaimHistory structs
     */
    function getClaimHistory(uint256 tokenId) external view returns (ClaimHistory[] memory) {
        require(_exists(tokenId), "ChainSurePolicyNFT: policy does not exist");
        return claimHistory[tokenId];
    }

    /**
     * @dev Check if policy is active and valid
     * @param tokenId Policy NFT token ID
     * @return Whether policy is active
     */
    function isPolicyActive(uint256 tokenId) external view returns (bool) {
        if (!_exists(tokenId)) return false;
        PolicyData memory policy = policies[tokenId];
        return policy.status == PolicyStatus.Active && block.timestamp <= policy.expiryDate;
    }

    /**
     * @dev Get remaining coverage for a policy
     * @param tokenId Policy NFT token ID
     * @return Remaining coverage amount
     */
    function getRemainingCoverage(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "ChainSurePolicyNFT: policy does not exist");
        PolicyData memory policy = policies[tokenId];
        return policy.coverageAmount - policy.claimedAmount;
    }

    // Admin functions
    function updateBasePremiumRate(PolicyType policyType, uint256 newRate) external onlyOwner {
        basePremiumRates[policyType] = newRate;
    }

    function updateMaxCoverageAmount(PolicyType policyType, uint256 newAmount) external onlyOwner {
        maxCoverageAmounts[policyType] = newAmount;
    }

    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "ChainSurePolicyNFT: fee cannot exceed 10%");
        platformFee = newFee;
    }

    function updateTreasuryAddress(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "ChainSurePolicyNFT: invalid treasury address");
        treasuryAddress = newTreasury;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Override functions
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // Update user policy lists on transfer
        if (from != address(0) && to != address(0)) {
            // Remove from sender's list
            uint256[] storage fromPolicies = userPolicies[from];
            for (uint256 i = 0; i < fromPolicies.length; i++) {
                if (fromPolicies[i] == tokenId) {
                    fromPolicies[i] = fromPolicies[fromPolicies.length - 1];
                    fromPolicies.pop();
                    break;
                }
            }
            
            // Add to receiver's list
            userPolicies[to].push(tokenId);
            
            // Update policyholder in policy data
            policies[tokenId].policyholder = to;
        }
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
} 