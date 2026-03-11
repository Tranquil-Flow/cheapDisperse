# cheapDisperse

A gas-optimised Solidity contract for dispersing ETH and ERC-20 tokens to multiple addresses in a single transaction. Free, open-source, no middleman — cheaper than disperse.app.

## Why It Exists

Sending ETH or ERC-20 tokens to many addresses (e.g., payroll, airdrops, community distributions) normally requires one transaction per recipient. cheapDisperse batches all transfers into one tx. The gas savings compound significantly at scale.

## How It Works

- `disperseEther(addresses[], amounts[])` — batch ETH transfers using `call{gas: 2300}` to prevent reentrancy
- `disperseToken(token, addresses[], amounts[])` — batch ERC-20 transfers
- Returns failed addresses instead of reverting — graceful degradation
- `calldata` arrays for gas efficiency

## Comparison Baseline

`legacyDisperse.sol` — the original disperse.app approach, kept for gas benchmarking side-by-side.

## Tech Stack

- **Contracts**: Solidity, Hardhat, Scaffold-ETH 2
- **Frontend**: Next.js, RainbowKit, Wagmi, Tailwind
- **Package manager**: yarn
- **Testing**: Hardhat test suite

## Phased Roadmap

### Phase 1: Polish & Deploy ← CURRENT
Tests, gas benchmarks, mainnet deploy, frontend polish, hosted dApp. The core contract is already working — this phase makes it production-ready.

### Phase 2: Multi-Chain + Features
Deploy to all major L2s (Base, Arbitrum, Optimism, Polygon). Add ERC-721 batch transfer support. Add a CSV import flow in the frontend (paste or upload recipient list). Add ENS name resolution for recipients.

### Phase 3: Discovery & Community
Register on token tools directories (Dune dashboards, DefiLlama), submit to BreadchainCoop gas tools ecosystem. Community-contributed chain deployments. Gas comparison dashboard vs disperse.app with live benchmarks.

## Version Map

| Version | Scope | Status |
|---------|-------|--------|
| V0 | Core contract working (MVP) | Complete |
| V1 | Tested, deployed, hosted dApp | In progress |
| V2 | Multi-chain, extended token support, CSV import | Future |
| V3 | Community ecosystem, discovery, usage analytics | Future |
