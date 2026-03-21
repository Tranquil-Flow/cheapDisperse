import React from "react";
import { formatEther, formatUnits } from "viem";
import { useNetwork } from "wagmi";
import type { Recipient } from "./RecipientList";
import type { TokenInfo } from "./TokenSelector";

type ResultsPanelProps = {
  txHash: `0x${string}` | undefined;
  isConfirming: boolean;
  isSuccess: boolean;
  failedAddresses: readonly `0x${string}`[];
  recipients: Recipient[];
  totalAmount: bigint;
  tokenMode: "eth" | "erc20";
  tokenInfo: TokenInfo | null;
};

function getExplorerBaseUrl(chainId: number | undefined): string {
  switch (chainId) {
    case 1:
      return "https://etherscan.io";
    case 5:
      return "https://goerli.etherscan.io";
    case 11155111:
      return "https://sepolia.etherscan.io";
    case 137:
      return "https://polygonscan.com";
    case 42161:
      return "https://arbiscan.io";
    case 10:
      return "https://optimistic.etherscan.io";
    case 8453:
      return "https://basescan.org";
    default:
      return "";
  }
}

export default function ResultsPanel({
  txHash,
  isConfirming,
  isSuccess,
  failedAddresses,
  recipients,
  totalAmount,
  tokenMode,
  tokenInfo,
}: ResultsPanelProps) {
  const { chain } = useNetwork();

  if (!txHash) return null;

  const explorerBase = getExplorerBaseUrl(chain?.id);
  const successCount = recipients.length - failedAddresses.length;
  const decimals = tokenMode === "eth" ? 18 : (tokenInfo?.decimals ?? 18);
  const symbol = tokenMode === "eth" ? "ETH" : (tokenInfo?.symbol ?? "tokens");

  const formattedTotal =
    tokenMode === "eth"
      ? formatEther(totalAmount)
      : formatUnits(totalAmount, decimals);

  // Build a map of failed address -> amount
  const failedSet = new Set(failedAddresses.map(a => a.toLowerCase()));
  const failedWithAmounts = recipients.filter(r => failedSet.has(r.address.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Confirming state */}
      {isConfirming && (
        <div className="alert">
          <span className="loading loading-spinner loading-sm"></span>
          <span>Transaction submitted. Waiting for confirmation…</span>
        </div>
      )}

      {/* Success / partial success */}
      {isSuccess && (
        <>
          {failedAddresses.length === 0 ? (
            <div className="alert alert-success">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold">All transfers successful!</p>
                <p className="text-sm">
                  {successCount} recipient{successCount !== 1 ? "s" : ""} received {formattedTotal} {symbol}
                </p>
              </div>
            </div>
          ) : (
            <div className="alert alert-warning">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold">Partial success</p>
                <p className="text-sm">
                  {successCount} succeeded, {failedAddresses.length} failed
                </p>
              </div>
            </div>
          )}

          {/* Summary stats */}
          <div className="stats stats-vertical sm:stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-title">Recipients</div>
              <div className="stat-value text-2xl">{recipients.length}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Successful</div>
              <div className="stat-value text-2xl text-success">{successCount}</div>
            </div>
            {failedAddresses.length > 0 && (
              <div className="stat">
                <div className="stat-title">Failed</div>
                <div className="stat-value text-2xl text-error">{failedAddresses.length}</div>
              </div>
            )}
            <div className="stat">
              <div className="stat-title">Total Sent</div>
              <div className="stat-value text-xl">{formattedTotal}</div>
              <div className="stat-desc">{symbol}</div>
            </div>
          </div>

          {/* Failed addresses table */}
          {failedWithAmounts.length > 0 && (
            <div className="card bg-base-200">
              <div className="card-body p-4">
                <h3 className="card-title text-error text-base">Failed Transfers</h3>
                <p className="text-xs text-base-content/60 mb-2">
                  These addresses did not receive funds. You may retry them.
                </p>
                <div className="overflow-x-auto">
                  <table className="table table-xs">
                    <thead>
                      <tr>
                        <th>Address</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failedWithAmounts.map((r, i) => (
                        <tr key={i}>
                          <td className="font-mono text-xs">{r.address}</td>
                          <td className="text-right">
                            {r.amount} {symbol}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Transaction hash link */}
      {txHash && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-base-content/60">Tx:</span>
          {explorerBase ? (
            <a
              href={`${explorerBase}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary font-mono text-xs truncate"
            >
              {txHash}
            </a>
          ) : (
            <span className="font-mono text-xs break-all">{txHash}</span>
          )}
        </div>
      )}
    </div>
  );
}
