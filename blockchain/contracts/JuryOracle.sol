// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title JuryOracle Interface for GuardChain AI
/// @notice Defines juror selection, vote submission, and retrieval primitives
interface IJuryOracle {
    /// @dev Juror vote payload
    struct VoteInput {
        // payout decision: 1.0=full, 0.0=reject, [0,1] for partial
        uint16 payoutBps;         // 0..10000 (basis points)
        uint16 confidenceBps;     // 5000..10000 (0.5..1.0)
        bytes32 rationaleHash;    // keccak256 of rationale text stored off-chain
        uint8  stakeTier;         // 0:none,1:light,2:heavy
        uint8  locality;          // 0:other,1:sameState
        uint8  expertise;         // 0:none,1:health,2:motor,3:crop,4:property
    }

    /// @dev Emitted when a panel is drawn for a claim
    event PanelSelected(bytes32 indexed claimId, address[] jurors, bytes32 seed);

    /// @dev Emitted when a juror casts a vote
    event VoteCast(bytes32 indexed claimId, address indexed juror, uint16 payoutBps, uint16 confidenceBps, bytes32 rationaleHash);

    /// @notice Request panel selection using VRF (off-chain/consumer) seed
    function selectPanel(bytes32 claimId, bytes32 seed) external;

    /// @notice Submit a vote for an active claim
    function submitVote(bytes32 claimId, VoteInput calldata input) external;

    /// @notice Returns panel jurors and deadline
    function getPanel(bytes32 claimId) external view returns (address[] memory jurors, uint64 deadline);

    /// @notice Returns a juror's vote for a claim (if any)
    function getVote(bytes32 claimId, address juror) external view returns (VoteInput memory input, bool exists);
}


