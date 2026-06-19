// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/VaultStaking.vulnerable.sol";
import "../src/VaultStaking.hardened.sol";
import "../src/MaliciousVault.sol";

/**
 * Reentrancy — Spike B, Round 1 (PRD v2 §5 Step 4 + §6.3).
 *
 * Proves the planted reentrancy bug is REAL: the vulnerable vault drains
 * 100 -> 0 ETH. Then proves the hardened patch makes the same exploit revert.
 *
 * The tx hash printed by testDrain_real_tx_hash is the value that replaces
 * 0xFAKE_round1_replace_with_real_anvil_hash in data/crucible-demo.json.
 */
contract ReentrancyTest is Test {
    VaultStaking vault;

    function setUp() public {
        vault = new VaultStaking{value: 100 ether}();
    }

    /// The drain lands on the vulnerable contract: 100 ETH -> 0 ETH.
    function testDrain() public {
        assertEq(address(vault).balance, 100 ether, "vault should start at 100 ETH");

        // Large stake keeps the recursion shallow (2 levels) so the exploit
        // also lands on-chain under the 63/64 gas-forwarding rule, not just
        // in the in-memory test EVM.
        MaliciousVault evil = new MaliciousVault{value: 100 ether}(address(vault));
        evil.attack();

        assertEq(address(vault).balance, 0, "vault drained to 0");
        assertGt(address(evil).balance, 100 ether, "attacker profited the vault's funds");
    }

    /// The same exploit must REVERT against the hardened (nonReentrant) contract.
    function testHardenedBlocksReentrancy() public {
        VaultStakingHardened safe = new VaultStakingHardened{value: 100 ether}();
        MaliciousVault evil = new MaliciousVault{value: 1 ether}(address(safe));

        // The reentrant withdraw() trips the nonReentrant guard; that revert
        // bubbles back through the outer withdraw()'s require(ok), so attack()
        // reverts atomically and the in-tx deposit rolls back too.
        vm.expectRevert();
        evil.attack();

        assertEq(address(safe).balance, 100 ether, "hardened vault holds at 100 ETH");
    }
}
