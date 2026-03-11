# cheapDisperse — Claude Context

## Project Type
Gas-optimized batch token/ETH disperse contract (like disperse.app but cheaper). Already at MVP.

## Structure
Scaffold-ETH 2 monorepo: `packages/hardhat/` (contracts, tests, deploy), `packages/nextjs/` (frontend).

## Package Manager
Use `yarn` — this is a Scaffold-ETH 2 project. Do not use bun or npm.

## Key Contracts
- `cheapDisperse.sol` — Core contract. Batch ETH and ERC20 transfers with gas optimization.
- `legacyDisperse.sol` — Comparison/baseline contract for gas benchmarking.
- `ERC20.sol` — Test token.

## Commands
- `yarn chain` — Start local Hardhat network
- `yarn deploy` — Deploy contracts
- `yarn start` — Start Next.js frontend
- `yarn hardhat:test` — Run contract tests

## Design Decisions
- Uses `call{gas: 2300}` for ETH transfers (prevents reentrancy from fallback functions)
- Returns failed addresses instead of reverting (graceful degradation)
- Uses `calldata` arrays for gas efficiency

## Gas Optimization Resources
- gas-killer-analyzer: https://github.com/BreadchainCoop/gas-killer-analyzer
- gas-killer-solidity: https://github.com/BreadchainCoop/gas-killer-solidity
- gaskiller.xyz: https://gaskiller.xyz/
