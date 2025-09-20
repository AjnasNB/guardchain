// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ChainSureGovernanceToken
 * @dev Governance token for ChainSure mutual insurance platform
 * Features:
 * - Voting power for governance proposals
 * - Staking mechanism for jury participation
 * - Rewards distribution for honest participation
 * - Slashing mechanism for malicious behavior
 * - Time-locked transfers for staked tokens
 */
contract ChainSureGovernanceToken is ERC20, ERC20Burnable, Ownable, Pausable, ReentrancyGuard {
    // Events
    event TokensStaked(address indexed staker, uint256 amount, uint256 lockPeriod);
    event TokensUnstaked(address indexed staker, uint256 amount);
    event RewardsDistributed(address indexed recipient, uint256 amount, string reason);
    event TokensSlashed(address indexed slashed, uint256 amount, string reason);
    event JuryPoolJoined(address indexed juror, uint256 stakedAmount);
    event JuryPoolLeft(address indexed juror, uint256 unstakedAmount);

    // Staking structures
    struct StakeInfo {
        uint256 amount;
        uint256 lockUntil;
        bool isJuryStake;
        uint256 rewardDebt;
    }

    // State variables
    mapping(address => StakeInfo) public stakes;
    mapping(address => bool) public juryPool;
    mapping(address => uint256) public juryReputationScore;
    mapping(address => uint256) public totalRewardsEarned;

    address[] public activeJurors;
    
    uint256 public totalStaked;
    uint256 public juryStakeRequirement = 1000 * 10**18; // 1000 tokens minimum
    uint256 public maxJurySize = 1000;
    uint256 public rewardPool;
    uint256 public slashedTokens;

    // Lockup periods
    uint256 public constant MIN_STAKE_PERIOD = 7 days;
    uint256 public constant JURY_STAKE_PERIOD = 30 days;
    uint256 public constant GOVERNANCE_STAKE_PERIOD = 14 days;

    // Reward and slashing parameters
    uint256 public juryRewardRate = 100; // Basis points per successful vote
    uint256 public slashingRate = 1000; // Basis points for malicious behavior
    uint256 public reputationThreshold = 8000; // Minimum reputation for jury participation

    modifier onlyStaker() {
        require(stakes[msg.sender].amount > 0, "ChainSureGovernance: not a staker");
        _;
    }

    modifier onlyJuryManager() {
        require(msg.sender == owner() || msg.sender == address(this), "ChainSureGovernance: not authorized");
        _;
    }

    constructor(uint256 initialSupply) ERC20("ChainSure Governance", "CSURE") {
        _mint(msg.sender, initialSupply);
        rewardPool = initialSupply / 10; // 10% for rewards
        juryReputationScore[msg.sender] = 10000; // Perfect initial reputation for deployer
    }

    /**
     * @dev Stake tokens for governance participation
     * @param amount Amount to stake
     * @param lockPeriod Lock period in seconds
     * @param forJury Whether this stake is for jury participation
     */
    function stakeTokens(
        uint256 amount,
        uint256 lockPeriod,
        bool forJury
    ) external whenNotPaused nonReentrant {
        require(amount > 0, "ChainSureGovernance: amount must be positive");
        require(balanceOf(msg.sender) >= amount, "ChainSureGovernance: insufficient balance");
        require(lockPeriod >= MIN_STAKE_PERIOD, "ChainSureGovernance: lock period too short");

        if (forJury) {
            require(amount >= juryStakeRequirement, "ChainSureGovernance: insufficient amount for jury");
            require(lockPeriod >= JURY_STAKE_PERIOD, "ChainSureGovernance: jury lock period too short");
            require(activeJurors.length < maxJurySize, "ChainSureGovernance: jury pool full");
            require(juryReputationScore[msg.sender] >= reputationThreshold, "ChainSureGovernance: insufficient reputation");
        }

        // Transfer tokens to this contract
        _transfer(msg.sender, address(this), amount);

        // Update stake information
        if (stakes[msg.sender].amount > 0) {
            // Add to existing stake
            stakes[msg.sender].amount += amount;
            if (forJury && lockPeriod > stakes[msg.sender].lockUntil - block.timestamp) {
                stakes[msg.sender].lockUntil = block.timestamp + lockPeriod;
            }
        } else {
            // New stake
            stakes[msg.sender] = StakeInfo({
                amount: amount,
                lockUntil: block.timestamp + lockPeriod,
                isJuryStake: forJury,
                rewardDebt: 0
            });
        }

        if (forJury && !juryPool[msg.sender]) {
            juryPool[msg.sender] = true;
            activeJurors.push(msg.sender);
            stakes[msg.sender].isJuryStake = true;
            emit JuryPoolJoined(msg.sender, amount);
        }

        totalStaked += amount;
        emit TokensStaked(msg.sender, amount, lockPeriod);
    }

    /**
     * @dev Unstake tokens after lock period
     * @param amount Amount to unstake
     */
    function unstakeTokens(uint256 amount) external onlyStaker whenNotPaused nonReentrant {
        require(amount > 0, "ChainSureGovernance: amount must be positive");
        require(stakes[msg.sender].amount >= amount, "ChainSureGovernance: insufficient staked amount");
        require(block.timestamp >= stakes[msg.sender].lockUntil, "ChainSureGovernance: tokens still locked");

        // If unstaking jury tokens, remove from jury pool
        if (stakes[msg.sender].isJuryStake && stakes[msg.sender].amount - amount < juryStakeRequirement) {
            _removeFromJuryPool(msg.sender);
        }

        // Update stake
        stakes[msg.sender].amount -= amount;
        if (stakes[msg.sender].amount == 0) {
            delete stakes[msg.sender];
        }

        totalStaked -= amount;

        // Transfer tokens back
        _transfer(address(this), msg.sender, amount);

        emit TokensUnstaked(msg.sender, amount);
    }

    /**
     * @dev Distribute rewards to honest jurors
     * @param recipients Array of recipient addresses
     * @param amounts Array of reward amounts
     * @param reason Reason for reward distribution
     */
    function distributeRewards(
        address[] calldata recipients,
        uint256[] calldata amounts,
        string calldata reason
    ) external onlyJuryManager whenNotPaused {
        require(recipients.length == amounts.length, "ChainSureGovernance: array length mismatch");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "ChainSureGovernance: invalid recipient");
            require(amounts[i] <= rewardPool, "ChainSureGovernance: insufficient reward pool");

            rewardPool -= amounts[i];
            totalRewardsEarned[recipients[i]] += amounts[i];
            stakes[recipients[i]].rewardDebt += amounts[i];

            // Increase reputation for honest participation
            if (juryReputationScore[recipients[i]] < 10000) {
                juryReputationScore[recipients[i]] += juryRewardRate;
                if (juryReputationScore[recipients[i]] > 10000) {
                    juryReputationScore[recipients[i]] = 10000;
                }
            }

            _mint(recipients[i], amounts[i]);
            emit RewardsDistributed(recipients[i], amounts[i], reason);
        }
    }

    /**
     * @dev Slash tokens for malicious behavior
     * @param maliciousActors Array of addresses to slash
     * @param amounts Array of amounts to slash
     * @param reason Reason for slashing
     */
    function slashTokens(
        address[] calldata maliciousActors,
        uint256[] calldata amounts,
        string calldata reason
    ) external onlyJuryManager whenNotPaused {
        require(maliciousActors.length == amounts.length, "ChainSureGovernance: array length mismatch");

        for (uint256 i = 0; i < maliciousActors.length; i++) {
            address actor = maliciousActors[i];
            uint256 slashAmount = amounts[i];

            require(stakes[actor].amount >= slashAmount, "ChainSureGovernance: insufficient staked amount");

            // Remove from jury pool if slashed
            if (juryPool[actor]) {
                _removeFromJuryPool(actor);
            }

            // Reduce reputation
            uint256 reputationPenalty = (slashAmount * slashingRate) / 10000;
            if (juryReputationScore[actor] > reputationPenalty) {
                juryReputationScore[actor] -= reputationPenalty;
            } else {
                juryReputationScore[actor] = 0;
            }

            // Slash staked tokens
            stakes[actor].amount -= slashAmount;
            totalStaked -= slashAmount;
            slashedTokens += slashAmount;

            if (stakes[actor].amount == 0) {
                delete stakes[actor];
            }

            emit TokensSlashed(actor, slashAmount, reason);
        }
    }

    /**
     * @dev Get random jurors for a claim
     * @param claimId Claim ID for randomness
     * @param jurySize Number of jurors needed
     * @return Array of selected juror addresses
     */
    function selectJurors(bytes32 claimId, uint256 jurySize) external view returns (address[] memory) {
        require(jurySize <= activeJurors.length, "ChainSureGovernance: not enough jurors");
        require(jurySize > 0, "ChainSureGovernance: jury size must be positive");

        address[] memory selectedJurors = new address[](jurySize);
        uint256[] memory indices = new uint256[](activeJurors.length);
        
        // Initialize indices
        for (uint256 i = 0; i < activeJurors.length; i++) {
            indices[i] = i;
        }

        // Pseudo-random selection based on claim ID and block data
        uint256 seed = uint256(keccak256(abi.encodePacked(claimId, block.timestamp, blockhash(block.number - 1))));
        
        for (uint256 i = 0; i < jurySize; i++) {
            uint256 randomIndex = seed % (activeJurors.length - i);
            selectedJurors[i] = activeJurors[indices[randomIndex]];
            
            // Swap to avoid selecting same juror twice
            indices[randomIndex] = indices[activeJurors.length - 1 - i];
            seed = uint256(keccak256(abi.encodePacked(seed, i)));
        }

        return selectedJurors;
    }

    /**
     * @dev Remove address from jury pool
     * @param juror Address to remove
     */
    function _removeFromJuryPool(address juror) internal {
        if (!juryPool[juror]) return;

        juryPool[juror] = false;
        stakes[juror].isJuryStake = false;

        // Remove from active jurors array
        for (uint256 i = 0; i < activeJurors.length; i++) {
            if (activeJurors[i] == juror) {
                activeJurors[i] = activeJurors[activeJurors.length - 1];
                activeJurors.pop();
                break;
            }
        }

        emit JuryPoolLeft(juror, stakes[juror].amount);
    }

    /**
     * @dev Update jury stake requirement
     * @param newRequirement New minimum stake requirement
     */
    function updateJuryStakeRequirement(uint256 newRequirement) external onlyOwner {
        juryStakeRequirement = newRequirement;
    }

    /**
     * @dev Update maximum jury size
     * @param newMaxSize New maximum jury pool size
     */
    function updateMaxJurySize(uint256 newMaxSize) external onlyOwner {
        maxJurySize = newMaxSize;
    }

    /**
     * @dev Add to reward pool
     * @param amount Amount to add to reward pool
     */
    function addToRewardPool(uint256 amount) external onlyOwner {
        require(balanceOf(msg.sender) >= amount, "ChainSureGovernance: insufficient balance");
        _transfer(msg.sender, address(this), amount);
        rewardPool += amount;
    }

    /**
     * @dev Get staking information for an address
     * @param staker Address to query
     * @return StakeInfo struct
     */
    function getStakeInfo(address staker) external view returns (StakeInfo memory) {
        return stakes[staker];
    }

    /**
     * @dev Get active jurors count
     * @return Number of active jurors
     */
    function getActiveJurorsCount() external view returns (uint256) {
        return activeJurors.length;
    }

    /**
     * @dev Check if address can participate as juror
     * @param potential Address to check
     * @return Whether address can be a juror
     */
    function canBeJuror(address potential) external view returns (bool) {
        return stakes[potential].amount >= juryStakeRequirement && 
               juryReputationScore[potential] >= reputationThreshold &&
               activeJurors.length < maxJurySize;
    }

    /**
     * @dev Get voting power for an address (current balance)
     * @param account Address to check
     * @return Voting power (token balance)
     */
    function getVotes(address account) external view returns (uint256) {
        return balanceOf(account);
    }

    // Emergency functions
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Required overrides (simplified without ERC20Votes)
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
} 