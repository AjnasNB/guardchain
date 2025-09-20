// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ParametricTriggers.sol";

/// @title ParametricTriggers Implementation for GuardChain AI
/// @notice Simple implementation of parametric triggers functionality
contract ParametricTriggersImpl is IParametricTriggers {
    address public immutable claimsEngine;
    address public immutable stablecoin;
    address public immutable vrfCoordinator;
    address public admin;
    
    mapping(bytes32 => PolicyTriggers) public policyTriggers;
    mapping(bytes32 => bool) public policyExists;
    
    constructor(address _claimsEngine, address _stablecoin, address _vrfCoordinator, address _admin) {
        claimsEngine = _claimsEngine;
        stablecoin = _stablecoin;
        vrfCoordinator = _vrfCoordinator;
        admin = _admin;
    }
    
    function addTriggerCondition(
        bytes32 policyId,
        TriggerCondition calldata condition
    ) external override {
        require(msg.sender == admin, "Only admin");
        
        if (!policyExists[policyId]) {
            PolicyTriggers storage newPolicy = policyTriggers[policyId];
            newPolicy.policyId = policyId;
            newPolicy.totalPayoutCap = 1000000 * 10**18; // 1M tokens default cap
            newPolicy.usedPayout = 0;
            newPolicy.active = true;
            policyExists[policyId] = true;
        }
        
        policyTriggers[policyId].conditions.push(condition);
    }
    
    function removeTriggerCondition(
        bytes32 policyId,
        uint256 conditionIndex
    ) external override {
        require(msg.sender == admin, "Only admin");
        require(policyExists[policyId], "Policy not found");
        require(conditionIndex < policyTriggers[policyId].conditions.length, "Invalid condition index");
        
        // Remove condition by swapping with last element
        uint256 lastIndex = policyTriggers[policyId].conditions.length - 1;
        if (conditionIndex != lastIndex) {
            policyTriggers[policyId].conditions[conditionIndex] = policyTriggers[policyId].conditions[lastIndex];
        }
        policyTriggers[policyId].conditions.pop();
    }
    
    function checkTriggers(bytes32 policyId) external override returns (bool triggered) {
        require(policyExists[policyId], "Policy not found");
        require(policyTriggers[policyId].active, "Policy triggers not active");
        
        PolicyTriggers storage policy = policyTriggers[policyId];
        triggered = false;
        
        for (uint i = 0; i < policy.conditions.length; i++) {
            TriggerCondition storage condition = policy.conditions[i];
            if (!condition.active) continue;
            
            // Simple mock check - in real implementation would check oracle data
            uint256 currentValue = 1000; // Mock value
            
            bool conditionMet = false;
            if (condition.comparisonType == 0) { // >=
                conditionMet = currentValue >= condition.threshold;
            } else if (condition.comparisonType == 1) { // <=
                conditionMet = currentValue <= condition.threshold;
            } else if (condition.comparisonType == 2) { // ==
                conditionMet = currentValue == condition.threshold;
            } else if (condition.comparisonType == 3) { // !=
                conditionMet = currentValue != condition.threshold;
            }
            
            if (conditionMet) {
                condition.active = false; // Deactivate trigger
                triggered = true;
                
                emit TriggerActivated(policyId, bytes32(i), condition.payoutAmount, block.timestamp);
            }
        }
        
        return triggered;
    }
    
    function executeParametricPayout(
        bytes32 policyId,
        address beneficiary,
        uint256 amount
    ) external override {
        require(msg.sender == claimsEngine, "Only claims engine");
        require(policyExists[policyId], "Policy not found");
        
        PolicyTriggers storage policy = policyTriggers[policyId];
        require(policy.usedPayout + amount <= policy.totalPayoutCap, "Exceeds payout cap");
        
        policy.usedPayout += amount;
        
        // In a real implementation, would transfer stablecoin to beneficiary
        // For now, just emit event
        
        emit ParametricPayout(policyId, beneficiary, amount, bytes32(0));
    }
    
    function getPolicyTriggers(bytes32 policyId) external view override returns (PolicyTriggers memory triggers) {
        require(policyExists[policyId], "Policy not found");
        return policyTriggers[policyId];
    }
    
    function hasActiveTriggers(bytes32 policyId) external view override returns (bool hasActive) {
        if (!policyExists[policyId]) return false;
        
        PolicyTriggers storage policy = policyTriggers[policyId];
        if (!policy.active) return false;
        
        for (uint i = 0; i < policy.conditions.length; i++) {
            if (policy.conditions[i].active) {
                return true;
            }
        }
        
        return false;
    }
    
    function getAvailablePayout(bytes32 policyId) external view override returns (uint256 available) {
        if (!policyExists[policyId]) return 0;
        
        PolicyTriggers storage policy = policyTriggers[policyId];
        if (policy.usedPayout >= policy.totalPayoutCap) return 0;
        
        return policy.totalPayoutCap - policy.usedPayout;
    }
}
