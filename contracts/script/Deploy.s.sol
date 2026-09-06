// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SavioursRegistry} from "../src/SavioursRegistry.sol";

/**
 * @notice Deploy SavioursRegistry to Sepolia (or Anvil).
 *
 * Env:
 *   RELAYER_PRIVATE_KEY — deployer; receives DEFAULT_ADMIN + REGISTRAR
 *   SEPOLIA_RPC_URL     — when broadcasting to Sepolia
 *
 * Example (local Anvil):
 *   anvil &
 *   forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast \
 *     --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
 *
 * Example (Sepolia — needs funded RELAYER_PRIVATE_KEY in .env):
 *   set -a && source ../.env && set +a
 *   forge script script/Deploy.s.sol:DeployScript --rpc-url "$SEPOLIA_RPC_URL" \
 *     --broadcast --private-key "$RELAYER_PRIVATE_KEY"
 *
 * After broadcast, run `pnpm deploy:record` (or scripts/record-deployment.ts)
 * to write deployments/sepolia.json — never hand-edit addresses into .env.
 */
contract DeployScript is Script {
    function run() external {
        uint256 pk = vm.envUint("RELAYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        SavioursRegistry registry = new SavioursRegistry(deployer);
        vm.stopBroadcast();

        console2.log("SavioursRegistry deployed at", address(registry));
        console2.log("admin/registrar", deployer);
        console2.log("block", block.number);
    }
}
