// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VoteTally.sol";

/// @title VoteTally Implementation for GuardChain AI
/// @notice Simple implementation of vote tallying functionality
contract VoteTallyImpl is IVoteTally {
    address public immutable governanceToken;
    address public immutable governance;
    address public admin;
    
    WeightsConfig public config;
    
    constructor(address _governanceToken, address _governance, address _admin) {
        governanceToken = _governanceToken;
        governance = _governance;
        admin = _admin;
        
        // Initialize default weights configuration
        config = WeightsConfig({
            baseBps: 10000,        // 1.0
            stakeLightBps: 11000,  // 1.10
            stakeHeavyBps: 12500,  // 1.25
            localitySameBps: 11000, // 1.10
            expertiseMatchBps: 11500, // 1.15
            wMaxBps: 15000         // 1.50
        });
    }
    
    function getConfig() external view override returns (WeightsConfig memory cfg) {
        return config;
    }
    
    function tally(
        uint16[] calldata payoutBps,
        uint16[] calldata confidenceBps,
        uint16[] calldata repBps,
        uint8[] calldata stakeTier,
        bool[] calldata isLocal,
        bool[] calldata hasExpertise,
        uint16 quorumRequired
    ) external view override returns (Tallied memory result) {
        require(payoutBps.length == confidenceBps.length, "Array length mismatch");
        require(payoutBps.length == repBps.length, "Array length mismatch");
        require(payoutBps.length == stakeTier.length, "Array length mismatch");
        require(payoutBps.length == isLocal.length, "Array length mismatch");
        require(payoutBps.length == hasExpertise.length, "Array length mismatch");
        
        uint256 totalWeightedPayout = 0;
        uint256 totalWeight = 0;
        uint16 votesCounted = 0;
        
        for (uint i = 0; i < payoutBps.length; i++) {
            // Calculate weight for this juror
            uint256 weight = config.baseBps;
            
            // Apply stake multiplier
            if (stakeTier[i] == 1) {
                weight = weight * config.stakeLightBps / 10000;
            } else if (stakeTier[i] == 2) {
                weight = weight * config.stakeHeavyBps / 10000;
            }
            
            // Apply locality multiplier
            if (isLocal[i]) {
                weight = weight * config.localitySameBps / 10000;
            }
            
            // Apply expertise multiplier
            if (hasExpertise[i]) {
                weight = weight * config.expertiseMatchBps / 10000;
            }
            
            // Apply reputation multiplier
            weight = weight * repBps[i] / 10000;
            
            // Cap weight
            if (weight > config.wMaxBps) {
                weight = config.wMaxBps;
            }
            
            // Add to totals
            totalWeightedPayout += uint256(payoutBps[i]) * weight * confidenceBps[i];
            totalWeight += weight * confidenceBps[i];
            votesCounted++;
        }
        
        // Calculate final payout percentage
        uint16 finalPayoutBps = 0;
        if (totalWeight > 0) {
            finalPayoutBps = uint16(totalWeightedPayout / totalWeight);
        }
        
        // Determine verdict based on payout percentage
        uint8 verdict = 0; // reject
        if (finalPayoutBps >= 6700) { // >= 67%
            verdict = 2; // full
        } else if (finalPayoutBps >= 3300) { // >= 33%
            verdict = 1; // pro-rata
        }
        
        result = Tallied({
            payoutBps: finalPayoutBps,
            verdict: verdict,
            quorum: votesCounted,
            required: quorumRequired
        });
        
        return result;
    }
}
