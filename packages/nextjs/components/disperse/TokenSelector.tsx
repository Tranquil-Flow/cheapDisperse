import React, { useState } from "react";
import { useContractRead, useAccount } from "wagmi";
import { isAddress, formatUnits } from "viem";
import { ERC20_ABI } from "~~/lib/contractConfig";

export type TokenMode = "eth" | "erc20";

export type TokenInfo = {
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  balance: bigint;
};

type TokenSelectorProps = {
  mode: TokenMode;
  tokenInfo: TokenInfo | null;
  onModeChange: (mode: TokenMode) => void;
  onTokenInfoChange: (info: TokenInfo | null) => void;
};

export default function TokenSelector({
  mode,
  tokenInfo,
  onModeChange,
  onTokenInfoChange,
}: TokenSelectorProps) {
  const { address: userAddress } = useAccount();
  const [tokenInput, setTokenInput] = useState("");
  const [resolvedAddr, setResolvedAddr] = useState<`0x${string}` | null>(null);

  const isValidAddr = isAddress(tokenInput);

  // Fetch token info when address is valid
  const { data: tokenName } = useContractRead({
    address: isValidAddr ? (tokenInput as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "name",
    enabled: isValidAddr,
  });

  const { data: tokenSymbol } = useContractRead({
    address: isValidAddr ? (tokenInput as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "symbol",
    enabled: isValidAddr,
  });

  const { data: tokenDecimals } = useContractRead({
    address: isValidAddr ? (tokenInput as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    enabled: isValidAddr,
  });

  const { data: tokenBalance } = useContractRead({
    address: isValidAddr ? (tokenInput as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    enabled: isValidAddr && !!userAddress,
    watch: true,
  });

  // Propagate token info once loaded
  React.useEffect(() => {
    if (
      mode === "erc20" &&
      isValidAddr &&
      tokenName !== undefined &&
      tokenSymbol !== undefined &&
      tokenDecimals !== undefined
    ) {
      const info: TokenInfo = {
        address: tokenInput as `0x${string}`,
        name: tokenName as string,
        symbol: tokenSymbol as string,
        decimals: tokenDecimals as number,
        balance: (tokenBalance as bigint) ?? 0n,
      };
      onTokenInfoChange(info);
      setResolvedAddr(tokenInput as `0x${string}`);
    } else if (mode === "erc20" && !isValidAddr) {
      onTokenInfoChange(null);
      setResolvedAddr(null);
    }
  }, [tokenName, tokenSymbol, tokenDecimals, tokenBalance, isValidAddr, tokenInput, mode, onTokenInfoChange]);

  const handleModeChange = (newMode: TokenMode) => {
    onModeChange(newMode);
    if (newMode === "eth") {
      onTokenInfoChange(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Token:</span>
        <div className="join">
          <button
            type="button"
            className={`join-item btn btn-sm ${mode === "eth" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => handleModeChange("eth")}
          >
            ETH
          </button>
          <button
            type="button"
            className={`join-item btn btn-sm ${mode === "erc20" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => handleModeChange("erc20")}
          >
            ERC-20
          </button>
        </div>
      </div>

      {/* ERC-20 token address input */}
      {mode === "erc20" && (
        <div className="space-y-2">
          <label className="label py-0">
            <span className="label-text text-sm">Token contract address</span>
          </label>
          <input
            type="text"
            className={`input input-bordered w-full font-mono text-sm ${
              tokenInput && !isValidAddr ? "input-error" : ""
            } ${isValidAddr && tokenInfo ? "input-success" : ""}`}
            placeholder="0x..."
            value={tokenInput}
            onChange={e => {
              setTokenInput(e.target.value.trim());
              if (!isAddress(e.target.value.trim())) {
                onTokenInfoChange(null);
                setResolvedAddr(null);
              }
            }}
          />

          {/* Validation message */}
          {tokenInput && !isValidAddr && (
            <p className="text-error text-xs">Enter a valid ERC-20 contract address (0x + 40 hex chars)</p>
          )}

          {/* Token info badge */}
          {isValidAddr && tokenInfo && (
            <div className="flex flex-wrap gap-2 items-center mt-1">
              <div className="badge badge-success gap-1 py-3">
                <span className="font-bold">{tokenInfo.symbol}</span>
                <span className="text-xs opacity-80">— {tokenInfo.name}</span>
              </div>
              <div className="badge badge-neutral py-3 text-xs">
                {tokenDecimals !== undefined ? `${tokenDecimals} decimals` : ""}
              </div>
              {userAddress && tokenBalance !== undefined && tokenDecimals !== undefined && (
                <div className="badge badge-outline py-3 text-xs">
                  Balance: {formatUnits(tokenBalance as bigint, tokenDecimals as number)} {tokenInfo.symbol}
                </div>
              )}
            </div>
          )}

          {/* Loading state */}
          {isValidAddr && !tokenInfo && (
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <span className="loading loading-spinner loading-xs"></span>
              Loading token info…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
