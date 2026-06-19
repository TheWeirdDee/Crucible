/*
 * The target contract shown in the war-room right panel, as structured segments
 * so the two vulnerable functions can be highlighted and swapped for their
 * hardened versions as the Build team lands patches during the siege.
 *
 * Mirrors contracts/src/VaultStaking.vulnerable.sol (and its hardened patch).
 */

export type SegmentKind = "static" | "withdraw" | "drain";

export interface SourceSegment {
  kind: SegmentKind;
  vulnerable: string;
  patched?: string;
}

export const CONTRACT_SEGMENTS: SourceSegment[] = [
  {
    kind: "static",
    vulnerable: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VaultStaking {
    address public owner;
    mapping(address => uint256) public balances;

    constructor() payable { owner = msg.sender; }

    function deposit() external payable {
        require(msg.value > 0, "zero deposit");
        balances[msg.sender] += msg.value;
    }
`,
  },
  {
    kind: "withdraw",
    vulnerable: `
    // BUG 1: external call before the balance is zeroed, no guard.
    function withdraw() external {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "nothing to withdraw");
        (bool ok,) = msg.sender.call{value: bal}("");  // interaction
        require(ok, "transfer failed");
        balances[msg.sender] = 0;                       // effect too late
    }
`,
    patched: `
    // FIXED: checks-effects-interactions + nonReentrant guard.
    function withdraw() external nonReentrant {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "nothing to withdraw");
        balances[msg.sender] = 0;                       // effect first
        (bool ok,) = msg.sender.call{value: bal}("");   // interaction last
        require(ok, "transfer failed");
    }
`,
  },
  {
    kind: "drain",
    vulnerable: `
    // BUG 2: no onlyOwner. Anyone can drain the vault.
    function emergencyDrain() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}`,
    patched: `
    // FIXED: owner-gated.
    function emergencyDrain() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}`,
  },
];
