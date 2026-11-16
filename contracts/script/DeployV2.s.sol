// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SavioursRegistryV2} from "../src/SavioursRegistryV2.sol";

/**
 * @notice Deploy SavioursRegistryV2.
 * @dev Default path: Base Sepolia (84532). Production: Base mainnet (8453) only after
 *      Sepolia validation suite passes — see docs/MAINNET_GATE.md.
 *
 *   cd contracts
 *   set -a && source ../.env && set +a
 *   forge script script/DeployV2.s.sol:DeployV2 \
 *     --rpc-url "$BASE_SEPOLIA_RPC_URL" --broadcast --private-key "$DEPLOYER_PRIVATE_KEY" \
 *     --verify
 */
contract DeployV2 is Script {
    function run() external {
        uint256 pk = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        if (pk == 0) {
            // Foundry scripts often pass --private-key; fall back to Anvil #0 for local dry-run.
            pk = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        }
        address deployer = vm.addr(pk);
        address admin = vm.envOr("REGISTRY_ADMIN", deployer);

        vm.startBroadcast(pk);
        SavioursRegistryV2 registry = new SavioursRegistryV2(admin);
        vm.stopBroadcast();

        console2.log("SavioursRegistryV2", address(registry));
        console2.log("admin", admin);
        console2.log("deployer", deployer);
        console2.log("chainid", block.chainid);
    }
}
