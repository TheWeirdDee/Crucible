# Security Specification

## Scope Statement

Crucible is designed as a dynamic, adversarial automated verification environment for Solidity smart contracts. It acts as an active validation stage in the development lifecycle.

### In Scope for Demo:
*   **Reentrancy Vulnerabilities**: Specifically, external calls made prior to state mapping modifications (checks-effects-interactions violations) in ETH-transfer paths.
*   **Access Control Vulnerabilities**: Privileged functions missing authority checks, allowing unauthorized external addresses to trigger administrative functions.

### Out of Scope:
*   **Replacement for Human Audits**: Crucible is not a replacement for a professional human security audit. It is a pre-flight tool designed to catch and patch known classes of bugs before human review.
*   **Multi-chain Environments**: Crucible operates on a single-chain local fork (Anvil) and does not support cross-chain message passing or multi-chain security assertions in its current form.
*   **General Static Analysis**: Crucible does not run pattern-matching AST linters (like Slither or Mythril) inside its core pipeline; it relies on LLM-driven adversarial execution to verify vulnerabilities.

---

## Threat Model (VaultStaking.sol)

The target demonstration contract [VaultStaking.vulnerable.sol](file:///Users/mac/Crucible/contracts/src/VaultStaking.vulnerable.sol) contains two intentional security defects.

### 1. Reentrancy Vulnerability

*   **Vulnerability Class**: Reentrancy (checks-effects-interactions violation).
*   **Affected Function**: `withdraw()`
*   **Attack Vector**: Low-level external call (`call`) forwarding ETH to a caller contract before updating the caller's balance in the internal mapping.
*   **Exploit Mechanism**:
    1.  An attacker contract deposits a stake of `100 ETH` using the `deposit()` function.
    2.  The attacker contract calls `withdraw()`.
    3.  The contract verifies the attacker's balance (`balances[msg.sender]` is `100 ETH`).
    4.  The contract sends the funds via `msg.sender.call{value: bal}("")`.
    5.  The control flow shifts to the attacker contract's `receive()` function.
    6.  The attacker contract immediately calls `withdraw()` again.
    7.  The contract checks the attacker's balance. Because the mapping has not been updated, the balance remains `100 ETH`. The check passes.
    8.  The contract transfers another `100 ETH` to the attacker, repeating the loop.
    9.  The loop terminates when the vault's total balance is depleted. The execution then returns to set `balances[msg.sender] = 0`.
*   **Severity**: **CRITICAL** (leads to complete depletion of vault funds).
*   **Patch Applied**: The state change is moved before the external call, and a `nonReentrant` reentrancy guard modifier is added to the function signature.

```solidity
function withdraw() external nonReentrant {
    uint256 bal = balances[msg.sender];
    require(bal > 0, "nothing to withdraw");
    balances[msg.sender] = 0; // Effect first
    (bool ok, ) = msg.sender.call{value: bal}(""); // Interaction last
    require(ok, "transfer failed");
}
```

### 2. Access Control Vulnerability

*   **Vulnerability Class**: Missing Access Control modifier.
*   **Affected Function**: `emergencyDrain()`
*   **Attack Vector**: An administrative rescue function is exposed publicly without validation of the caller's address.
*   **Exploit Mechanism**:
    1.  An unauthorized external address calls `emergencyDrain()`.
    2.  The function executes without verifying the caller's identity.
    3.  The contract transfers its entire contract balance (`address(this).balance`) to the attacker.
*   **Severity**: **CRITICAL** (unprivileged users can drain all contract funds instantly).
*   **Patch Applied**: Enforced an `onlyOwner` modifier verifying `msg.sender == owner`.

```solidity
modifier onlyOwner() {
    require(msg.sender == owner, "not owner");
    _;
}

function emergencyDrain() external onlyOwner {
    payable(owner).transfer(address(this).balance);
}
```

---

## Adversarial Process

Crucible separates the defensive and offensive tasks into two isolated agent teams:

```
                  ┌───────────────────────┐
                  │   Developer Upload    │
                  └───────────┬───────────┘
                              ▼
                  ┌───────────────────────┐
                  │    Crucible-Judge     │
                  └───────────┬───────────┘
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
┌───────────────────────┐           ┌───────────────────────┐
│      Build Team       │           │       Red Team        │
│ ───────────────────── │           │ ───────────────────── │
│  • Crucible-Architect │           │  • Crucible-RedLead   │
│  • Crucible-Engineer  │           │  • Specialists        │
└───────────────────────┘           └───────────────────────┘
```

*   **Build Team**: Uses `@Crucible-Architect` to map the attack surface and `@Crucible-Engineer` to write patches when exploits succeed.
*   **Red Team**: Managed by `@Crucible-RedLead`, which inspects the contract and dynamically recruits specialist agents at runtime to write and run targeted exploit code.
*   **Judge**: Acts as the objective referee, validating exploit and patch states on-chain, and formatting the final JSON report.
*   **Human-in-the-Loop**: A human Security Lead holds the only cryptographic key required to sign the verdict. This validation step is not optional. Before any patch or hardening report can be pushed to production, the human must review the transaction receipts on the local Anvil fork and click **Approve**, flipping `human_approved` to `true`. This ensures that no automated agent makes final deployment decisions without human oversight.

---

## Runtime Recruitment Security Note

The selection of the specialist attacker is not pre-scripted. When a contract is submitted, `@Crucible-RedLead` reads the source code and determines which vulnerability classes are present. It then queries the Band peer registry using `thenvoi_lookup_peers` to find an agent registered with matching capabilities.

*   If a reentrancy vulnerability is identified, it recruits `@Crucible-ReentrancySpec`.
*   If an access control vulnerability is identified, it recruits `@Crucible-AccessSpec`.
*   **Fallback Behavior**: If `thenvoi_lookup_peers` returns no matches (e.g., if a specialist node is offline), the Red Lead will attempt to query a generalist audit agent, or halt the round and alert the Judge that the required attack specialist could not be recruited, preventing silent failures.

---

## Exploit Artifacts

Every exploit execution in Crucible runs against a live Anvil fork, producing real on-chain transaction outputs. No balance values, exploit results, or transaction states are simulated or hardcoded.

Each transaction receipt generated by the tool wrapper contains:
1.  **Block Number**: The block height on the local Anvil fork where the exploit transaction was mined.
2.  **Transaction Hash**: The actual keccak256 hash of the executed exploit transaction.
3.  **Gas Used**: The precise amount of gas consumed by the exploit execution.
4.  **Vault Balances**: The contract's balance directly pulled from the Anvil RPC endpoint before and after the attack transaction.

---

## Known Limitations

Crucible v1 targets two common vulnerability classes for its demonstration. The following attack categories are out of scope for the current engine:
*   **Flash Loans & Oracle Manipulation**: Attacks relying on flash loans or manipulating pricing oracles.
*   **MEV (Miner Extractable Value)**: Frontrunning, sandwich attacks, and block space manipulation.
*   **Integer Overflow/Underflow**: Handled natively by Solidity version `^0.8.0`, but complex custom math overflows are not evaluated.
*   **Signature Replay & Delegatecall Proxies**: Logic errors involving signature malleability or corrupting delegatecall storage slots.
*   **Gas Griefing**: Attacks aiming to exhaust gas limits or block contract execution without draining funds.

---

## Responsible Disclosure

The target contract `VaultStaking.vulnerable.sol` contains critical security flaws designed for testing. This contract is not secure and must never be deployed on any mainnet or testnet holding real value.

---

## Human Approval Requirement

The Judge agent compiles the hardening verdict JSON but cannot authorize it. The fields:

```json
  "human_approved": false,
  "approver": null
```

are initialized to `false` and `null`. The Judge agent is programmatically restricted from altering these two fields. They can only be populated when the human Security Lead interacts with the frontend client to verify the Anvil tx hashes and authorize the release.

---

## See Also

*   [README.md](file:///Users/mac/Crucible/README.md) - Project introduction, quickstart instructions, and LLM routes.
*   [ARCHITECTURE.md](file:///Users/mac/Crucible/ARCHITECTURE.md) - System layout, Band APIs, and data flows.
*   [ADVERSARIAL_TESTING.md](file:///Users/mac/Crucible/ADVERSARIAL_TESTING.md) - Test environments, Foundry commands, and runtime verification parameters.
