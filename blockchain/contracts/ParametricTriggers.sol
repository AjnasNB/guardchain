// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Parametric Triggers for GuardChain AI
/// @notice Handles automated payouts based on oracle data and predefined conditions
interface IParametricTriggers {
    /// @dev Trigger condition structure
    struct TriggerCondition {
        address oracle;           // Oracle contract address
        bytes32 dataFeedId;      // Chainlink data feed ID
        uint256 threshold;       // Trigger threshold value
        uint8 comparisonType;    // 0: >=, 1: <=, 2: ==, 3: !=
        uint256 payoutAmount;    // Amount to payout when triggered
        bool active;             // Whether trigger is active
    }

    /// @dev Policy trigger mapping
    struct PolicyTriggers {
        bytes32 policyId;
        TriggerCondition[] conditions;
        uint256 totalPayoutCap;  // Maximum total payout for this policy
        uint256 usedPayout;      // Amount already paid out
        bool active;
    }

    /// @dev Emitted when trigger condition is met
    event TriggerActivated(
        bytes32 indexed policyId,
        bytes32 indexed conditionId,
        uint256 payoutAmount,
        uint256 timestamp
    );

    /// @dev Emitted when parametric payout is executed
    event ParametricPayout(
        bytes32 indexed policyId,
        address indexed beneficiary,
        uint256 amount,
        bytes32 transactionHash
    );

    /// @notice Add trigger condition to policy
    /// @param policyId The policy NFT ID
    /// @param condition The trigger condition
    function addTriggerCondition(
        bytes32 policyId,
        TriggerCondition calldata condition
    ) external;

    /// @notice Remove trigger condition from policy
    /// @param policyId The policy NFT ID
    /// @param conditionIndex Index of condition to remove
    function removeTriggerCondition(
        bytes32 policyId,
        uint256 conditionIndex
    ) external;

    /// @notice Check and execute triggers for a policy
    /// @param policyId The policy NFT ID
    /// @return triggered True if any trigger was activated
    function checkTriggers(bytes32 policyId) external returns (bool triggered);

    /// @notice Execute parametric payout
    /// @param policyId The policy NFT ID
    /// @param beneficiary The payout recipient
    /// @param amount The payout amount
    function executeParametricPayout(
        bytes32 policyId,
        address beneficiary,
        uint256 amount
    ) external;

    /// @notice Get policy triggers
    /// @param policyId The policy NFT ID
    /// @return triggers Policy trigger configuration
    function getPolicyTriggers(bytes32 policyId) external view returns (PolicyTriggers memory triggers);

    /// @notice Check if policy has active triggers
    /// @param policyId The policy NFT ID
    /// @return hasActive True if policy has active triggers
    function hasActiveTriggers(bytes32 policyId) external view returns (bool hasActive);

    /// @notice Get available payout amount for policy
    /// @param policyId The policy NFT ID
    /// @return available Available payout amount
    function getAvailablePayout(bytes32 policyId) external view returns (uint256 available);
}
