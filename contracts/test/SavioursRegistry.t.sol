// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SavioursRegistry} from "../src/SavioursRegistry.sol";

contract SavioursRegistryTest is Test {
    SavioursRegistry internal registry;

    address internal admin = address(0xA11CE);
    address internal registrar = address(0xB0B);
    address internal stranger = address(0xBAD);
    address internal target = address(0x1111);

    bytes32 internal constant INC_1 = keccak256("SAV-ETH-0001");
    bytes32 internal constant FP_1 = keccak256("fp-1");
    bytes32 internal constant EV_1 = keccak256("evidence-1");

    function setUp() public {
        vm.prank(admin);
        // constructor grants admin both DEFAULT_ADMIN and REGISTRAR
        registry = new SavioursRegistry(admin);

        vm.startPrank(admin);
        registry.grantRole(registry.REGISTRAR_ROLE(), registrar);
        vm.stopPrank();
    }

    function _params(bytes32 id, bytes32 fp)
        internal
        view
        returns (SavioursRegistry.RegisterParams memory)
    {
        return SavioursRegistry.RegisterParams({
            incidentId: id,
            chainId: 1,
            target: target,
            fingerprint: fp,
            status: SavioursRegistry.Status.TAINTED,
            threatType: SavioursRegistry.ThreatType.DRAINER,
            confidenceBucket: 90,
            evidenceHash: EV_1,
            ensNode: bytes32(0),
            expiresAt: 0
        });
    }

    function test_register_succeeds_and_reads_back() public {
        vm.prank(registrar);
        bytes32 id = registry.register(_params(INC_1, FP_1));
        assertEq(id, INC_1);

        SavioursRegistry.Incident memory row = registry.getIncident(INC_1);
        assertEq(row.incidentId, INC_1);
        assertEq(row.target, target);
        assertEq(uint8(row.status), uint8(SavioursRegistry.Status.TAINTED));
        assertEq(row.confidenceBucket, 90);
        assertTrue(registry.exists(INC_1));
    }

    function test_duplicate_incidentId_reverts() public {
        vm.startPrank(registrar);
        registry.register(_params(INC_1, FP_1));

        // Different fingerprint so idempotency path is skipped; same incidentId
        SavioursRegistry.RegisterParams memory p = _params(INC_1, keccak256("fp-other"));
        vm.expectRevert(
            abi.encodeWithSelector(SavioursRegistry.IncidentAlreadyExists.selector, INC_1)
        );
        registry.register(p);
        vm.stopPrank();
    }

    function test_idempotent_same_target_fingerprint() public {
        vm.startPrank(registrar);
        bytes32 first = registry.register(_params(INC_1, FP_1));
        // Retry with a *new* incident id but same target+fp → returns first id, no second row
        bytes32 second = registry.register(_params(keccak256("SAV-ETH-0002"), FP_1));
        vm.stopPrank();

        assertEq(first, INC_1);
        assertEq(second, INC_1);
        assertFalse(registry.exists(keccak256("SAV-ETH-0002")));
    }

    function test_non_registrar_reverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.register(_params(INC_1, FP_1));
    }

    function test_emits_IncidentRegistered() public {
        vm.prank(registrar);
        vm.expectEmit(true, true, true, true);
        emit SavioursRegistry.IncidentRegistered(
            INC_1,
            1,
            target,
            FP_1,
            SavioursRegistry.Status.TAINTED,
            SavioursRegistry.ThreatType.DRAINER,
            EV_1,
            bytes32(0)
        );
        registry.register(_params(INC_1, FP_1));
    }

    function test_rejects_unknown_status() public {
        SavioursRegistry.RegisterParams memory p = _params(INC_1, FP_1);
        p.status = SavioursRegistry.Status.UNKNOWN;
        vm.prank(registrar);
        vm.expectRevert(
            abi.encodeWithSelector(
                SavioursRegistry.InvalidStatus.selector, SavioursRegistry.Status.UNKNOWN
            )
        );
        registry.register(p);
    }

    function test_lookup_by_target_fingerprint() public {
        vm.prank(registrar);
        registry.register(_params(INC_1, FP_1));
        assertEq(registry.getIncidentIdByTargetFingerprint(1, target, FP_1), INC_1);
    }
}
