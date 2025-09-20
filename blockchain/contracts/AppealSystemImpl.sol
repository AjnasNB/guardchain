// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AppealSystem.sol";

/// @title AppealSystem Implementation for GuardChain AI
/// @notice Simple implementation of appeal system functionality
contract AppealSystemImpl is IAppealSystem {
    address public immutable claimsEngine;
    address public immutable juryOracle;
    address public immutable governance;
    address public admin;
    
    mapping(bytes32 => AppealRequest) public appeals;
    mapping(bytes32 => AppealJury) public appealJuries;
    mapping(bytes32 => bool) public appealExists;
    
    constructor(address _claimsEngine, address _juryOracle, address _governance, address _admin) {
        claimsEngine = _claimsEngine;
        juryOracle = _juryOracle;
        governance = _governance;
        admin = _admin;
    }
    
    function fileAppeal(
        bytes32 claimId,
        string calldata reason,
        bytes32 evidenceHash
    ) external override {
        require(msg.sender == claimsEngine, "Only claims engine");
        require(!appealExists[claimId], "Appeal already exists");
        
        appeals[claimId] = AppealRequest({
            claimId: claimId,
            appellant: msg.sender,
            reason: reason,
            evidenceHash: evidenceHash,
            timestamp: block.timestamp,
            processed: false
        });
        
        appealExists[claimId] = true;
        
        emit AppealFiled(claimId, msg.sender, reason, evidenceHash);
    }
    
    function selectAppealJury(bytes32 claimId, bytes32 seed) external override {
        require(msg.sender == admin, "Only admin");
        require(appealExists[claimId], "Appeal not found");
        
        address[] memory jurors = new address[](3);
        jurors[0] = address(0x1234567890123456789012345678901234567890);
        jurors[1] = address(0x2345678901234567890123456789012345678901);
        jurors[2] = address(0x3456789012345678901234567890123456789012);
        
        appealJuries[claimId] = AppealJury({
            jurors: jurors,
            deadline: uint64(block.timestamp + 3 days),
            requiredVotes: 2,
            concluded: false,
            payoutBps: 0
        });
        
        emit AppealJurySelected(claimId, jurors, uint64(block.timestamp + 3 days));
    }
    
    function submitAppealVote(
        bytes32 claimId,
        uint16 payoutBps,
        uint16 confidenceBps,
        bytes32 rationaleHash
    ) external override {
        require(appealExists[claimId], "Appeal not found");
        require(block.timestamp <= appealJuries[claimId].deadline, "Voting deadline passed");
        require(!appealJuries[claimId].concluded, "Appeal already concluded");
        
        // Simple implementation - just emit event
        emit AppealConcluded(claimId, payoutBps, payoutBps > 0);
    }
    
    function getAppeal(bytes32 claimId) external view override returns (AppealRequest memory appeal) {
        require(appealExists[claimId], "Appeal not found");
        return appeals[claimId];
    }
    
    function getAppealJury(bytes32 claimId) external view override returns (AppealJury memory jury) {
        require(appealExists[claimId], "Appeal not found");
        return appealJuries[claimId];
    }
    
    function canFileAppeal(bytes32 claimId, address user) external view override returns (bool canAppeal) {
        return !appealExists[claimId] && user == claimsEngine;
    }
    
    function getReputationWeightedJurors(bytes32 claimId, uint8 count) external view override returns (address[] memory jurors) {
        // Simple implementation - return placeholder addresses
        jurors = new address[](count);
        for (uint8 i = 0; i < count; i++) {
            jurors[i] = address(uint160(0x1000 + i));
        }
        return jurors;
    }
}
