import React, { useState, useCallback, useEffect } from "react";
import { isAddress } from "viem";

export type Recipient = {
  address: string;
  amount: string;
};

export type RecipientListProps = {
  recipients: Recipient[];
  onChange: (recipients: Recipient[]) => void;
};

type ManualRow = {
  id: number;
  address: string;
  amount: string;
};

type ValidationError = {
  index: number;
  field: "address" | "amount";
  message: string;
};

function validateRecipients(recipients: Recipient[]): ValidationError[] {
  const errors: ValidationError[] = [];
  recipients.forEach((r, i) => {
    if (r.address && !isAddress(r.address)) {
      errors.push({ index: i, field: "address", message: "Invalid address" });
    }
    if (r.amount && (isNaN(Number(r.amount)) || Number(r.amount) <= 0)) {
      errors.push({ index: i, field: "amount", message: "Must be a positive number" });
    }
  });
  return errors;
}

function parsePasteText(text: string): { parsed: Recipient[]; errors: string[] } {
  const lines = text.split("\n").filter(l => l.trim());
  const parsed: Recipient[] = [];
  const errors: string[] = [];

  lines.forEach((line, idx) => {
    // Support: "address,amount" or "address amount" or "address\tamount"
    const trimmed = line.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/[\s,\t]+/);
    if (parts.length < 2) {
      errors.push(`Line ${idx + 1}: expected "address amount", got "${trimmed}"`);
      return;
    }

    const [addr, ...rest] = parts;
    const amt = rest.join(""); // in case there are spaces in the amount (shouldn't be)

    parsed.push({ address: addr.trim(), amount: amt.trim() });
  });

  return { parsed, errors };
}

export default function RecipientList({ recipients, onChange }: RecipientListProps) {
  const [mode, setMode] = useState<"paste" | "manual">("paste");
  const [pasteText, setPasteText] = useState("");
  const [pasteErrors, setPasteErrors] = useState<string[]>([]);
  const [manualRows, setManualRows] = useState<ManualRow[]>([
    { id: 1, address: "", amount: "" },
  ]);
  const [nextId, setNextId] = useState(2);

  // Sync paste mode -> parent
  const handlePasteChange = useCallback(
    (text: string) => {
      setPasteText(text);
      const { parsed, errors } = parsePasteText(text);
      setPasteErrors(errors);
      onChange(parsed);
    },
    [onChange],
  );

  // Sync manual rows -> parent
  useEffect(() => {
    if (mode === "manual") {
      const valid = manualRows.map(r => ({ address: r.address, amount: r.amount }));
      onChange(valid);
    }
  }, [manualRows, mode, onChange]);

  const handleModeSwitch = (newMode: "paste" | "manual") => {
    setMode(newMode);
    if (newMode === "manual") {
      // Pre-populate manual rows from paste if any
      if (pasteText.trim()) {
        const { parsed } = parsePasteText(pasteText);
        if (parsed.length > 0) {
          const rows: ManualRow[] = parsed.map((r, i) => ({
            id: i + 1,
            address: r.address,
            amount: r.amount,
          }));
          setManualRows(rows);
          setNextId(parsed.length + 1);
          return;
        }
      }
      setManualRows([{ id: 1, address: "", amount: "" }]);
      setNextId(2);
    } else {
      // Pre-populate paste from manual rows
      if (manualRows.some(r => r.address || r.amount)) {
        const text = manualRows
          .filter(r => r.address || r.amount)
          .map(r => `${r.address},${r.amount}`)
          .join("\n");
        setPasteText(text);
        handlePasteChange(text);
      }
    }
  };

  const addRow = () => {
    setManualRows(prev => [...prev, { id: nextId, address: "", amount: "" }]);
    setNextId(n => n + 1);
  };

  const removeRow = (id: number) => {
    setManualRows(prev => {
      const next = prev.filter(r => r.id !== id);
      return next.length === 0 ? [{ id: nextId, address: "", amount: "" }] : next;
    });
    if (manualRows.length === 1) setNextId(n => n + 1);
  };

  const updateRow = (id: number, field: "address" | "amount", value: string) => {
    setManualRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const validationErrors = validateRecipients(
    mode === "manual"
      ? manualRows.map(r => ({ address: r.address, amount: r.amount }))
      : recipients,
  );

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Input mode:</span>
        <div className="join">
          <button
            type="button"
            className={`join-item btn btn-sm ${mode === "paste" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => handleModeSwitch("paste")}
          >
            Paste
          </button>
          <button
            type="button"
            className={`join-item btn btn-sm ${mode === "manual" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => handleModeSwitch("manual")}
          >
            Manual
          </button>
        </div>
        {recipients.length > 0 && (
          <span className="badge badge-neutral ml-auto">{recipients.length} recipient{recipients.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {mode === "paste" ? (
        <div>
          <label className="label">
            <span className="label-text text-xs text-base-content/60">
              One per line: <code className="bg-base-300 px-1 rounded">0xAddress, amount</code> or{" "}
              <code className="bg-base-300 px-1 rounded">0xAddress amount</code>
            </span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full font-mono text-sm h-48 resize-y"
            placeholder={"0xAbc123...def456, 1.5\n0x987fed...cba123, 0.25\n0x111aaa...222bbb, 10.0"}
            value={pasteText}
            onChange={e => handlePasteChange(e.target.value)}
          />
          {pasteErrors.length > 0 && (
            <div className="mt-2 space-y-1">
              {pasteErrors.map((err, i) => (
                <div key={i} className="alert alert-warning py-1 px-3 text-xs">
                  {err}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-base-content/60 px-1">
            <span>Address</span>
            <span>Amount</span>
            <span></span>
          </div>
          {manualRows.map((row, idx) => {
            const addrErr = validationErrors.find(e => e.index === idx && e.field === "address");
            const amtErr = validationErrors.find(e => e.index === idx && e.field === "amount");
            return (
              <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                <div>
                  <input
                    type="text"
                    className={`input input-bordered input-sm w-full font-mono text-xs ${addrErr ? "input-error" : ""}`}
                    placeholder="0x..."
                    value={row.address}
                    onChange={e => updateRow(row.id, "address", e.target.value)}
                  />
                  {addrErr && (
                    <p className="text-error text-xs mt-0.5">{addrErr.message}</p>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    className={`input input-bordered input-sm w-full ${amtErr ? "input-error" : ""}`}
                    placeholder="0.0"
                    value={row.amount}
                    onChange={e => updateRow(row.id, "amount", e.target.value)}
                  />
                  {amtErr && (
                    <p className="text-error text-xs mt-0.5">{amtErr.message}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost btn-square text-error"
                  onClick={() => removeRow(row.id)}
                  title="Remove row"
                >
                  ✕
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="btn btn-sm btn-outline btn-primary w-full"
            onClick={addRow}
          >
            + Add Recipient
          </button>
        </div>
      )}

      {/* Global validation summary */}
      {validationErrors.length > 0 && mode === "manual" && (
        <div className="alert alert-error py-2 px-3 text-sm">
          {validationErrors.length} validation error{validationErrors.length !== 1 ? "s" : ""} — fix before sending
        </div>
      )}
    </div>
  );
}
