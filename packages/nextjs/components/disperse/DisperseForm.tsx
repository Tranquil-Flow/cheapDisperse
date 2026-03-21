import React, { useState, useCallback, useMemo } from "react";
import { useAccount, useNetwork, useContractWrite, useWaitForTransaction, useContractRead, useBalance } from "wagmi";
import { parseEther, parseUnits, formatEther, formatUnits, isAddress } from "viem";
import RecipientList, { type Recipient } from "./RecipientList";
import TokenSelector, { type TokenMode, type TokenInfo } from "./TokenSelector";
import ResultsPanel from "./ResultsPanel";
import { CHEAP_DISPERSE_ABI, CHEAP_DISPERSE_ADDRESSES, ERC20_ABI } from "~~/lib/contractConfig";

// ─── Helpers ────────────────────────────────────────────────────────────────

function sumAmounts(recipients: Recipient[], decimals: number): bigint {
  let total = 0n;
  for (const r of recipients) {
    try {
      if (r.amount && !isNaN(Number(r.amount)) && Number(r.amount) > 0) {
        total += decimals === 18
          ? parseEther(r.amount)
          : parseUnits(r.amount, decimals);
      }
    } catch {
      // skip invalid
    }
  }
  return total;
}

function recipientsValid(recipients: Recipient[]): boolean {
  if (recipients.length === 0) return false;
  return recipients.every(
    r =>
      isAddress(r.address) &&
      r.amount !== "" &&
      !isNaN(Number(r.amount)) &&
      Number(r.amount) > 0,
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DisperseForm() {
  const { address: userAddress, isConnected } = useAccount();
  const { chain } = useNetwork();

  const [tokenMode, setTokenMode] = useState<TokenMode>("eth");
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  // Track disperse results (failed addresses from ETH disperse)
  const [failedAddresses, setFailedAddresses] = useState<readonly `0x${string}`[]>([]);

  // ── Contract address ───────────────────────────────────────────────────────
  const contractAddress = chain?.id
    ? CHEAP_DISPERSE_ADDRESSES[chain.id]
    : undefined;

  const hasContractAddress =
    contractAddress &&
    contractAddress !== "0x0000000000000000000000000000000000000000";

  // ── Derived values ─────────────────────────────────────────────────────────
  const decimals = tokenMode === "eth" ? 18 : (tokenInfo?.decimals ?? 18);
  const symbol = tokenMode === "eth" ? "ETH" : (tokenInfo?.symbol ?? "");

  const totalAmount = useMemo(
    () => sumAmounts(recipients, decimals),
    [recipients, decimals],
  );

  const formValid =
    recipientsValid(recipients) &&
    recipients.length <= 1000 &&
    !!hasContractAddress &&
    (tokenMode === "eth" || !!tokenInfo);

  // ── ETH balance ────────────────────────────────────────────────────────────
  const { data: ethBalance } = useBalance({ address: userAddress, watch: true });

  // ── Allowance check ────────────────────────────────────────────────────────
  const { data: allowance, refetch: refetchAllowance } = useContractRead({
    address: tokenInfo?.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      userAddress && contractAddress
        ? [userAddress, contractAddress]
        : undefined,
    enabled: tokenMode === "erc20" && !!tokenInfo && !!userAddress && !!contractAddress,
    watch: true,
  });

  const needsApproval =
    tokenMode === "erc20" &&
    !!tokenInfo &&
    formValid &&
    totalAmount > 0n &&
    (allowance === undefined || (allowance as bigint) < totalAmount);

  // ── Approve ────────────────────────────────────────────────────────────────
  const {
    write: approve,
    data: approveTxData,
    isLoading: isApproving,
    error: approveError,
  } = useContractWrite({
    address: tokenInfo?.address,
    abi: ERC20_ABI,
    functionName: "approve",
  });

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransaction({
    hash: approveTxData?.hash,
    onSuccess: () => {
      refetchAllowance();
    },
  });

  // ── Disperse ETH ──────────────────────────────────────────────────────────
  const {
    write: disperseEther,
    data: etherTxData,
    isLoading: isDispersingEther,
    error: etherError,
  } = useContractWrite({
    address: contractAddress,
    abi: CHEAP_DISPERSE_ABI,
    functionName: "disperseEther",
    onSuccess: data => {
      // onSettled will handle result after wait
    },
  });

  const {
    isLoading: isEtherConfirming,
    isSuccess: isEtherSuccess,
    data: etherReceipt,
  } = useWaitForTransaction({
    hash: etherTxData?.hash,
    onSuccess: receipt => {
      // The contract returns failed[] — decode from receipt logs if needed
      // For now we set empty (contract reverts on hard failures)
      setFailedAddresses([]);
    },
  });

  // ── Disperse Token ────────────────────────────────────────────────────────
  const {
    write: disperseToken,
    data: tokenTxData,
    isLoading: isDispersingToken,
    error: tokenError,
  } = useContractWrite({
    address: contractAddress,
    abi: CHEAP_DISPERSE_ABI,
    functionName: "disperseToken",
  });

  const { isLoading: isTokenConfirming, isSuccess: isTokenSuccess } = useWaitForTransaction({
    hash: tokenTxData?.hash,
    onSuccess: () => {
      setFailedAddresses([]);
    },
  });

  // ── Combined states ───────────────────────────────────────────────────────
  const txHash = tokenMode === "eth" ? etherTxData?.hash : tokenTxData?.hash;
  const isConfirming = tokenMode === "eth" ? isEtherConfirming : isTokenConfirming;
  const isSuccess = tokenMode === "eth" ? isEtherSuccess : isTokenSuccess;
  const isSending = isDispersingEther || isDispersingToken;
  const txError = etherError || tokenError;

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleApprove = () => {
    if (!approve || !contractAddress) return;
    // Approve a large amount (max uint256) so user doesn't need to re-approve
    const MAX_UINT256 = 2n ** 256n - 1n;
    approve({ args: [contractAddress, MAX_UINT256] });
  };

  const handleSend = () => {
    const addrs = recipients.map(r => r.address as `0x${string}`);
    const values = recipients.map(r => {
      try {
        return decimals === 18
          ? parseEther(r.amount)
          : parseUnits(r.amount, decimals);
      } catch {
        return 0n;
      }
    });

    setFailedAddresses([]);

    if (tokenMode === "eth") {
      if (!disperseEther) return;
      disperseEther({ args: [addrs, values], value: totalAmount });
    } else {
      if (!disperseToken || !tokenInfo) return;
      disperseToken({ args: [tokenInfo.address, addrs, values] });
    }
  };

  // ── Formatted display values ──────────────────────────────────────────────
  const formattedTotal =
    totalAmount > 0n
      ? decimals === 18
        ? formatEther(totalAmount)
        : formatUnits(totalAmount, decimals)
      : "0";

  const formattedEthBalance = ethBalance
    ? `${Number(formatEther(ethBalance.value)).toFixed(4)} ETH`
    : null;

  const formattedTokenBalance =
    tokenInfo && tokenInfo.balance !== undefined
      ? `${formatUnits(tokenInfo.balance, tokenInfo.decimals)} ${tokenInfo.symbol}`
      : null;

  // ── Insufficient balance check ────────────────────────────────────────────
  const insufficientBalance =
    tokenMode === "eth"
      ? ethBalance && totalAmount > 0n && ethBalance.value < totalAmount
      : tokenInfo && totalAmount > 0n && tokenInfo.balance < totalAmount;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Contract not deployed warning */}
      {chain && !hasContractAddress && (
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            Contract not deployed on <strong>{chain.name}</strong> yet. Update{" "}
            <code className="bg-base-300 px-1 rounded">lib/contractConfig.ts</code> with the deployed address.
          </span>
        </div>
      )}

      {/* ── Token selector ── */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4 sm:p-6">
          <h2 className="card-title text-base">1. Select Token</h2>
          <TokenSelector
            mode={tokenMode}
            tokenInfo={tokenInfo}
            onModeChange={setTokenMode}
            onTokenInfoChange={setTokenInfo}
          />
          {/* Balance display */}
          {isConnected && (
            <div className="text-xs text-base-content/60 mt-1">
              {tokenMode === "eth" && formattedEthBalance && (
                <span>Your balance: {formattedEthBalance}</span>
              )}
              {tokenMode === "erc20" && formattedTokenBalance && (
                <span>Your balance: {formattedTokenBalance}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Recipient list ── */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4 sm:p-6">
          <h2 className="card-title text-base">2. Recipients</h2>
          <RecipientList recipients={recipients} onChange={setRecipients} />

          {recipients.length > 1000 && (
            <div className="alert alert-error mt-2 py-2 px-3 text-sm">
              Maximum 1,000 recipients per transaction. You have {recipients.length}.
            </div>
          )}
        </div>
      </div>

      {/* ── Summary ── */}
      {recipients.length > 0 && (
        <div className="card bg-base-200 shadow">
          <div className="card-body p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-base-content/60">Recipients: </span>
                <span className="font-semibold">{recipients.length}</span>
              </div>
              <div>
                <span className="text-base-content/60">Total: </span>
                <span className="font-semibold">
                  {formattedTotal} {symbol}
                </span>
              </div>
              {insufficientBalance && (
                <div className="text-error font-semibold">⚠ Insufficient balance</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Approve + Send buttons ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Approve button (ERC-20 only) */}
        {tokenMode === "erc20" && tokenInfo && (
          <div className="flex-1">
            {needsApproval ? (
              <button
                type="button"
                className={`btn btn-secondary w-full ${isApproving || isApproveConfirming ? "loading" : ""}`}
                onClick={handleApprove}
                disabled={!formValid || isApproving || isApproveConfirming || isSending}
              >
                {isApproving
                  ? "Approving…"
                  : isApproveConfirming
                  ? "Confirming approval…"
                  : `Approve ${tokenInfo.symbol}`}
              </button>
            ) : formValid && !needsApproval ? (
              <div className="flex items-center gap-2 text-success text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {tokenInfo.symbol} approved
              </div>
            ) : null}
          </div>
        )}

        {/* Send button */}
        <div className="flex-1">
          <button
            type="button"
            className={`btn btn-primary w-full ${isSending || isConfirming ? "loading" : ""}`}
            onClick={handleSend}
            disabled={
              !formValid ||
              isSending ||
              isConfirming ||
              !!insufficientBalance ||
              (tokenMode === "erc20" && needsApproval) ||
              isApproving ||
              isApproveConfirming
            }
          >
            {isSending
              ? "Sending…"
              : isConfirming
              ? "Confirming…"
              : tokenMode === "eth"
              ? `Send ETH to ${recipients.length} recipient${recipients.length !== 1 ? "s" : ""}`
              : `Disperse ${symbol} to ${recipients.length} recipient${recipients.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>

      {/* Approval success notice */}
      {isApproveSuccess && !needsApproval && (
        <div className="alert alert-success py-2 px-3 text-sm">
          ✓ Token approved. You can now send.
        </div>
      )}

      {/* Errors */}
      {(approveError || txError) && (
        <div className="alert alert-error text-sm break-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {(approveError || txError)?.message?.split("\n")[0] ?? "Transaction failed"}
          </span>
        </div>
      )}

      {/* ── Results panel ── */}
      <ResultsPanel
        txHash={txHash}
        isConfirming={isConfirming}
        isSuccess={isSuccess}
        failedAddresses={failedAddresses}
        recipients={recipients}
        totalAmount={totalAmount}
        tokenMode={tokenMode}
        tokenInfo={tokenInfo}
      />
    </div>
  );
}
