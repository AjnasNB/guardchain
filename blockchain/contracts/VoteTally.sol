// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title VoteTally Interface for GuardChain AI (Claims)
/// @notice Encodes the weighting math and payout aggregation rules
interface IVoteTally {
    struct WeightsConfig {
        uint16 baseBps;     // default 10000 (1.0)
        uint16 stakeLightBps;// 11000 (1.10)
        uint16 stakeHeavyBps;// 12500 (1.25)
        uint16 localitySameBps;// 11000 (1.10)
        uint16 expertiseMatchBps;// 11500 (1.15)
        uint16 wMaxBps;     // 15000 (1.50)
    }

    struct Tallied {
        uint16 payoutBps;   // 0..10000
        uint8  verdict;     // 0=reject,1=pro-rata,2=full
        uint16 quorum;      // votes counted
        uint16 required;    // min required
    }

    /// @dev Return current weights configuration
    function getConfig() external view returns (WeightsConfig memory cfg);

    /// @notice Compute weighted payout given (W_j * C_j * payout_j) over denominator Σ(W_j*C_j)
    /// @param payoutBps Array of juror payout fractions (0..10000)
    /// @param confidenceBps Array of confidence (5000..10000)
    /// @param repBps Array of reputation in bps (0..12000 maps to 0..1.2)
    /// @param stakeTier 0,1,2 (none,light,heavy)
    /// @param isLocal locality flag for each juror
    /// @param hasExpertise expertise match flag for each juror
    /// @param quorumRequired minimum votes required
    /// @return result Tallied outcome with verdict thresholding at 33%/67%
    function tally(
        uint16[] calldata payoutBps,
        uint16[] calldata confidenceBps,
        uint16[] calldata repBps,
        uint8[] calldata stakeTier,
        bool[] calldata isLocal,
        bool[] calldata hasExpertise,
        uint16 quorumRequired
    ) external view returns (Tallied memory result);
}


