// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/VaultStaking.vulnerable.sol";
import "../src/VaultStaking.hardened.sol";

/**
 * Access control — Spike B, Round 2 (PRD v2 §5 Step 7 + §6.3).
 *
 * Proves the planted access-control bug is REAL: emergencyDrain() has no
 * onlyOwner guard, so an unauthorized attacker drains the whole vault.
 * Then proves the hardened version reverts for the same caller.
 */
contract AccessControlTest is Test {
    VaultStaking vault;

    address constant ATTACKER = address(0xA11CE);

    function setUp() public {
        vault = new VaultStaking{value: 100 ether}();
    }

    /// Unauthorized address drains the vault via the unguarded emergencyDrain().
    function testUnauthorizedDrain() public {
        assertEq(address(vault).balance, 100 ether, "vault should start at 100 ETH");

        vm.prank(ATTACKER);
        vault.emergencyDrain();

        assertEq(address(vault).balance, 0, "vault drained to 0 by attacker");
        assertEq(ATTACKER.balance, 100 ether, "attacker received the funds");
    }

    /// The hardened version reverts for any caller that is not the owner.
    function testHardenedBlocksUnauthorizedDrain() public {
        VaultStakingHardened safe = new VaultStakingHardened{value: 100 ether}();

        vm.prank(ATTACKER);
        vm.expectRevert(bytes("not owner"));
        safe.emergencyDrain();

        assertEq(address(safe).balance, 100 ether, "hardened vault holds at 100 ETH");
    }
}
