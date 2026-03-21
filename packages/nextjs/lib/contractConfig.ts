// Contract config for cheapDisperse
// Update CHEAP_DISPERSE_ADDRESSES with deployed contract addresses

export const CHEAP_DISPERSE_ABI = [
  {
    type: "function",
    name: "disperseEther",
    stateMutability: "payable",
    inputs: [
      { name: "recipients", type: "address[]" },
      { name: "values", type: "uint256[]" },
    ],
    outputs: [{ name: "failed", type: "address[]" }],
  },
  {
    type: "function",
    name: "disperseToken",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "recipients", type: "address[]" },
      { name: "values", type: "uint256[]" },
    ],
    outputs: [],
  },
  // Custom errors
  {
    type: "error",
    name: "ArrayLengthMismatch",
    inputs: [],
  },
  {
    type: "error",
    name: "ArrayLengthOverMaxLimit",
    inputs: [],
  },
  {
    type: "error",
    name: "EtherTransferFailed",
    inputs: [],
  },
  {
    type: "error",
    name: "TokenTransferFailed",
    inputs: [],
  },
] as const;

// Update these addresses after deploying on each network
export const CHEAP_DISPERSE_ADDRESSES: { [chainId: number]: `0x${string}` } = {
  31337: "0x0000000000000000000000000000000000000000", // Hardhat local — update after deploy
  1: "0x0000000000000000000000000000000000000000",    // Ethereum mainnet — update after deploy
  5: "0x0000000000000000000000000000000000000000",    // Goerli — update after deploy
  11155111: "0x0000000000000000000000000000000000000000", // Sepolia — update after deploy
  137: "0x0000000000000000000000000000000000000000",   // Polygon — update after deploy
  42161: "0x0000000000000000000000000000000000000000", // Arbitrum — update after deploy
  10: "0x0000000000000000000000000000000000000000",   // Optimism — update after deploy
  8453: "0x0000000000000000000000000000000000000000", // Base — update after deploy
};

export const ERC20_ABI = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
