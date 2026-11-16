// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SavioursRegistryV2} from "../src/SavioursRegistryV2.sol";

contract SavioursRegistryV2InvariantTest is Test {
    SavioursRegistryV2 internal registry;
    address internal admin = address(0xA11CE);
    address internal attester = address(0x3333);

    function setUp() public {
        registry = new SavioursRegistryV2(admin);
        vm.startPrank(admin);
        registry.grantRole(registry.ATTESTER_ROLE(), attester);
        registry.grantRole(registry.INVESTIGATOR_ROLE(), attester);
        vm.stopPrank();
    }

    function test_verifiedSafe_always_false_on_resolve() public {
        SavioursRegistryV2.ResolveResult memory r = registry.resolve(8453, address(0xBEEF));
        assertFalse(r.verifiedSafe);
        assertEq(uint8(r.action), uint8(SavioursRegistryV2.ResolveAction.NO_VERDICT));
    }

    function test_tainted_not_cleared_by_watch_write() public {
        SavioursRegistryV2.ProposeParams memory t = SavioursRegistryV2.ProposeParams({
            findingId: keccak256("t"),
            subjectChainId: 8453,
            subject: address(0xBEEF),
            status: SavioursRegistryV2.Status.TAINTED,
            evidenceHash: keccak256("e"),
            authorityLinkId: bytes32(0),
            supersedesFindingId: bytes32(0),
            delegationExposure: SavioursRegistryV2.DelegationExposure.NONE,
            authChainIdScope: 8453,
            implAddress: address(0),
            implCodeHash: bytes32(0),
            delegationChangedAt: 0,
            expiresAt: 0
        });
        vm.prank(attester);
        registry.proposeFinding(t);

        SavioursRegistryV2.ProposeParams memory w = t;
        w.findingId = keccak256("w");
        w.status = SavioursRegistryV2.Status.WATCH;
        w.evidenceHash = keccak256("e2");
        vm.prank(attester);
        registry.proposeFinding(w);

        SavioursRegistryV2.ResolveResult memory r = registry.resolve(8453, address(0xBEEF));
        assertEq(uint8(r.action), uint8(SavioursRegistryV2.ResolveAction.BLOCK));
        assertFalse(r.verifiedSafe);
    }
}
