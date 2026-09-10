// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SavioursGuard (example)
 * @notice Pre-exec counterparty gate: revert if ENS text `saviours.status` == TAINTED.
 * @dev EXAMPLE for wallets / Safe modules / ERC-7579 hooks — not part of the film deploy.
 *
 *     PermissionedResolver (Sepolia): 0xF479306621F718F7d76875f67506ceD33717751c
 *     Name: <lowercase-address>.saviours.eth
 *
 * Pass the ENS node (namehash) from off-chain / module encoding — do not invent namehash
 * math in the hot path without tests against a known ATTACK-1 node.
 */
interface IENSTextResolver {
    function text(bytes32 node, string calldata key) external view returns (string memory);
}

contract SavioursGuard {
    IENSTextResolver public immutable resolver;

    error CounterpartyTainted();

    constructor(address ensTextResolver) {
        resolver = IENSTextResolver(ensTextResolver);
    }

    /**
     * @param ensNode namehash of `<addr>.saviours.eth`
     * @dev Missing / empty status does NOT revert — absence ≠ SAFE endorsement.
     *      Callers that want fail-closed on UNKNOWN should add their own policy.
     */
    function requireNotTainted(bytes32 ensNode) external view {
        string memory status = resolver.text(ensNode, "saviours.status");
        if (_eq(status, "TAINTED")) revert CounterpartyTainted();
    }

    function _eq(string memory a, string memory b) private pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
