// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
 * VaultStakingHardened — HARDENED REFERENCE (PRD v2 §6.3)
 * ------------------------------------------------------
 * In the live system the @Engineer agent writes the patch under fire; this
 * file is the reference target the patch should converge to, used to verify
 * the re-attack reverts. Both planted bugs fixed.
 *
 * Named VaultStakingHardened (not VaultStaking) so both the vulnerable and
 * hardened artifacts can coexist in one test run.
 *
 * FIX 1 — Reentrancy: checks-effects-interactions (zero the balance BEFORE
 *         the external call) + a nonReentrant guard.
 * FIX 2 — Access control: onlyOwner on emergencyDrain(), msg.sender check.
 */
contract VaultStakingHardened {
    address public owner;
    mapping(address => uint256) public balances;
    uint256 private _locked = 1;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    modifier nonReentrant() {
        require(_locked == 1, "reentrant");
        _locked = 2;
        _;
        _locked = 1;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() payable {
        owner = msg.sender;
    }

    function deposit() external payable {
        require(msg.value > 0, "zero deposit");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    // FIXED: effect before interaction + guard.
    function withdraw() external nonReentrant {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "nothing to withdraw");

        balances[msg.sender] = 0;                             // effect first
        emit Withdrawn(msg.sender, bal);

        (bool ok, ) = msg.sender.call{value: bal}("");        // interaction last
        require(ok, "transfer failed");
    }

    // FIXED: owner-gated.
    function emergencyDrain() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    function vaultBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
