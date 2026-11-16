// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SavioursRegistryV2} from "../src/SavioursRegistryV2.sol";

contract SavioursRegistryV2Test is Test {
    SavioursRegistryV2 internal registry;

    address internal admin = address(0xA11CE);
    address internal indexer = address(0x1111);
    address internal investigator = address(0x2222);
    address internal attester = address(0x3333);
    address internal disputer = address(0x4444);
    address internal stranger = address(0xBAD);
    address internal subject = address(0x5555);
    address internal vault = address(0xB001);
    address internal queue = address(0x911E);
    address internal impl = address(0x1C0DE);

    uint64 internal constant BASE = 8453;
    bytes32 internal constant EVIDENCE = keccak256("evidence-v1");
    bytes32 internal constant FINDING_1 = keccak256("finding-1");
    bytes32 internal constant FINDING_2 = keccak256("finding-2");
    bytes32 internal constant LINK_1 = keccak256("link-1");
    bytes32 internal constant RAW_OP_A = keccak256("op-a");
    bytes32 internal constant RAW_OP_B = keccak256("op-b");

    function setUp() public {
        registry = new SavioursRegistryV2(admin);

        vm.startPrank(admin);
        registry.grantRole(registry.INDEXER_ROLE(), indexer);
        registry.grantRole(registry.INVESTIGATOR_ROLE(), investigator);
        registry.grantRole(registry.ATTESTER_ROLE(), attester);
        registry.grantRole(registry.DISPUTER_ROLE(), disputer);
        registry.grantRole(registry.INVESTIGATOR_ROLE(), attester);
        registry.grantRole(registry.ATTESTER_ROLE(), disputer);
        registry.grantRole(registry.DISPUTER_ROLE(), attester);
        vm.stopPrank();
    }

    function _link() internal view returns (SavioursRegistryV2.AuthorityLinkEvidence memory) {
        return SavioursRegistryV2.AuthorityLinkEvidence({
            linkId: LINK_1,
            chainId: BASE,
            vault: vault,
            queue: queue,
            blockNumber: 100,
            blockHash: keccak256("bh"),
            txHash: keccak256("tx"),
            proofType: SavioursRegistryV2.ProofType.MODULE,
            decoderVersion: keccak256("decoder-0.1.0"),
            validFrom: 0,
            validUntil: 0
        });
    }

    function _proposeWatch(bytes32 id, bytes32 linkId)
        internal
        view
        returns (SavioursRegistryV2.ProposeParams memory)
    {
        return SavioursRegistryV2.ProposeParams({
            findingId: id,
            subjectChainId: BASE,
            subject: subject,
            status: SavioursRegistryV2.Status.WATCH,
            evidenceHash: EVIDENCE,
            authorityLinkId: linkId,
            supersedesFindingId: bytes32(0),
            delegationExposure: SavioursRegistryV2.DelegationExposure.NONE,
            authChainIdScope: BASE,
            implAddress: address(0),
            implCodeHash: bytes32(0),
            delegationChangedAt: 0,
            expiresAt: 0
        });
    }

    function test_resolve_unset_is_no_verdict_not_safe() public view {
        SavioursRegistryV2.ResolveResult memory r = registry.resolve(BASE, subject);
        assertEq(uint8(r.action), uint8(SavioursRegistryV2.ResolveAction.NO_VERDICT));
        assertFalse(r.verifiedSafe);
    }

    function test_watch_resolve_warns() public {
        vm.prank(indexer);
        registry.recordAuthorityLink(_link());

        SavioursRegistryV2.ProposeParams memory p = _proposeWatch(FINDING_1, LINK_1);
        p.subject = vault;
        vm.prank(investigator);
        registry.proposeFinding(p);

        SavioursRegistryV2.ResolveResult memory r = registry.resolve(BASE, vault);
        assertEq(uint8(r.action), uint8(SavioursRegistryV2.ResolveAction.WARN));
        assertFalse(r.verifiedSafe);
    }

    function test_tainted_requires_attester() public {
        SavioursRegistryV2.ProposeParams memory p = _proposeWatch(FINDING_1, bytes32(0));
        p.status = SavioursRegistryV2.Status.TAINTED;

        vm.prank(investigator);
        vm.expectRevert(SavioursRegistryV2.TaintedNeedsAttester.selector);
        registry.proposeFinding(p);
    }

    function test_tainted_with_attester_blocks() public {
        SavioursRegistryV2.ProposeParams memory p = _proposeWatch(FINDING_1, bytes32(0));
        p.status = SavioursRegistryV2.Status.TAINTED;

        vm.prank(attester);
        registry.proposeFinding(p);

        SavioursRegistryV2.ResolveResult memory r = registry.resolve(BASE, subject);
        assertEq(uint8(r.action), uint8(SavioursRegistryV2.ResolveAction.BLOCK));
    }

    function test_cancel_B_does_not_clear_A() public {
        vm.prank(indexer);
        registry.recordAuthorityLink(_link());

        bytes32 keyA = registry.opKey(BASE, queue, RAW_OP_A);
        bytes32 keyB = registry.opKey(BASE, queue, RAW_OP_B);

        vm.startPrank(indexer);
        registry.recordQueuedOperation(BASE, queue, RAW_OP_A, uint64(block.timestamp + 1 days), EVIDENCE);
        registry.recordQueuedOperation(BASE, queue, RAW_OP_B, uint64(block.timestamp + 1 days), keccak256("ev-b"));
        registry.cancelOperation(keyB);
        vm.stopPrank();

        assertTrue(registry.hasRelevantCriticalOperation(registry.queueKey(BASE, queue)));
        assertEq(
            uint8(registry.getOperation(keyA).state),
            uint8(SavioursRegistryV2.OperationState.QUEUED)
        );
        assertEq(
            uint8(registry.getOperation(keyB).state),
            uint8(SavioursRegistryV2.OperationState.CANCELLED)
        );

        SavioursRegistryV2.ResolveResult memory r = registry.resolve(BASE, vault);
        assertEq(uint8(r.action), uint8(SavioursRegistryV2.ResolveAction.WARN));
        assertTrue(r.relevantQueueOp);
    }

    function test_execute_keeps_quarantine_warn() public {
        vm.prank(indexer);
        registry.recordAuthorityLink(_link());

        bytes32 keyA = registry.opKey(BASE, queue, RAW_OP_A);
        vm.startPrank(indexer);
        registry.recordQueuedOperation(BASE, queue, RAW_OP_A, uint64(block.timestamp + 1 days), EVIDENCE);
        registry.executeOperation(keyA);
        vm.stopPrank();

        SavioursRegistryV2.Operation memory op = registry.getOperation(keyA);
        assertEq(uint8(op.state), uint8(SavioursRegistryV2.OperationState.EXECUTED_QUARANTINE));
        assertEq(op.quarantineUntil, uint64(block.timestamp) + registry.QUARANTINE_SECONDS());

        SavioursRegistryV2.ResolveResult memory r = registry.resolve(BASE, vault);
        assertEq(uint8(r.action), uint8(SavioursRegistryV2.ResolveAction.WARN));
        assertTrue(r.relevantQueueOp);

        // After quarantine window — no longer relevant
        vm.warp(uint256(op.quarantineUntil) + 1);
        r = registry.resolve(BASE, vault);
        assertFalse(registry.hasRelevantCriticalOperation(registry.queueKey(BASE, queue)));
        assertEq(uint8(r.action), uint8(SavioursRegistryV2.ResolveAction.NO_VERDICT));
    }

    function test_expired_queued_not_zombie_watch() public {
        vm.prank(indexer);
        registry.recordAuthorityLink(_link());

        bytes32 keyA = registry.opKey(BASE, queue, RAW_OP_A);
        uint64 exp = uint64(block.timestamp + 100);
        vm.prank(indexer);
        registry.recordQueuedOperation(BASE, queue, RAW_OP_A, exp, EVIDENCE);

        assertTrue(registry.hasRelevantCriticalOperation(registry.queueKey(BASE, queue)));

        vm.warp(uint256(exp) + 1);
        // Resolve-time: QUEUED past opExpiresAt is not relevant (even before indexer expire)
        assertFalse(registry.hasRelevantCriticalOperation(registry.queueKey(BASE, queue)));

        vm.prank(indexer);
        registry.expireOperation(keyA);
        assertEq(
            uint8(registry.getOperation(keyA).state),
            uint8(SavioursRegistryV2.OperationState.EXPIRED)
        );

        SavioursRegistryV2.ResolveResult memory r = registry.resolve(BASE, vault);
        assertEq(uint8(r.action), uint8(SavioursRegistryV2.ResolveAction.NO_VERDICT));
    }

    function test_watch_cannot_clear_tainted_without_supersede() public {
        SavioursRegistryV2.ProposeParams memory tainted = _proposeWatch(FINDING_1, bytes32(0));
        tainted.status = SavioursRegistryV2.Status.TAINTED;
        vm.prank(attester);
        registry.proposeFinding(tainted);

        SavioursRegistryV2.ProposeParams memory watch = _proposeWatch(FINDING_2, bytes32(0));
        vm.prank(investigator);
        registry.proposeFinding(watch);

        // Latest active remains TAINTED
        assertEq(registry.latestFindingId(BASE, subject), FINDING_1);
        SavioursRegistryV2.ResolveResult memory r = registry.resolve(BASE, subject);
        assertEq(uint8(r.action), uint8(SavioursRegistryV2.ResolveAction.BLOCK));
    }

    function test_attester_supersede_clears_tainted_keeps_history() public {
        SavioursRegistryV2.ProposeParams memory tainted = _proposeWatch(FINDING_1, bytes32(0));
        tainted.status = SavioursRegistryV2.Status.TAINTED;
        vm.prank(attester);
        registry.proposeFinding(tainted);

        SavioursRegistryV2.ProposeParams memory corr = _proposeWatch(FINDING_2, bytes32(0));
        corr.status = SavioursRegistryV2.Status.WATCH;
        corr.supersedesFindingId = FINDING_1;
        corr.evidenceHash = keccak256("correction");

        vm.prank(attester); // has disputer+attester
        registry.proposeFinding(corr);

        assertFalse(registry.getFinding(FINDING_1).active);
        assertTrue(registry.getFinding(FINDING_2).active);
        assertEq(registry.latestFindingId(BASE, subject), FINDING_2);
        assertEq(registry.getFindingHistoryLength(FINDING_1), 1);

        SavioursRegistryV2.ResolveResult memory r = registry.resolve(BASE, subject);
        assertEq(uint8(r.action), uint8(SavioursRegistryV2.ResolveAction.WARN));
    }

    function test_stale_watch_discarded_before_new_merge() public {
        SavioursRegistryV2.ProposeParams memory oldW = _proposeWatch(FINDING_1, bytes32(0));
        oldW.expiresAt = uint64(block.timestamp + 10);
        vm.prank(investigator);
        registry.proposeFinding(oldW);

        vm.warp(block.timestamp + 11);

        SavioursRegistryV2.ProposeParams memory newW = _proposeWatch(FINDING_2, bytes32(0));
        newW.expiresAt = uint64(block.timestamp + 1000);
        newW.evidenceHash = keccak256("fresh");
        vm.prank(investigator);
        registry.proposeFinding(newW);

        assertFalse(registry.getFinding(FINDING_1).active);
        assertTrue(registry.getFinding(FINDING_2).active);
        assertEq(registry.latestFindingId(BASE, subject), FINDING_2);
    }

    function test_chain_scoped_delegation_merge() public {
        // Taint impl on Base
        SavioursRegistryV2.ProposeParams memory p = _proposeWatch(FINDING_1, bytes32(0));
        p.subject = impl;
        p.status = SavioursRegistryV2.Status.TAINTED;
        vm.prank(attester);
        registry.proposeFinding(p);

        vm.prank(indexer);
        registry.setDelegation(
            BASE,
            subject,
            impl,
            BASE,
            keccak256("code"),
            SavioursRegistryV2.DelegationExposure.CURRENTLY_DELEGATED_TO_TAINTED_IMPL,
            keccak256("prov")
        );

        SavioursRegistryV2.ResolveResult memory r = registry.resolve(BASE, subject);
        assertEq(uint8(r.action), uint8(SavioursRegistryV2.ResolveAction.BLOCK));
        assertEq(
            uint8(r.delegationExposure),
            uint8(SavioursRegistryV2.DelegationExposure.CURRENTLY_DELEGATED_TO_TAINTED_IMPL)
        );
    }

    function test_7702_revoke_does_not_auto_clear_to_none() public {
        SavioursRegistryV2.ProposeParams memory p = _proposeWatch(FINDING_1, bytes32(0));
        p.status = SavioursRegistryV2.Status.TAINTED;
        p.delegationExposure =
            SavioursRegistryV2.DelegationExposure.CURRENTLY_DELEGATED_TO_TAINTED_IMPL;
        p.implAddress = impl;
        p.implCodeHash = keccak256("code-on-base");

        vm.prank(attester);
        registry.proposeFinding(p);

        vm.prank(disputer);
        vm.expectRevert(SavioursRegistryV2.RemediationNotHistorical.selector);
        registry.correctFinding(
            FINDING_1,
            SavioursRegistryV2.Status.WATCH,
            keccak256("ev-clear"),
            SavioursRegistryV2.DelegationExposure.NONE
        );

        vm.prank(investigator);
        registry.markRemediationRequired(FINDING_1, keccak256("ev-rem"));
        vm.prank(attester);
        registry.markRemediationVerified(FINDING_1, keccak256("ev-ok"));

        assertEq(
            uint8(registry.getFinding(FINDING_1).delegationExposure),
            uint8(SavioursRegistryV2.DelegationExposure.REMEDIATION_VERIFIED)
        );
        assertEq(
            uint8(registry.getFinding(FINDING_1).status),
            uint8(SavioursRegistryV2.Status.TAINTED)
        );
    }

    function test_pause_blocks_writes_not_resolve() public {
        vm.prank(investigator);
        registry.proposeFinding(_proposeWatch(FINDING_1, bytes32(0)));

        vm.prank(admin);
        registry.pause();

        vm.prank(investigator);
        vm.expectRevert();
        registry.proposeFinding(_proposeWatch(FINDING_2, bytes32(0)));

        SavioursRegistryV2.ResolveResult memory r = registry.resolve(BASE, subject);
        assertEq(uint8(r.action), uint8(SavioursRegistryV2.ResolveAction.WARN));
    }

    function test_stranger_cannot_propose() public {
        vm.prank(stranger);
        vm.expectRevert(SavioursRegistryV2.Unauthorized.selector);
        registry.proposeFinding(_proposeWatch(FINDING_1, bytes32(0)));
    }
}
