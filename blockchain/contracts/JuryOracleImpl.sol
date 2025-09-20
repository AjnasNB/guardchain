// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./JuryOracle.sol";

/// @title JuryOracle Implementation for GuardChain AI
/// @notice Simple implementation of jury oracle functionality
contract JuryOracleImpl is IJuryOracle {
    address public immutable governanceToken;
    address public immutable claimsEngine;
    address public admin;
    
    mapping(bytes32 => address[]) public panels;
    mapping(bytes32 => uint64) public deadlines;
    mapping(bytes32 => mapping(address => VoteInput)) public votes;
    mapping(bytes32 => bool) public voteSubmitted;
    
    constructor(address _governanceToken, address _claimsEngine, address _admin) {
        governanceToken = _governanceToken;
        claimsEngine = _claimsEngine;
        admin = _admin;
    }
    
    function selectPanel(bytes32 claimId, bytes32 seed) external override {
        require(msg.sender == claimsEngine, "Only claims engine");
        
        // Simple implementation - select 3 random addresses for testing
        address[] memory jurors = new address[](3);
        jurors[0] = address(0x1234567890123456789012345678901234567890);
        jurors[1] = address(0x2345678901234567890123456789012345678901);
        jurors[2] = address(0x3456789012345678901234567890123456789012);
        
        panels[claimId] = jurors;
        deadlines[claimId] = uint64(block.timestamp + 3 days);
        
        emit PanelSelected(claimId, jurors, seed);
    }
    
    function submitVote(bytes32 claimId, VoteInput calldata input) external override {
        require(panels[claimId].length > 0, "No panel for claim");
        require(block.timestamp <= deadlines[claimId], "Voting deadline passed");
        require(!voteSubmitted[claimId], "Already voted");
        
        // Check if sender is in panel
        bool isJuror = false;
        for (uint i = 0; i < panels[claimId].length; i++) {
            if (panels[claimId][i] == msg.sender) {
                isJuror = true;
                break;
            }
        }
        require(isJuror, "Not a juror for this claim");
        
        votes[claimId][msg.sender] = input;
        voteSubmitted[claimId] = true;
        
        emit VoteCast(claimId, msg.sender, input.payoutBps, input.confidenceBps, input.rationaleHash);
    }
    
    function getPanel(bytes32 claimId) external view override returns (address[] memory jurors, uint64 deadline) {
        return (panels[claimId], deadlines[claimId]);
    }
    
    function getVote(bytes32 claimId, address juror) external view override returns (VoteInput memory input, bool exists) {
        input = votes[claimId][juror];
        exists = voteSubmitted[claimId];
        return (input, exists);
    }
}
