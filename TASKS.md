# Milestone: Phase 1 — Harden & Deploy

## Tasks
- [ ] Write comprehensive tests for cheapDisperse.sol (edge cases, gas limits, failed transfers)
- [ ] Compare gas usage against legacyDisperse.sol with benchmarks
- [ ] Add array length max limit enforcement (ArrayLengthOverMaxLimit error exists but isn't used)
- [ ] Deploy to mainnet or L2 (currently Scaffold-ETH default only)
- [ ] Update README.md with project-specific documentation (currently generic Scaffold-ETH 2 README)

## Notes for Claude
cheapDisperse is a gas-optimized batch token/ETH disperse contract (similar to disperse.app). It's built on a Scaffold-ETH 2 fork with Hardhat + Next.js. The core contract is `packages/hardhat/contracts/cheapDisperse.sol` with a comparison contract `legacyDisperse.sol`. The contract uses low-level `call{gas: 2300}` for ETH transfers and returns failed addresses rather than reverting. Use `yarn` as the package manager (Scaffold-ETH 2 convention).
