# cheapDisperse

Gas-optimized batch ETH and ERC-20 token dispersal contract. Send tokens to hundreds of addresses in a single transaction — cheaper and safer than [disperse.app](https://disperse.app).

## Features

- **Batch ETH transfers** — send ETH to up to 1000 recipients in one tx
- **Batch ERC-20 transfers** — works with standard and non-standard tokens (USDT, etc.)
- **Graceful failure handling** — failed ETH transfers don't revert the batch; failed addresses are returned
- **Excess ETH refund** — overpayment or failed-transfer amounts are automatically returned to sender
- **Gas optimized** — unchecked arithmetic, pre-computed selectors, calldata arrays, cached msg.sender
- **Reentrancy safe** — uses `call{gas: 2300}` to prevent fallback exploitation

## Contracts

| Contract | Description |
|----------|-------------|
| `cheapDisperse.sol` | Main dispersal contract |
| `legacyDisperse.sol` | Baseline comparison (original disperse.app pattern) |

### Deployed Addresses

| Network | Address |
|---------|---------|
| Ethereum | _pending_ |
| Base | _pending_ |
| Arbitrum One | _pending_ |
| Optimism | _pending_ |

## Usage

### Disperse ETH

```solidity
// Send ETH to multiple recipients
cheapDisperse.disperseEther{value: totalAmount}(
    [addr1, addr2, addr3],
    [amount1, amount2, amount3]
);
// Returns: address[] of any failed recipients
```

### Disperse ERC-20 Tokens

```solidity
// First: approve cheapDisperse to spend your tokens
token.approve(cheapDisperseAddress, totalAmount);

// Then: disperse
cheapDisperse.disperseToken(
    tokenAddress,
    [addr1, addr2, addr3],
    [amount1, amount2, amount3]
);
```

## Development

Built with [Scaffold-ETH 2](https://scaffoldeth.io) (Next.js + Hardhat + RainbowKit + wagmi).

### Prerequisites

- Node.js v18+
- Yarn

### Commands

```bash
yarn install          # Install dependencies
yarn chain            # Start local Hardhat network
yarn deploy           # Deploy contracts to local network
yarn start            # Start Next.js frontend (localhost:3000)
yarn hardhat:test     # Run contract tests
```

### Project Structure

```
packages/
├── hardhat/
│   ├── contracts/         # Solidity contracts
│   │   ├── cheapDisperse.sol
│   │   └── legacyDisperse.sol
│   ├── test/              # Hardhat tests (19 tests)
│   └── deploy/            # Deployment scripts
└── nextjs/                # Frontend application
```

### Tests

19 tests covering:
- ETH disperse: happy path, mismatched arrays, zero-value, single recipient
- ERC-20 disperse: happy path, insufficient allowance, transfer failures
- Failed-transfer handling: partial failures, batch continuation
- Gas limits: 10 / 50 / 100 / 500 recipients
- Reentrancy protection: `call{gas: 2300}` prevents fallback exploitation
- Gas benchmarks: cheapDisperse vs legacyDisperse comparison

## License

UNLICENSED
