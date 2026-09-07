// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SavioursRegistry
 * @notice On-chain security memory for durable threat facts only.
 * @dev Full AI dossiers live off-chain (IPFS). This contract stores hashes + status
 *      so Shield can BLOCK on a second encounter without re-running investigation.
 *
 * Chain boundary:
 * - Deploy this contract on Sepolia (hackathon). Anvil for local tests.
 * - Incident.chainId is the *target’s* chain (usually Ethereum mainnet = 1),
 *   because Graph evidence of hacks/drainers comes from mainnet — not Sepolia.
 *
 * Invariants (see .cursor/rules/contracts.mdc):
 * - Sepolia for writes in the hackathon demo
 * - REGISTRAR_ROLE required to register
 * - Duplicate incidentId rejected
 * - Same (chainId, target, fingerprint) is idempotent — returns existing id
 * - Finalized TAINTED records are not overwritten via register
 */
contract SavioursRegistry is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    enum Status {
        SAFE, // 0 — rarely stored; kept for enum parity with off-chain types
        WATCH, // 1
        TAINTED, // 2
        UNKNOWN // 3 — should not be persisted; rejected on register
    }

    /// @dev Matches packages/core ThreatType order (primary threat only on-chain).
    enum ThreatType {
        DRAINER,
        DANGEROUS_APPROVAL,
        MALICIOUS_RECIPIENT,
        EXPLOIT_CONTRACT,
        MALICIOUS_UPGRADE,
        SUSPICIOUS_BEHAVIOR
    }

    struct Incident {
        bytes32 incidentId;
        /// @dev Target entity chain (e.g. 1 = mainnet). NOT the registry deployment chain.
        uint64 chainId;
        address target;
        bytes32 fingerprint;
        Status status;
        ThreatType threatType;
        uint8 confidenceBucket; // 0–100
        bytes32 evidenceHash;
        bytes32 ensNode; // set later in Phase 4; zero until then
        uint64 createdAt;
        uint64 updatedAt;
        uint64 expiresAt; // 0 = no expiry
    }

    struct RegisterParams {
        bytes32 incidentId;
        uint64 chainId;
        address target;
        bytes32 fingerprint;
        Status status;
        ThreatType threatType;
        uint8 confidenceBucket;
        bytes32 evidenceHash;
        bytes32 ensNode;
        uint64 expiresAt;
    }

    mapping(bytes32 => Incident) private _incidents;
    /// @dev keccak256(chainId, target, fingerprint) → incidentId for idempotency
    mapping(bytes32 => bytes32) private _byTargetFingerprint;
    /// @dev Latest incident for a target on a chain — Shield Tier-1 lookup (no fingerprint needed)
    mapping(uint64 => mapping(address => bytes32)) private _latestByTarget;

    event IncidentRegistered(
        bytes32 indexed incidentId,
        uint64 indexed chainId,
        address indexed target,
        bytes32 fingerprint,
        Status status,
        ThreatType threatType,
        bytes32 evidenceHash,
        bytes32 ensNode
    );

    error IncidentAlreadyExists(bytes32 incidentId);
    error InvalidIncidentId();
    error InvalidTarget();
    error InvalidFingerprint();
    error InvalidEvidenceHash();
    error InvalidStatus(Status status);
    error InvalidConfidence(uint8 confidenceBucket);
    error ZeroChainId();

    constructor(address admin) {
        if (admin == address(0)) revert InvalidTarget();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    /**
     * @notice Persist a durable incident fact.
     * @return incidentId The id written, or the existing id if (target,fingerprint) already stored.
     */
    function register(RegisterParams calldata p)
        external
        onlyRole(REGISTRAR_ROLE)
        returns (bytes32 incidentId)
    {
        if (p.incidentId == bytes32(0)) revert InvalidIncidentId();
        if (p.target == address(0)) revert InvalidTarget();
        if (p.fingerprint == bytes32(0)) revert InvalidFingerprint();
        if (p.evidenceHash == bytes32(0)) revert InvalidEvidenceHash();
        if (p.chainId == 0) revert ZeroChainId();
        if (p.confidenceBucket > 100) revert InvalidConfidence(p.confidenceBucket);
        if (p.status != Status.WATCH && p.status != Status.TAINTED) {
            revert InvalidStatus(p.status);
        }

        bytes32 fpKey = _fingerprintKey(p.chainId, p.target, p.fingerprint);
        bytes32 existingByFp = _byTargetFingerprint[fpKey];
        if (existingByFp != bytes32(0)) {
            // Idempotent retry — never insert a second row for the same target+fp
            return existingByFp;
        }

        if (_incidents[p.incidentId].createdAt != 0) {
            revert IncidentAlreadyExists(p.incidentId);
        }

        uint64 nowTs = uint64(block.timestamp);
        _incidents[p.incidentId] = Incident({
            incidentId: p.incidentId,
            chainId: p.chainId,
            target: p.target,
            fingerprint: p.fingerprint,
            status: p.status,
            threatType: p.threatType,
            confidenceBucket: p.confidenceBucket,
            evidenceHash: p.evidenceHash,
            ensNode: p.ensNode,
            createdAt: nowTs,
            updatedAt: nowTs,
            expiresAt: p.expiresAt
        });
        _byTargetFingerprint[fpKey] = p.incidentId;
        _latestByTarget[p.chainId][p.target] = p.incidentId;

        emit IncidentRegistered(
            p.incidentId,
            p.chainId,
            p.target,
            p.fingerprint,
            p.status,
            p.threatType,
            p.evidenceHash,
            p.ensNode
        );

        return p.incidentId;
    }

    function getIncident(bytes32 incidentId) external view returns (Incident memory) {
        return _incidents[incidentId];
    }

    function getIncidentIdByTargetFingerprint(
        uint64 chainId,
        address target,
        bytes32 fingerprint
    ) external view returns (bytes32) {
        return _byTargetFingerprint[_fingerprintKey(chainId, target, fingerprint)];
    }

    /// @notice Shield / investigator lookup: most recent incident id for a target (0 if none).
    function getLatestIncidentIdByTarget(uint64 chainId, address target)
        external
        view
        returns (bytes32)
    {
        return _latestByTarget[chainId][target];
    }

    function exists(bytes32 incidentId) external view returns (bool) {
        return _incidents[incidentId].createdAt != 0;
    }

    function _fingerprintKey(uint64 chainId, address target, bytes32 fingerprint)
        private
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(chainId, target, fingerprint));
    }
}
