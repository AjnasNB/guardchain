// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Appeal System for GuardChain AI
/// @notice Handles appeals for rejected claims with reputation-based jury selection
interface IAppealSystem {
    /// @dev Appeal request structure
    struct AppealRequest {
        bytes32 claimId;
        address appellant;
        string reason;
        bytes32 evidenceHash;
        uint256 timestamp;
        bool processed;
    }

    /// @dev Appeal jury panel
    struct AppealJury {
        address[] jurors;
        uint64 deadline;
        uint8 requiredVotes;
        bool concluded;
        uint16 payoutBps; // Final decision payout percentage
    }

    /// @dev Emitted when an appeal is filed
    event AppealFiled(bytes32 indexed claimId, address indexed appellant, string reason, bytes32 evidenceHash);

    /// @dev Emitted when appeal jury is selected
    event AppealJurySelected(bytes32 indexed claimId, address[] jurors, uint64 deadline);

    /// @dev Emitted when appeal is concluded
    event AppealConcluded(bytes32 indexed claimId, uint16 payoutBps, bool approved);

    /// @notice File an appeal for a rejected claim
    /// @param claimId The original claim ID
    /// @param reason Reason for appeal
    /// @param evidenceHash Hash of new evidence
    function fileAppeal(
        bytes32 claimId,
        string calldata reason,
        bytes32 evidenceHash
    ) external;

    /// @notice Select appeal jury based on reputation scores
    /// @param claimId The claim ID being appealed
    /// @param seed Random seed for jury selection
    function selectAppealJury(bytes32 claimId, bytes32 seed) external;

    /// @notice Submit vote for appeal
    /// @param claimId The claim ID being appealed
    /// @param payoutBps Payout percentage (0-10000)
    /// @param confidenceBps Confidence level (5000-10000)
    /// @param rationaleHash Hash of rationale text
    function submitAppealVote(
        bytes32 claimId,
        uint16 payoutBps,
        uint16 confidenceBps,
        bytes32 rationaleHash
    ) external;

    /// @notice Get appeal details
    /// @param claimId The claim ID
    /// @return appeal Appeal request details
    function getAppeal(bytes32 claimId) external view returns (AppealRequest memory appeal);

    /// @notice Get appeal jury details
    /// @param claimId The claim ID
    /// @return jury Appeal jury panel details
    function getAppealJury(bytes32 claimId) external view returns (AppealJury memory jury);

    /// @notice Check if user can file appeal for claim
    /// @param claimId The claim ID
    /// @param user The user address
    /// @return canAppeal True if user can file appeal
    function canFileAppeal(bytes32 claimId, address user) external view returns (bool canAppeal);

    /// @notice Get reputation-weighted jurors for appeal
    /// @param claimId The claim ID
    /// @param count Number of jurors needed
    /// @return jurors Array of selected juror addresses
    function getReputationWeightedJurors(bytes32 claimId, uint8 count) external view returns (address[] memory jurors);
}
