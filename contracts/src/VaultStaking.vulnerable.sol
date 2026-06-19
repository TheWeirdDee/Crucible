// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
 * VaultStaking — DELIBERATELY VULNERABLE TARGET (PRD v2 §6.3)
 * ----------------------------------------------------------
 * The contract Crucible attacks in the demo. Two planted, real bugs.
 * Funded with 100 ETH at test start (via Anvil). DO NOT DEPLOY TO MAINNET.
 *
 * BUG 1 — Reentrancy in withdraw():
 *   the caller's balance is zeroed AFTER the external call, with no
 *   nonReentrant guard. A malicious receiver re-enters withdraw() before
 *   the zero-out runs and drains the vault. This is the canonical
 *   "effect-after-interaction" reentrancy that genuinely drains under
 *   Solidity 0.8 (a post-call `-= amount` would instead underflow-revert,
 *   so it is NOT used here). Target of @ReentrancySpec (Round 1).
 *
 * BUG 2 — Missing access control on emergencyDrain():
 *   no onlyOwner modifier; callable by anyone.
 *   Target of @AccessSpec (Round 2).
 */
contract VaultStaking {
    address public owner;
    mapping(address => uint256) public balances;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    constructor() payable {
        owner = msg.sender;
    }

    function deposit() external payable {
        require(msg.value > 0, "zero deposit");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    // BUG 1: external call before the balance is zeroed, no guard => reentrancy.
    function withdraw() external {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "nothing to withdraw");

        (bool ok, ) = msg.sender.call{value: bal}("");       // interaction first
        require(ok, "transfer failed");

        balances[msg.sender] = 0;                             // effect too late
        emit Withdrawn(msg.sender, bal);
    }

    // BUG 2: no onlyOwner. Anyone can drain the whole vault.
    function emergencyDrain() external {
        payable(msg.sender).transfer(address(this).balance);
    }

    function vaultBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
