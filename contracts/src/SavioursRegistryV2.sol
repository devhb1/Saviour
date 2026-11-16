// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SavioursRegistryV2
 * @notice Base-native security memory (pivot v2.4.1). Prefer immutable deploy.
 * @dev Product home = Base mainnet after Base Sepolia validation.
 *
 * Resolve mapping: UNSET→NO_VERDICT · WATCH→WARN · TAINTED→BLOCK (recommendation).
 * NO_VERDICT never means SAFE and must not auto-block in wallets.
 *
 * Operation liveness is per-op (QUEUED / EXECUTED_QUARANTINE / …), not a counter.
 * CRITICAL queue decode → vault WATCH; TAINTED requires Attester.
 */
contract SavioursRegistryV2 is AccessControl, Pausable {
    bytes32 public constant INDEXER_ROLE = keccak256("INDEXER_ROLE");
    bytes32 public constant INVESTIGATOR_ROLE = keccak256("INVESTIGATOR_ROLE");
    bytes32 public constant ATTESTER_ROLE = keccak256("ATTESTER_ROLE");
    bytes32 public constant DISPUTER_ROLE = keccak256("DISPUTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint64 public constant QUARANTINE_SECONDS = 72 hours;
    uint8 public constant MAX_QUEUES_PER_VAULT = 4;
    uint8 public constant MAX_OPS_SCAN = 32;

    enum Status {
        WATCH,
        TAINTED
    }

    enum ResolveAction {
        NO_VERDICT,
        WARN,
        BLOCK
    }

    enum DelegationExposure {
        NONE,
        CURRENTLY_DELEGATED_TO_TAINTED_IMPL,
        HISTORICALLY_DELEGATED_TO_TAINTED_IMPL,
        HISTORICAL_EXPOSURE_REMEDIATION_REQUIRED,
        REMEDIATION_VERIFIED
    }

    enum ProofType {
        OWNER,
        ADMIN,
        MODULE,
        DELAY,
        ROLES,
        OTHER
    }

    enum OperationState {
        NONE,
        QUEUED,
        CANCELLED,
        VETOED,
        EXECUTED_QUARANTINE,
        EXPIRED
    }

    struct Finding {
        bytes32 findingId;
        uint64 subjectChainId;
        address subject;
        Status status;
        uint32 version;
        bytes32 evidenceHash;
        bytes32 authorityLinkId;
        bytes32 supersedesFindingId;
        DelegationExposure delegationExposure;
        uint64 authChainIdScope;
        address implAddress;
        bytes32 implCodeHash;
        uint64 delegationChangedAt;
        uint64 createdAt;
        uint64 updatedAt;
        uint64 expiresAt;
        bool active;
    }

    struct ProposeParams {
        bytes32 findingId;
        uint64 subjectChainId;
        address subject;
        Status status;
        bytes32 evidenceHash;
        bytes32 authorityLinkId;
        bytes32 supersedesFindingId;
        DelegationExposure delegationExposure;
        uint64 authChainIdScope;
        address implAddress;
        bytes32 implCodeHash;
        uint64 delegationChangedAt;
        uint64 expiresAt;
    }

    struct AuthorityLinkEvidence {
        bytes32 linkId;
        uint64 chainId;
        address vault;
        address queue;
        uint64 blockNumber;
        bytes32 blockHash;
        bytes32 txHash;
        ProofType proofType;
        bytes32 decoderVersion;
        uint64 validFrom;
        uint64 validUntil;
    }

    struct Operation {
        bytes32 opKey;
        bytes32 queueKey;
        OperationState state;
        uint64 opExpiresAt;
        uint64 quarantineUntil;
        bytes32 evidenceHash;
        uint64 updatedAt;
    }

    struct DelegationRecord {
        address impl;
        uint64 authChainIdScope;
        bytes32 implCodeHash;
        DelegationExposure exposure;
        bytes32 provenanceHash;
        uint64 changedAt;
        bool set;
    }

    struct ResolveResult {
        Status status;
        bool verifiedSafe;
        ResolveAction action;
        bytes32 findingId;
        uint32 version;
        bytes32 evidenceHash;
        DelegationExposure delegationExposure;
        bool rpcOk;
        bool relevantQueueOp;
    }

    mapping(bytes32 => Finding) private _findings;
    mapping(bytes32 => Finding[]) private _findingHistory;
    mapping(uint64 => mapping(address => bytes32)) private _latestBySubject;

    mapping(bytes32 => AuthorityLinkEvidence) private _authorityLinks;
    mapping(bytes32 => bytes32[]) private _queuesByVault; // vaultKey => linkIds (≤4 queues)

    mapping(bytes32 => Operation) private _operations;
    mapping(bytes32 => bytes32[]) private _opsByQueue; // queueKey => opKeys (bounded scan)

    mapping(uint64 => mapping(address => DelegationRecord)) private _delegations;

    uint256 public findingCount;
    uint256 public authorityLinkCount;
    uint256 public operationCount;

    event FindingProposed(
        bytes32 indexed findingId,
        uint64 indexed subjectChainId,
        address indexed subject,
        Status status,
        uint32 version,
        bytes32 evidenceHash
    );
    event FindingAttested(bytes32 indexed findingId, uint32 version, address attester);
    event FindingSuperseded(
        bytes32 indexed oldFindingId,
        bytes32 indexed newFindingId,
        Status newStatus,
        bytes32 evidenceHash
    );
    event AuthorityLinkRecorded(
        bytes32 indexed linkId,
        uint64 indexed chainId,
        address vault,
        address queue,
        ProofType proofType
    );
    event AuthorityLinkInvalidated(bytes32 indexed linkId, uint64 validUntil);
    event OperationRecorded(
        bytes32 indexed opKey,
        bytes32 indexed queueKey,
        OperationState state,
        uint64 opExpiresAt,
        uint64 quarantineUntil
    );
    event DelegationUpdated(
        uint64 indexed chainId,
        address indexed authority,
        address impl,
        DelegationExposure exposure
    );

    error InvalidFindingId();
    error InvalidSubject();
    error InvalidEvidenceHash();
    error ZeroChainId();
    error FindingExists(bytes32 findingId);
    error FindingMissing(bytes32 findingId);
    error TaintedNeedsAttester();
    error InvalidLink();
    error LinkMissing(bytes32 linkId);
    error LinkExpired(bytes32 linkId);
    error RemediationNotHistorical();
    error Unauthorized();
    error TooManyQueues();
    error InvalidOp();
    error OpMissing(bytes32 opKey);
    error BadOpTransition();

    constructor(address admin) {
        if (admin == address(0)) revert InvalidSubject();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(ATTESTER_ROLE, admin);
        _grantRole(INVESTIGATOR_ROLE, admin);
        _grantRole(DISPUTER_ROLE, admin);
        _grantRole(INDEXER_ROLE, admin);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // -------------------------------------------------------------------------
    // Keys
    // -------------------------------------------------------------------------

    function subjectKey(uint64 chainId, address subject) public pure returns (bytes32) {
        return keccak256(abi.encode(chainId, subject));
    }

    function vaultKey(uint64 chainId, address vault) public pure returns (bytes32) {
        return keccak256(abi.encode(chainId, vault));
    }

    function queueKey(uint64 chainId, address queue) public pure returns (bytes32) {
        return keccak256(abi.encode(chainId, queue));
    }

    function opKey(uint64 chainId, address queue, bytes32 rawOpId) public pure returns (bytes32) {
        return keccak256(abi.encode(chainId, queue, rawOpId));
    }

    // -------------------------------------------------------------------------
    // Authority links
    // -------------------------------------------------------------------------

    function recordAuthorityLink(AuthorityLinkEvidence calldata link)
        external
        onlyRole(INDEXER_ROLE)
        whenNotPaused
        returns (bytes32)
    {
        if (link.linkId == bytes32(0)) revert InvalidLink();
        if (link.vault == address(0) || link.queue == address(0)) revert InvalidLink();
        if (link.chainId == 0) revert ZeroChainId();
        if (link.txHash == bytes32(0) || link.blockHash == bytes32(0)) revert InvalidLink();
        if (_authorityLinks[link.linkId].validFrom != 0) revert InvalidLink();

        AuthorityLinkEvidence memory stored = link;
        if (stored.validFrom == 0) stored.validFrom = uint64(block.timestamp);
        stored.validUntil = 0;
        _authorityLinks[link.linkId] = stored;

        bytes32 vk = vaultKey(link.chainId, link.vault);
        bytes32[] storage qs = _queuesByVault[vk];
        if (qs.length >= MAX_QUEUES_PER_VAULT) revert TooManyQueues();
        qs.push(link.linkId);

        unchecked {
            ++authorityLinkCount;
        }
        emit AuthorityLinkRecorded(link.linkId, link.chainId, link.vault, link.queue, link.proofType);
        return link.linkId;
    }

    function invalidateAuthorityLink(bytes32 linkId, uint64 validUntil)
        external
        onlyRole(INDEXER_ROLE)
        whenNotPaused
    {
        AuthorityLinkEvidence storage link = _authorityLinks[linkId];
        if (link.validFrom == 0) revert LinkMissing(linkId);
        if (validUntil == 0) validUntil = uint64(block.timestamp);
        link.validUntil = validUntil;
        emit AuthorityLinkInvalidated(linkId, validUntil);
    }

    function getAuthorityLink(bytes32 linkId) external view returns (AuthorityLinkEvidence memory) {
        return _authorityLinks[linkId];
    }

    function getVaultAuthorityLinks(uint64 chainId, address vault)
        external
        view
        returns (bytes32[] memory)
    {
        return _queuesByVault[vaultKey(chainId, vault)];
    }

    // -------------------------------------------------------------------------
    // Operations (source of truth for queue liveness)
    // -------------------------------------------------------------------------

    function recordQueuedOperation(
        uint64 chainId,
        address queue,
        bytes32 rawOpId,
        uint64 opExpiresAt,
        bytes32 evidenceHash
    ) external onlyRole(INDEXER_ROLE) whenNotPaused returns (bytes32 key) {
        if (queue == address(0) || chainId == 0) revert InvalidOp();
        if (rawOpId == bytes32(0) || evidenceHash == bytes32(0)) revert InvalidOp();
        if (opExpiresAt != 0 && opExpiresAt < block.timestamp) revert InvalidOp();

        key = opKey(chainId, queue, rawOpId);
        Operation storage op = _operations[key];
        if (op.state != OperationState.NONE && op.state != OperationState.EXPIRED) {
            revert BadOpTransition();
        }

        bytes32 qk = queueKey(chainId, queue);
        op.opKey = key;
        op.queueKey = qk;
        op.state = OperationState.QUEUED;
        op.opExpiresAt = opExpiresAt;
        op.quarantineUntil = 0;
        op.evidenceHash = evidenceHash;
        op.updatedAt = uint64(block.timestamp);

        if (_opsByQueue[qk].length == 0 || _opsByQueue[qk][_opsByQueue[qk].length - 1] != key) {
            _opsByQueue[qk].push(key);
        }
        unchecked {
            ++operationCount;
        }
        emit OperationRecorded(key, qk, OperationState.QUEUED, opExpiresAt, 0);
    }

    function cancelOperation(bytes32 key) external onlyRole(INDEXER_ROLE) whenNotPaused {
        Operation storage op = _operations[key];
        if (op.state != OperationState.QUEUED) revert BadOpTransition();
        op.state = OperationState.CANCELLED;
        op.updatedAt = uint64(block.timestamp);
        emit OperationRecorded(key, op.queueKey, OperationState.CANCELLED, op.opExpiresAt, 0);
    }

    function vetoOperation(bytes32 key) external onlyRole(INDEXER_ROLE) whenNotPaused {
        Operation storage op = _operations[key];
        if (op.state != OperationState.QUEUED) revert BadOpTransition();
        op.state = OperationState.VETOED;
        op.updatedAt = uint64(block.timestamp);
        emit OperationRecorded(key, op.queueKey, OperationState.VETOED, op.opExpiresAt, 0);
    }

    function executeOperation(bytes32 key) external onlyRole(INDEXER_ROLE) whenNotPaused {
        Operation storage op = _operations[key];
        if (op.state != OperationState.QUEUED) revert BadOpTransition();
        uint64 until = uint64(block.timestamp) + QUARANTINE_SECONDS;
        op.state = OperationState.EXECUTED_QUARANTINE;
        op.quarantineUntil = until;
        op.updatedAt = uint64(block.timestamp);
        emit OperationRecorded(key, op.queueKey, OperationState.EXECUTED_QUARANTINE, op.opExpiresAt, until);
    }

    function expireOperation(bytes32 key) external onlyRole(INDEXER_ROLE) whenNotPaused {
        Operation storage op = _operations[key];
        if (op.state != OperationState.QUEUED) revert BadOpTransition();
        if (op.opExpiresAt == 0 || op.opExpiresAt > block.timestamp) revert BadOpTransition();
        op.state = OperationState.EXPIRED;
        op.updatedAt = uint64(block.timestamp);
        emit OperationRecorded(key, op.queueKey, OperationState.EXPIRED, op.opExpiresAt, 0);
    }

    function getOperation(bytes32 key) external view returns (Operation memory) {
        return _operations[key];
    }

    /// @notice Source of truth for whether a queue still contributes WATCH to vaults.
    function hasRelevantCriticalOperation(bytes32 qk) public view returns (bool) {
        bytes32[] storage ops = _opsByQueue[qk];
        uint256 n = ops.length;
        if (n > MAX_OPS_SCAN) n = MAX_OPS_SCAN;
        uint256 start = ops.length > MAX_OPS_SCAN ? ops.length - MAX_OPS_SCAN : 0;
        for (uint256 i = start; i < ops.length; ) {
            Operation storage op = _operations[ops[i]];
            if (_opRelevant(op)) return true;
            unchecked {
                ++i;
            }
        }
        // silence unused when empty
        n;
        return false;
    }

    function _opRelevant(Operation storage op) private view returns (bool) {
        if (op.state == OperationState.QUEUED) {
            if (op.opExpiresAt != 0 && op.opExpiresAt < block.timestamp) return false;
            return true;
        }
        if (op.state == OperationState.EXECUTED_QUARANTINE) {
            return op.quarantineUntil != 0 && op.quarantineUntil >= block.timestamp;
        }
        return false;
    }

    // -------------------------------------------------------------------------
    // EIP-7702 chain-scoped delegations
    // -------------------------------------------------------------------------

    function setDelegation(
        uint64 chainId,
        address authority,
        address impl,
        uint64 authChainIdScope,
        bytes32 implCodeHash,
        DelegationExposure exposure,
        bytes32 provenanceHash
    ) external whenNotPaused {
        if (
            !hasRole(INDEXER_ROLE, msg.sender) && !hasRole(INVESTIGATOR_ROLE, msg.sender)
                && !hasRole(ATTESTER_ROLE, msg.sender)
        ) {
            revert Unauthorized();
        }
        if (chainId == 0 || authority == address(0)) revert ZeroChainId();

        _delegations[chainId][authority] = DelegationRecord({
            impl: impl,
            authChainIdScope: authChainIdScope,
            implCodeHash: implCodeHash,
            exposure: exposure,
            provenanceHash: provenanceHash,
            changedAt: uint64(block.timestamp),
            set: true
        });
        emit DelegationUpdated(chainId, authority, impl, exposure);
    }

    function getDelegation(uint64 chainId, address authority)
        external
        view
        returns (DelegationRecord memory)
    {
        return _delegations[chainId][authority];
    }

    // -------------------------------------------------------------------------
    // Findings
    // -------------------------------------------------------------------------

    function proposeFinding(ProposeParams calldata p)
        public
        whenNotPaused
        returns (bytes32 findingId)
    {
        if (p.findingId == bytes32(0)) revert InvalidFindingId();
        if (p.subject == address(0)) revert InvalidSubject();
        if (p.evidenceHash == bytes32(0)) revert InvalidEvidenceHash();
        if (p.subjectChainId == 0) revert ZeroChainId();
        if (_findings[p.findingId].createdAt != 0) revert FindingExists(p.findingId);

        if (p.authorityLinkId != bytes32(0)) {
            AuthorityLinkEvidence storage link = _authorityLinks[p.authorityLinkId];
            if (link.validFrom == 0) revert LinkMissing(p.authorityLinkId);
            if (link.validUntil != 0 && link.validUntil <= block.timestamp) {
                revert LinkExpired(p.authorityLinkId);
            }
        }

        if (p.status == Status.TAINTED) {
            if (!hasRole(INVESTIGATOR_ROLE, msg.sender)) revert Unauthorized();
            if (!hasRole(ATTESTER_ROLE, msg.sender)) revert TaintedNeedsAttester();
        } else {
            if (!hasRole(INVESTIGATOR_ROLE, msg.sender) && !hasRole(INDEXER_ROLE, msg.sender)) {
                revert Unauthorized();
            }
        }

        // Discard stale active WATCH before installing a new active pointer (F3).
        bytes32 prevId = _latestBySubject[p.subjectChainId][p.subject];
        if (prevId != bytes32(0)) {
            Finding storage prev = _findings[prevId];
            if (prev.active && prev.status == Status.WATCH && _isStaleWatch(prev)) {
                prev.active = false;
            }
            // Ordinary WATCH must never clear active TAINTED.
            if (
                p.status == Status.WATCH && prev.active && prev.status == Status.TAINTED
                    && p.supersedesFindingId == bytes32(0)
            ) {
                // Keep TAINTED as latest; still store the new finding history but do not point latest to WATCH.
                uint64 nowTsKeep = uint64(block.timestamp);
                Finding memory watchRow = Finding({
                    findingId: p.findingId,
                    subjectChainId: p.subjectChainId,
                    subject: p.subject,
                    status: p.status,
                    version: 1,
                    evidenceHash: p.evidenceHash,
                    authorityLinkId: p.authorityLinkId,
                    supersedesFindingId: bytes32(0),
                    delegationExposure: p.delegationExposure,
                    authChainIdScope: p.authChainIdScope,
                    implAddress: p.implAddress,
                    implCodeHash: p.implCodeHash,
                    delegationChangedAt: p.delegationChangedAt,
                    createdAt: nowTsKeep,
                    updatedAt: nowTsKeep,
                    expiresAt: p.expiresAt,
                    active: false
                });
                _findings[p.findingId] = watchRow;
                _findingHistory[p.findingId].push(watchRow);
                unchecked {
                    ++findingCount;
                }
                emit FindingProposed(
                    p.findingId, p.subjectChainId, p.subject, p.status, 1, p.evidenceHash
                );
                return p.findingId;
            }
        }

        uint64 nowTs = uint64(block.timestamp);
        Finding memory row = Finding({
            findingId: p.findingId,
            subjectChainId: p.subjectChainId,
            subject: p.subject,
            status: p.status,
            version: 1,
            evidenceHash: p.evidenceHash,
            authorityLinkId: p.authorityLinkId,
            supersedesFindingId: p.supersedesFindingId,
            delegationExposure: p.delegationExposure,
            authChainIdScope: p.authChainIdScope,
            implAddress: p.implAddress,
            implCodeHash: p.implCodeHash,
            delegationChangedAt: p.delegationChangedAt,
            createdAt: nowTs,
            updatedAt: nowTs,
            expiresAt: p.expiresAt,
            active: true
        });

        if (p.supersedesFindingId != bytes32(0)) {
            Finding storage old = _findings[p.supersedesFindingId];
            if (old.createdAt == 0) revert FindingMissing(p.supersedesFindingId);
            if (old.status == Status.TAINTED || p.status == Status.TAINTED) {
                if (!hasRole(ATTESTER_ROLE, msg.sender)) revert TaintedNeedsAttester();
                if (!hasRole(DISPUTER_ROLE, msg.sender) && !hasRole(ATTESTER_ROLE, msg.sender)) {
                    revert Unauthorized();
                }
            }
            old.active = false;
            emit FindingSuperseded(p.supersedesFindingId, p.findingId, p.status, p.evidenceHash);
        }

        _findings[p.findingId] = row;
        _findingHistory[p.findingId].push(row);
        _latestBySubject[p.subjectChainId][p.subject] = p.findingId;
        unchecked {
            ++findingCount;
        }

        emit FindingProposed(
            p.findingId, p.subjectChainId, p.subject, p.status, 1, p.evidenceHash
        );
        if (p.status == Status.TAINTED) {
            emit FindingAttested(p.findingId, 1, msg.sender);
        }
        return p.findingId;
    }

    function elevateToTainted(bytes32 findingId, bytes32 evidenceHash)
        external
        onlyRole(ATTESTER_ROLE)
        whenNotPaused
    {
        Finding storage row = _findings[findingId];
        if (row.createdAt == 0 || !row.active) revert FindingMissing(findingId);
        if (evidenceHash == bytes32(0)) revert InvalidEvidenceHash();

        uint32 oldVersion = row.version;
        row.status = Status.TAINTED;
        row.evidenceHash = evidenceHash;
        unchecked {
            row.version += 1;
        }
        row.updatedAt = uint64(block.timestamp);
        _findingHistory[findingId].push(row);
        _latestBySubject[row.subjectChainId][row.subject] = findingId;

        emit FindingAttested(findingId, row.version, msg.sender);
        emit FindingSuperseded(findingId, findingId, Status.TAINTED, evidenceHash);
        oldVersion;
    }

    /**
     * @notice Attester-approved correction that may supersede TAINTED.
     *         Prior versions remain in history; active pointer moves.
     */
    function supersedeFinding(ProposeParams calldata p)
        external
        whenNotPaused
        returns (bytes32)
    {
        if (!hasRole(DISPUTER_ROLE, msg.sender) && !hasRole(ATTESTER_ROLE, msg.sender)) {
            revert Unauthorized();
        }
        if (p.supersedesFindingId == bytes32(0)) revert InvalidFindingId();
        if (p.status == Status.TAINTED || _findings[p.supersedesFindingId].status == Status.TAINTED)
        {
            if (!hasRole(ATTESTER_ROLE, msg.sender)) revert TaintedNeedsAttester();
        }
        // Same-tx propose keeps msg.sender roles (do not external-self-call).
        return proposeFinding(p);
    }

    function markRemediationRequired(bytes32 findingId, bytes32 evidenceHash)
        external
        whenNotPaused
    {
        if (!hasRole(INVESTIGATOR_ROLE, msg.sender) && !hasRole(DISPUTER_ROLE, msg.sender)) {
            revert Unauthorized();
        }
        Finding storage row = _findings[findingId];
        if (row.createdAt == 0) revert FindingMissing(findingId);
        if (evidenceHash == bytes32(0)) revert InvalidEvidenceHash();

        row.delegationExposure = DelegationExposure.HISTORICAL_EXPOSURE_REMEDIATION_REQUIRED;
        row.evidenceHash = evidenceHash;
        unchecked {
            row.version += 1;
        }
        row.updatedAt = uint64(block.timestamp);
        _findingHistory[findingId].push(row);
    }

    function markRemediationVerified(bytes32 findingId, bytes32 evidenceHash)
        external
        onlyRole(ATTESTER_ROLE)
        whenNotPaused
    {
        Finding storage row = _findings[findingId];
        if (row.createdAt == 0) revert FindingMissing(findingId);
        if (evidenceHash == bytes32(0)) revert InvalidEvidenceHash();
        if (
            row.delegationExposure
                != DelegationExposure.HISTORICAL_EXPOSURE_REMEDIATION_REQUIRED
                && row.delegationExposure
                    != DelegationExposure.HISTORICALLY_DELEGATED_TO_TAINTED_IMPL
        ) {
            revert RemediationNotHistorical();
        }

        row.delegationExposure = DelegationExposure.REMEDIATION_VERIFIED;
        row.evidenceHash = evidenceHash;
        unchecked {
            row.version += 1;
        }
        row.updatedAt = uint64(block.timestamp);
        _findingHistory[findingId].push(row);
    }

    function correctFinding(
        bytes32 findingId,
        Status newStatus,
        bytes32 evidenceHash,
        DelegationExposure newExposure
    ) external whenNotPaused {
        if (!hasRole(DISPUTER_ROLE, msg.sender)) revert Unauthorized();
        if (newStatus == Status.TAINTED && !hasRole(ATTESTER_ROLE, msg.sender)) {
            revert TaintedNeedsAttester();
        }
        if (evidenceHash == bytes32(0)) revert InvalidEvidenceHash();

        Finding storage row = _findings[findingId];
        if (row.createdAt == 0) revert FindingMissing(findingId);

        if (
            newExposure == DelegationExposure.NONE
                && (
                    row.delegationExposure
                        == DelegationExposure.HISTORICALLY_DELEGATED_TO_TAINTED_IMPL
                        || row.delegationExposure
                            == DelegationExposure.HISTORICAL_EXPOSURE_REMEDIATION_REQUIRED
                        || row.delegationExposure
                            == DelegationExposure.CURRENTLY_DELEGATED_TO_TAINTED_IMPL
                )
        ) {
            revert RemediationNotHistorical();
        }

        // Downgrading TAINTED via correctFinding requires Attester (same as supersede).
        if (row.status == Status.TAINTED && newStatus == Status.WATCH) {
            if (!hasRole(ATTESTER_ROLE, msg.sender)) revert TaintedNeedsAttester();
        }

        row.status = newStatus;
        row.evidenceHash = evidenceHash;
        row.delegationExposure = newExposure;
        unchecked {
            row.version += 1;
        }
        row.updatedAt = uint64(block.timestamp);
        row.active = true;
        _findingHistory[findingId].push(row);
        _latestBySubject[row.subjectChainId][row.subject] = findingId;
    }

    // -------------------------------------------------------------------------
    // Resolve
    // -------------------------------------------------------------------------

    function resolve(uint64 subjectChainId, address subject)
        external
        view
        returns (ResolveResult memory result)
    {
        result.verifiedSafe = false;
        result.rpcOk = true;

        bool queueRelevant = _vaultHasRelevantOps(subjectChainId, subject);
        result.relevantQueueOp = queueRelevant;

        bytes32 id = _latestBySubject[subjectChainId][subject];
        if (id != bytes32(0)) {
            Finding storage row = _findings[id];
            if (row.active && row.createdAt != 0 && !_isStaleWatch(row)) {
                result.findingId = id;
                result.version = row.version;
                result.evidenceHash = row.evidenceHash;
                result.status = row.status;
                result.delegationExposure = row.delegationExposure;
                if (row.status == Status.TAINTED) {
                    result.action = ResolveAction.BLOCK;
                } else {
                    result.action = ResolveAction.WARN;
                }
            }
        }

        // Inheritance: relevant queued/quarantined ops ⇒ at least WARN
        if (queueRelevant && result.action == ResolveAction.NO_VERDICT) {
            result.action = ResolveAction.WARN;
            result.status = Status.WATCH;
        } else if (queueRelevant && result.action == ResolveAction.WARN) {
            // keep WARN
        }

        // Chain-scoped delegation: merge impl finding severity
        DelegationRecord storage del = _delegations[subjectChainId][subject];
        if (del.set && del.impl != address(0)) {
            bytes32 implId = _latestBySubject[subjectChainId][del.impl];
            if (implId != bytes32(0)) {
                Finding storage implRow = _findings[implId];
                if (implRow.active && !_isStaleWatch(implRow)) {
                    if (implRow.status == Status.TAINTED) {
                        result.action = ResolveAction.BLOCK;
                        result.status = Status.TAINTED;
                        result.findingId = implId;
                        result.evidenceHash = implRow.evidenceHash;
                        result.version = implRow.version;
                    } else if (result.action == ResolveAction.NO_VERDICT) {
                        result.action = ResolveAction.WARN;
                        result.status = Status.WATCH;
                        result.findingId = implId;
                        result.evidenceHash = implRow.evidenceHash;
                        result.version = implRow.version;
                    }
                    if (
                        del.exposure == DelegationExposure.CURRENTLY_DELEGATED_TO_TAINTED_IMPL
                            || result.delegationExposure == DelegationExposure.NONE
                    ) {
                        result.delegationExposure = del.exposure;
                    }
                }
            } else if (del.exposure == DelegationExposure.CURRENTLY_DELEGATED_TO_TAINTED_IMPL) {
                if (result.action == ResolveAction.NO_VERDICT) {
                    result.action = ResolveAction.WARN;
                }
                result.delegationExposure = del.exposure;
            }
        }
    }

    function _vaultHasRelevantOps(uint64 chainId, address vault) private view returns (bool) {
        bytes32[] storage links = _queuesByVault[vaultKey(chainId, vault)];
        for (uint256 i = 0; i < links.length; ) {
            AuthorityLinkEvidence storage link = _authorityLinks[links[i]];
            if (link.validFrom != 0
                && (link.validUntil == 0 || link.validUntil > block.timestamp)
            ) {
                if (hasRelevantCriticalOperation(queueKey(link.chainId, link.queue))) {
                    return true;
                }
            }
            unchecked {
                ++i;
            }
        }
        return false;
    }

    function _isStaleWatch(Finding storage row) private view returns (bool) {
        if (row.status != Status.WATCH) return false;
        if (row.expiresAt != 0 && row.expiresAt <= block.timestamp) {
            // Still live if linked queues have relevant ops
            if (_vaultHasRelevantOps(row.subjectChainId, row.subject)) return false;
            return true;
        }
        return false;
    }

    function getFinding(bytes32 findingId) external view returns (Finding memory) {
        return _findings[findingId];
    }

    function getFindingHistoryLength(bytes32 findingId) external view returns (uint256) {
        return _findingHistory[findingId].length;
    }

    function getFindingHistoryAt(bytes32 findingId, uint256 index)
        external
        view
        returns (Finding memory)
    {
        return _findingHistory[findingId][index];
    }

    function latestFindingId(uint64 subjectChainId, address subject)
        external
        view
        returns (bytes32)
    {
        return _latestBySubject[subjectChainId][subject];
    }
}
