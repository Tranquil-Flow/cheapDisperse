# Milestone: Phase 1 — Polish & Deploy

## Commands
- `yarn chain` — start local Hardhat node
- `yarn deploy` — deploy contracts
- `yarn hardhat:test` — run tests
- `yarn start` — Next.js frontend on localhost:3000

## Key Files
- `packages/hardhat/contracts/cheapDisperse.sol` — main contract
- `packages/hardhat/contracts/legacyDisperse.sol` — gas comparison baseline
- `packages/hardhat/test/` — write tests here
- `packages/nextjs/` — frontend

## Tasks

### Tests
- [x] Write ETH disperse tests: happy path, mismatched array lengths, zero-value transfers, single recipient
- [x] Write ERC-20 disperse tests: happy path, insufficient allowance, transfer-from failures
- [x] Write failed-transfer tests: verify failed addresses returned correctly, rest of batch continues
- [x] Write gas limit edge case tests: 10 / 50 / 100 / 500 recipients
- [x] Write reentrancy test: confirm `call{gas: 2300}` prevents fallback exploitation
- [x] Gas comparison benchmark: `cheapDisperse` vs `legacyDisperse` for 10 / 50 / 100 / 500 recipients — output results as table in test output

### Contract Hardening
- [x] Enforce array length max limit — `ArrayLengthOverMaxLimit` error is defined but not wired; add the check with a sensible cap
- [x] Run gas-killer-analyzer against `cheapDisperse.sol` and apply recommended optimisations (see CLAUDE.md for links)
- [x] Verify `disperseToken` handles non-standard ERC-20 tokens safely (USDT-style no-return-value transfers)
- [x] Add events: `EtherDispersed` and `TokenDispersed` for off-chain indexing
- [x] Add `disperseEtherEqual` / `disperseTokenEqual` — single value for all recipients (saves calldata gas)
- [x] Add `disperseEtherFast` — assembly ETH transfer, reverts on failure (max gas efficiency for EOA recipients)
- [x] Fix 3 test failures (old artifact names in GasTest.ts, remove obsolete cheapDisperse.test.js)

### Deployment
- [!] Deploy `cheapDisperse.sol` to Ethereum mainnet  <!-- BLOCKED: needs funded deployer wallet -->
- [!] Deploy to Base  <!-- BLOCKED: needs funded deployer wallet -->
- [!] Deploy to Arbitrum One  <!-- BLOCKED: needs funded deployer wallet -->
- [!] Deploy to Optimism  <!-- BLOCKED: needs funded deployer wallet -->
- [!] Document all deployment addresses in `packages/hardhat/deployments/`  <!-- BLOCKED: needs funded deployer wallet -->

### Frontend
- [x] Replace Scaffold-ETH 2 template README with project-specific documentation
- [x] Build recipient list input: paste `address,amount` pairs (one per line) or add rows manually
- [x] Build token selector: ETH toggle or ERC-20 address input with symbol/balance lookup
- [x] Add total amount preview before sending
- [x] Add post-send result: show success count and list any failed recipients
- [x] Wire up all deployed contract addresses — auto-switch on wallet network change
- [x] Mobile-responsive layout
- [ ] Deploy frontend to Vercel

## Phase 2 Preview
Multi-chain expansion (Polygon, zkSync Era), CSV file upload, ERC-721 batch transfer, ENS resolution. TASKS.md for Phase 2 written when Phase 1 ships.
