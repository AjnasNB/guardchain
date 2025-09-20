// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./ChainSureStablecoin.sol";
import "./ChainSureGovernanceToken.sol";
import "./ChainSurePolicyNFT.sol";

/**
 * @title ChainSureSurplusDistributor
 * @dev Contract for distributing surplus profits back to the community
 * Features:
 * - Automatic surplus calculation after reserves and reinsurance
 * - Pro-rata distribution to governance token holders
 * - Bonus distributions for active policyholders
 * - Time-locked distributions for long-term alignment
 * - Emergency fund allocation
 */
contract ChainSureSurplusDistributor is Ownable, Pausable, ReentrancyGuard {
    // Events
    event SurplusCalculated(uint256 totalSurplus, uint256 distributableSurplus, uint256 reserveAllocation);
    event DistributionExecuted(uint256 distributionId, uint256 totalAmount, uint256 recipients);
    event ClaimSubmitted(address indexed recipient, uint256 amount, uint256 distributionId);
    event ClaimProcessed(address indexed recipient, uint256 amount, uint256 distributionId);
    event EmergencyFundAllocated(uint256 amount, string reason);
    event ReinsurancePremiumPaid(uint256 amount, address reinsurer);

    // Structures
    struct Distribution {
        uint256 distributionId;
        uint256 totalAmount;
        uint256 timestamp;
        uint256 snapshotBlock;
        uint256 governanceTokenSupply;
        uint256 totalPolicyholders;
        bool finalized;
        mapping(address => bool) claimed;
        mapping(address => uint256) allocations;
    }

    struct SurplusCalculation {
        uint256 totalPremiums;
        uint256 totalClaims;
        uint256 operatingExpenses;
        uint256 reinsuranceCosts;
        uint256 reserveRequirement;
        uint256 emergencyFundAllocation;
        uint256 distributableSurplus;
        uint256 timestamp;
    }

    // Contract references
    ChainSureStablecoin public stablecoin;
    ChainSureGovernanceToken public governanceToken;
    ChainSurePolicyNFT public policyNFT;

    // State variables
    mapping(uint256 => Distribution) public distributions;
    mapping(address => uint256[]) public userDistributions;
    mapping(address => uint256) public unclaimedRewards;
    
    SurplusCalculation[] public surplusHistory;
    
    uint256 public nextDistributionId = 1;
    uint256 public totalDistributed;
    uint256 public emergencyFund;
    uint256 public reinsuranceReserve;

    // Distribution parameters
    uint256 public governanceTokenWeight = 70; // 70% to governance token holders
    uint256 public policyholderBonus = 30; // 30% bonus for active policyholders
    uint256 public reserveRatio = 80; // 80% must be kept in reserves
    uint256 public emergencyFundRatio = 5; // 5% to emergency fund
    uint256 public reinsuranceRatio = 10; // 10% for reinsurance
    uint256 public minimumDistributionAmount = 10000 * 10**18; // 10K tokens minimum

    // Time locks
    uint256 public constant DISTRIBUTION_LOCK_PERIOD = 30 days;
    uint256 public constant CLAIM_PERIOD = 180 days; // 6 months to claim

    // Reinsurance
    address public reinsuranceProvider;
    uint256 public lastReinsurancePayment;

    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || msg.sender == address(policyNFT),
            "SurplusDistributor: not authorized"
        );
        _;
    }

    constructor(
        address _stablecoin,
        address _governanceToken,
        address _policyNFT,
        address _reinsuranceProvider
    ) {
        stablecoin = ChainSureStablecoin(_stablecoin);
        governanceToken = ChainSureGovernanceToken(_governanceToken);
        policyNFT = ChainSurePolicyNFT(_policyNFT);
        reinsuranceProvider = _reinsuranceProvider;
    }

    /**
     * @dev Calculate and execute surplus distribution
     * @param totalPremiums Total premiums collected in period
     * @param totalClaims Total claims paid in period
     * @param operatingExpenses Operating expenses for period
     */
    function calculateAndDistributeSurplus(
        uint256 totalPremiums,
        uint256 totalClaims,
        uint256 operatingExpenses
    ) external onlyAuthorized whenNotPaused {
        require(totalPremiums > 0, "SurplusDistributor: no premiums to distribute");

        // Calculate reinsurance costs
        uint256 reinsuranceCosts = (totalPremiums * reinsuranceRatio) / 100;
        
        // Calculate required reserves
        uint256 reserveRequirement = ((totalPremiums - totalClaims) * reserveRatio) / 100;
        
        // Calculate surplus
        uint256 grossSurplus = totalPremiums > (totalClaims + operatingExpenses + reinsuranceCosts) 
            ? totalPremiums - totalClaims - operatingExpenses - reinsuranceCosts 
            : 0;

        if (grossSurplus <= reserveRequirement) {
            // No distributable surplus
            _recordSurplusCalculation(
                totalPremiums,
                totalClaims,
                operatingExpenses,
                reinsuranceCosts,
                reserveRequirement,
                0,
                0
            );
            return;
        }

        uint256 distributableSurplus = grossSurplus - reserveRequirement;
        
        // Allocate emergency fund
        uint256 emergencyAllocation = (distributableSurplus * emergencyFundRatio) / 100;
        emergencyFund += emergencyAllocation;
        
        uint256 finalDistributionAmount = distributableSurplus - emergencyAllocation;

        if (finalDistributionAmount >= minimumDistributionAmount) {
            _executeDistribution(finalDistributionAmount);
        }

        // Pay reinsurance premium
        if (reinsuranceCosts > 0) {
            _payReinsurancePremium(reinsuranceCosts);
        }

        _recordSurplusCalculation(
            totalPremiums,
            totalClaims,
            operatingExpenses,
            reinsuranceCosts,
            reserveRequirement,
            emergencyAllocation,
            finalDistributionAmount
        );

        emit SurplusCalculated(grossSurplus, finalDistributionAmount, reserveRequirement);
    }

    /**
     * @dev Execute surplus distribution to community
     * @param amount Total amount to distribute
     */
    function _executeDistribution(uint256 amount) internal {
        uint256 distributionId = nextDistributionId++;
        uint256 snapshotBlock = block.number - 1;
        
        Distribution storage distribution = distributions[distributionId];
        distribution.distributionId = distributionId;
        distribution.totalAmount = amount;
        distribution.timestamp = block.timestamp;
        distribution.snapshotBlock = snapshotBlock;
        distribution.governanceTokenSupply = governanceToken.totalSupply();
        distribution.finalized = false;

        // Transfer tokens to this contract for distribution
        require(
            stablecoin.transferFrom(msg.sender, address(this), amount),
            "SurplusDistributor: transfer failed"
        );

        totalDistributed += amount;
        
        emit DistributionExecuted(distributionId, amount, 0); // Recipients calculated later
    }

    /**
     * @dev Finalize distribution by calculating allocations
     * @param distributionId Distribution ID to finalize
     * @param governanceHolders Array of governance token holders
     * @param balances Array of corresponding balances
     * @param policyholders Array of active policyholders
     */
    function finalizeDistribution(
        uint256 distributionId,
        address[] calldata governanceHolders,
        uint256[] calldata balances,
        address[] calldata policyholders
    ) external onlyOwner {
        require(
            governanceHolders.length == balances.length,
            "SurplusDistributor: array length mismatch"
        );
        
        Distribution storage distribution = distributions[distributionId];
        require(distribution.distributionId != 0, "SurplusDistributor: distribution not found");
        require(!distribution.finalized, "SurplusDistributor: already finalized");

        uint256 governanceShare = (distribution.totalAmount * governanceTokenWeight) / 100;
        uint256 policyholderBonusPool = (distribution.totalAmount * policyholderBonus) / 100;

        // Calculate governance token allocations
        for (uint256 i = 0; i < governanceHolders.length; i++) {
            if (balances[i] > 0) {
                uint256 allocation = (governanceShare * balances[i]) / distribution.governanceTokenSupply;
                distribution.allocations[governanceHolders[i]] += allocation;
                userDistributions[governanceHolders[i]].push(distributionId);
            }
        }

        // Calculate policyholder bonus
        if (policyholders.length > 0) {
            uint256 bonusPerPolicyholder = policyholderBonusPool / policyholders.length;
            for (uint256 i = 0; i < policyholders.length; i++) {
                distribution.allocations[policyholders[i]] += bonusPerPolicyholder;
                if (distribution.allocations[policyholders[i]] == bonusPerPolicyholder) {
                    // First allocation for this user in this distribution
                    userDistributions[policyholders[i]].push(distributionId);
                }
            }
        }

        distribution.totalPolicyholders = policyholders.length;
        distribution.finalized = true;

        emit DistributionExecuted(
            distributionId, 
            distribution.totalAmount, 
            governanceHolders.length + policyholders.length
        );
    }

    /**
     * @dev Claim allocated rewards from a distribution
     * @param distributionId Distribution ID to claim from
     */
    function claimRewards(uint256 distributionId) external nonReentrant {
        Distribution storage distribution = distributions[distributionId];
        require(distribution.finalized, "SurplusDistributor: distribution not finalized");
        require(!distribution.claimed[msg.sender], "SurplusDistributor: already claimed");
        require(
            block.timestamp <= distribution.timestamp + CLAIM_PERIOD,
            "SurplusDistributor: claim period expired"
        );

        uint256 allocation = distribution.allocations[msg.sender];
        require(allocation > 0, "SurplusDistributor: no allocation");

        distribution.claimed[msg.sender] = true;
        
        require(
            stablecoin.transfer(msg.sender, allocation),
            "SurplusDistributor: transfer failed"
        );

        emit ClaimProcessed(msg.sender, allocation, distributionId);
    }

    /**
     * @dev Claim multiple distributions at once
     * @param distributionIds Array of distribution IDs to claim
     */
    function claimMultipleRewards(uint256[] calldata distributionIds) external nonReentrant {
        uint256 totalClaim = 0;
        
        for (uint256 i = 0; i < distributionIds.length; i++) {
            uint256 distributionId = distributionIds[i];
            Distribution storage distribution = distributions[distributionId];
            
            if (distribution.finalized && 
                !distribution.claimed[msg.sender] && 
                block.timestamp <= distribution.timestamp + CLAIM_PERIOD &&
                distribution.allocations[msg.sender] > 0) {
                
                distribution.claimed[msg.sender] = true;
                totalClaim += distribution.allocations[msg.sender];
                
                emit ClaimProcessed(msg.sender, distribution.allocations[msg.sender], distributionId);
            }
        }

        require(totalClaim > 0, "SurplusDistributor: nothing to claim");
        require(stablecoin.transfer(msg.sender, totalClaim), "SurplusDistributor: transfer failed");
    }

    /**
     * @dev Use emergency fund for urgent payouts
     * @param recipient Address to receive emergency funds
     * @param amount Amount to transfer
     * @param reason Reason for emergency allocation
     */
    function allocateEmergencyFunds(
        address recipient,
        uint256 amount,
        string memory reason
    ) external onlyOwner {
        require(amount <= emergencyFund, "SurplusDistributor: insufficient emergency funds");
        require(recipient != address(0), "SurplusDistributor: invalid recipient");

        emergencyFund -= amount;
        
        require(
            stablecoin.transfer(recipient, amount),
            "SurplusDistributor: emergency transfer failed"
        );

        emit EmergencyFundAllocated(amount, reason);
    }

    /**
     * @dev Pay reinsurance premium
     * @param amount Premium amount
     */
    function _payReinsurancePremium(uint256 amount) internal {
        require(reinsuranceProvider != address(0), "SurplusDistributor: no reinsurance provider");
        
        reinsuranceReserve += amount;
        lastReinsurancePayment = block.timestamp;
        
        // In a real implementation, this would trigger actual payment
        // For now, we just record the allocation
        
        emit ReinsurancePremiumPaid(amount, reinsuranceProvider);
    }

    /**
     * @dev Record surplus calculation for historical tracking
     */
    function _recordSurplusCalculation(
        uint256 totalPremiums,
        uint256 totalClaims,
        uint256 operatingExpenses,
        uint256 reinsuranceCosts,
        uint256 reserveRequirement,
        uint256 emergencyAllocation,
        uint256 distributableSurplus
    ) internal {
        surplusHistory.push(SurplusCalculation({
            totalPremiums: totalPremiums,
            totalClaims: totalClaims,
            operatingExpenses: operatingExpenses,
            reinsuranceCosts: reinsuranceCosts,
            reserveRequirement: reserveRequirement,
            emergencyFundAllocation: emergencyAllocation,
            distributableSurplus: distributableSurplus,
            timestamp: block.timestamp
        }));
    }

    // View functions
    function getUserDistributions(address user) external view returns (uint256[] memory) {
        return userDistributions[user];
    }

    function getDistributionAllocation(uint256 distributionId, address user) external view returns (uint256) {
        return distributions[distributionId].allocations[user];
    }

    function hasClaimedDistribution(uint256 distributionId, address user) external view returns (bool) {
        return distributions[distributionId].claimed[user];
    }

    function getSurplusHistory() external view returns (SurplusCalculation[] memory) {
        return surplusHistory;
    }

    function getUnclaimedRewards(address user) external view returns (uint256) {
        uint256 totalUnclaimed = 0;
        uint256[] memory userDists = userDistributions[user];
        
        for (uint256 i = 0; i < userDists.length; i++) {
            uint256 distributionId = userDists[i];
            Distribution storage distribution = distributions[distributionId];
            
            if (distribution.finalized && 
                !distribution.claimed[user] && 
                block.timestamp <= distribution.timestamp + CLAIM_PERIOD) {
                totalUnclaimed += distribution.allocations[user];
            }
        }
        
        return totalUnclaimed;
    }

    // Admin functions
    function updateDistributionParameters(
        uint256 _governanceTokenWeight,
        uint256 _policyholderBonus,
        uint256 _reserveRatio,
        uint256 _emergencyFundRatio,
        uint256 _reinsuranceRatio
    ) external onlyOwner {
        require(_governanceTokenWeight + _policyholderBonus == 100, "SurplusDistributor: weights must sum to 100");
        require(_reserveRatio <= 95, "SurplusDistributor: reserve ratio too high");
        require(_emergencyFundRatio <= 20, "SurplusDistributor: emergency fund ratio too high");
        require(_reinsuranceRatio <= 30, "SurplusDistributor: reinsurance ratio too high");

        governanceTokenWeight = _governanceTokenWeight;
        policyholderBonus = _policyholderBonus;
        reserveRatio = _reserveRatio;
        emergencyFundRatio = _emergencyFundRatio;
        reinsuranceRatio = _reinsuranceRatio;
    }

    function updateReinsuranceProvider(address newProvider) external onlyOwner {
        reinsuranceProvider = newProvider;
    }

    function updateMinimumDistributionAmount(uint256 newAmount) external onlyOwner {
        minimumDistributionAmount = newAmount;
    }

    function recoverExpiredDistributions(uint256[] calldata distributionIds) external onlyOwner {
        uint256 totalRecovered = 0;
        
        for (uint256 i = 0; i < distributionIds.length; i++) {
            Distribution storage distribution = distributions[distributionIds[i]];
            
            if (distribution.finalized && 
                block.timestamp > distribution.timestamp + CLAIM_PERIOD) {
                
                // Calculate unclaimed amount
                // This would require iterating through all allocations in a real implementation
                // For now, we'll allow manual recovery
                totalRecovered += distribution.totalAmount;
            }
        }
        
        if (totalRecovered > 0) {
            // Add recovered funds to emergency fund
            emergencyFund += totalRecovered;
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
} 