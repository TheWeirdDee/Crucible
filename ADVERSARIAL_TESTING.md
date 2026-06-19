# Adversarial Testing

## Purpose

Adversarial testing in Crucible is defined as **agents attacking contracts**, not tests validating agent behavior. The goal is to verify code security by attempting to execute real exploits against smart contracts deployed on a live local ledger. If an attack succeeds, a vulnerability is confirmed. If the attack fails (reverts) against a modified contract, the security patch is validated.

---

## Test Environment

All adversarial tests run in a controlled local environment to ensure speed, predictability, and safety:
*   **Local Ledger**: Anvil (Foundry’s local Ethereum node) is run as a background service. It simulates an EVM environment and exposes an RPC interface at `http://127.0.0.1:8545`.
*   **State Setup**: At the start of each test or script execution, Anvil is funded with a starting balance. The target vault contract is deployed and pre-funded with `100 ETH`.
*   **Why Local Forks**: Local testnets provide complete reproducibility, zero transaction gas costs, instant block confirmation times, and isolate code from mainnet risk.

---

## Target Contract Test Suite

Crucible includes two test suites written in Solidity using `forge-std`. These verify the vulnerable and hardened states of [VaultStaking.vulnerable.sol](file:///Users/mac/Crucible/contracts/src/VaultStaking.vulnerable.sol).

### 1. Reentrancy Test Suite ([Reentrancy.t.sol](file:///Users/mac/Crucible/contracts/test/Reentrancy.t.sol))

*   **Test Case**: `testDrain()`
    *   **Proves**: A reentrant call to `withdraw()` can bypass balance updates, draining the vault.
    *   **Expected Outcome**: Vault balance is reduced to `0 ETH`, and the attacker contract balance increases.
    *   **Run Command**:
        ```bash
        cd contracts
        forge test --match-test testDrain -vv
        ```
    *   **Execution Trace**: Shows the attacker contract calling `withdraw()`, receiving funds, triggering its fallback function, re-entering `withdraw()`, and completing the drain.
*   **Test Case**: `testHardenedBlocksReentrancy()`
    *   **Proves**: The secure contract blocks re-entry and preserves vault funds.
    *   **Expected Outcome**: The transaction reverts on the second `withdraw()` call. Vault balance remains at `100 ETH`.
    *   **Run Command**:
        ```bash
        cd contracts
        forge test --match-test testHardenedBlocksReentrancy -vv
        ```
    *   **Execution Trace**: Displays the transaction reverting with a `reentrant` error message.

### 2. Access Control Test Suite ([AccessControl.t.sol](file:///Users/mac/Crucible/contracts/test/AccessControl.t.sol))

*   **Test Case**: `testUnauthorizedDrain()`
    *   **Proves**: An unauthorized user can call the `emergencyDrain()` function.
    *   **Expected Outcome**: Vault balance is reduced to `0 ETH`, and the attacker address receives `100 ETH`.
    *   **Run Command**:
        ```bash
        cd contracts
        forge test --match-test testUnauthorizedDrain -vv
        ```
    *   **Execution Trace**: Shows the transaction completing successfully when called from a non-owner address.
*   **Test Case**: `testHardenedBlocksUnauthorizedDrain()`
    *   **Proves**: The hardened contract rejects unauthorized calls to administrative functions.
    *   **Expected Outcome**: The transaction reverts with `not owner`. Vault balance remains at `100 ETH`.
    *   **Run Command**:
        ```bash
        cd contracts
        forge test --match-test testHardenedBlocksUnauthorizedDrain -vv
        ```
    *   **Execution Trace**: Displays the transaction reverting with a `"not owner"` reason.

---

## Dynamic Exploit Generation (MaliciousVault.sol)

In a live audit, the attacker contract [MaliciousVault.sol](file:///Users/mac/Crucible/contracts/src/MaliciousVault.sol) is generated dynamically by the `@Crucible-ReentrancySpec` agent.

### Structure of a Generated Exploit:
1.  **Fallback Function**: A `receive() payable` or `fallback()` function that intercepts incoming ETH transfers and calls `withdraw()` recursively.
2.  **State Tracker**: Conditional logic to stop the recursion once the target contract is drained.
3.  **Deposit Call**: An initial `deposit()` call to set a non-zero balance mapping in the target vault.

### Compilation Mechanics:
*   The agent writes the generated Solidity code directly to [MaliciousVault.sol](file:///Users/mac/Crucible/contracts/src/MaliciousVault.sol) on the local disk.
*   When the python tool runner invokes the `forge` command, the Foundry compiler recompiles the modified source directory on the fly.
*   The contract is compiled and deployed to the local Anvil fork within the same script execution, without requiring pre-compilation.

---

## Round Result Verification

The `@Crucible-Judge` agent acts as the coordinator and parses test results to determine state changes:

```
  ┌────────────────────────────────────────────────────────┐
  │                   Run Forge Command                    │
  └───────────────────────────┬────────────────────────────┘
                              ▼
                  ┌───────────────────────┐
                  │    Read Exit Code     │
                  └───────────┬───────────┘
            ┌─────────────────┴─────────────────┐
            │ Exit Code = 0                     │ Exit Code != 0
            ▼                                   ▼
┌───────────────────────┐           ┌───────────────────────┐
│     Parse stdout      │           │     Parse stderr      │
└───────────┬───────────┘           └───────────┬───────────┘
      ┌─────┴────────┐                          │
      │ "[PASS]"     │ "LANDED"                 │ "revert"
      ▼              ▼                          ▼
┌───────────┐  ┌───────────┐              ┌───────────┐
│  BLOCKED  │  │  LANDED   │              │  BLOCKED  │
└───────────┘  └───────────┘              └───────────┘
```

1.  **Exploit Verification**:
    *   The Judge runs the exploit script. If the script exit code is `0` and the output JSON shows the balance was drained (e.g., `vault_after: "0 ETH"`), the Judge records the round status as `LANDED`.
2.  **Patch Verification**:
    *   The Judge runs the re-attack test. If the exit code is `0` and stdout contains `[PASS]` (proving the test expecting a revert succeeded), the Judge records the round status as `BLOCKED`.

---

## Playback Mode Testing

To run the audit suite inside continuous integration (CI) environments without managing live model providers:
1.  Set the environment variable:
    ```bash
    export NEXT_PUBLIC_STREAM_MODE=playback
    ```
2.  The client app reads the recorded log file [crucible-demo.json](file:///Users/mac/Crucible/data/crucible-demo.json).
3.  The test runner asserts that all message outputs, transaction hashes, and final verdict states match the expected schema defined in [verdict.schema.json](file:///Users/mac/Crucible/data/verdict.schema.json).

---

## Extending the Attack Corpus

Crucible's architecture can be extended to support new vulnerability classes (e.g., Flash Loan attacks):
1.  **Register Specialist**: Deploy a new specialist agent (e.g., `Crucible-FlashSpec`) and register its ID and capabilities with the Band network.
2.  **Update Coordinator**: Modify `@Crucible-RedLead`’s prompts to query for the new specialist capability when scanning target contracts.
3.  **Write Fixtures**: Add target contracts containing the new vulnerability type and write a corresponding test fixture inside the `contracts/test` directory.
4.  **No Core Changes**: The Judge agent and the verdict schema require no modifications; they continue to track and report the additional round outcomes dynamically.

---

## See Also

*   [README.md](file:///Users/mac/Crucible/README.md) - Project overview, local environment variables, and LLM routes.
*   [ARCHITECTURE.md](file:///Users/mac/Crucible/ARCHITECTURE.md) - System layout, Band APIs, and message flows.
*   [SECURITY.md](file:///Users/mac/Crucible/SECURITY.md) - Threat models, vulnerability specifications, and patch logic.
