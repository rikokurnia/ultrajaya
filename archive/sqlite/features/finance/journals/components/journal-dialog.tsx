"use client";

import { useState } from "react";
import { Plus, Check, RotateCcw, AlertTriangle, BookOpen } from "lucide-react";
import { recordJournalAction, postJournalAction, reverseJournalAction } from "../../actions";
import { formatCurrency } from "@/shared/format";

export function CreateJournalButton({
  accounts,
}: {
  accounts: { id: string; code: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lines, setLines] = useState([
    { accountId: accounts[0]?.id || "", description: "Debit line", debit: 10000000, credit: 0 },
    { accountId: accounts[1]?.id || "", description: "Credit line", debit: 0, credit: 10000000 },
  ]);

  const totalDebit = lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isBalanced) {
      setError("Journal must be balanced: total Debits must equal total Credits.");
      return;
    }
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const date = form.get("date") as string;
    const description = form.get("description") as string;
    const sourceDocumentRef = form.get("sourceDocumentRef") as string;

    const res = await recordJournalAction({
      date,
      description,
      sourceDocumentRef,
      lines: lines.map((l) => ({
        accountId: l.accountId,
        description: l.description,
        debit: Number(l.debit) * 100, // to minor units
        credit: Number(l.credit) * 100,
      })),
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error);
    } else {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0755c9] text-white hover:bg-[#1675e8] shadow-sm transition-all"
      >
        <Plus size={14} />
        <span>New Journal Entry</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#d6e7fa] shadow-2xl max-w-2xl w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#e2edfa] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="text-[#0755c9]" size={20} />
                <h3 className="text-base font-bold text-[#102b55]">
                  Record General Ledger Journal
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-xs font-bold text-[#7485a3] hover:text-[#102b55]"
              >
                ✕ Close
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#52658a] mb-1 block">
                    Posting Date
                  </label>
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue="2026-10-29"
                    className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 text-[#102b55]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-[#52658a] mb-1 block">
                    Source Document Ref
                  </label>
                  <input
                    name="sourceDocumentRef"
                    type="text"
                    placeholder="e.g. INV-SP-1028-087 / BANK-TRX-01"
                    className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 text-[#102b55]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#52658a] mb-1 block">
                  Description
                </label>
                <input
                  name="description"
                  type="text"
                  required
                  placeholder="e.g. Month-end inventory adjustment or raw materials accrual"
                  className="w-full text-xs border border-[#d6e7fa] rounded-lg p-2 text-[#102b55]"
                />
              </div>

              {/* Journal Lines */}
              <div className="border border-[#e2edfa] rounded-xl overflow-hidden mt-2">
                <div className="bg-[#f8fbff] text-[#52658a] font-semibold text-xs grid grid-cols-12 gap-2 p-2 border-b border-[#e2edfa]">
                  <div className="col-span-4">Account</div>
                  <div className="col-span-4">Line Memo</div>
                  <div className="col-span-2 text-right">Debit (Rp)</div>
                  <div className="col-span-2 text-right">Credit (Rp)</div>
                </div>

                <div className="divide-y divide-[#edf4fc] p-2 flex flex-col gap-2">
                  {lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-4">
                        <select
                          value={line.accountId}
                          onChange={(e) => {
                            const newLines = [...lines];
                            newLines[idx].accountId = e.target.value;
                            setLines(newLines);
                          }}
                          className="w-full text-xs border border-[#d6e7fa] rounded-lg p-1.5"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => {
                            const newLines = [...lines];
                            newLines[idx].description = e.target.value;
                            setLines(newLines);
                          }}
                          placeholder="Memo..."
                          className="w-full text-xs border border-[#d6e7fa] rounded-lg p-1.5"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={line.debit}
                          onChange={(e) => {
                            const newLines = [...lines];
                            newLines[idx].debit = Number(e.target.value);
                            setLines(newLines);
                          }}
                          className="w-full text-xs border border-[#d6e7fa] rounded-lg p-1.5 text-right font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={line.credit}
                          onChange={(e) => {
                            const newLines = [...lines];
                            newLines[idx].credit = Number(e.target.value);
                            setLines(newLines);
                          }}
                          className="w-full text-xs border border-[#d6e7fa] rounded-lg p-1.5 text-right font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#f8fbff] text-xs font-bold text-[#102b55] grid grid-cols-12 gap-2 p-2.5 border-t border-[#e2edfa]">
                  <div className="col-span-8">Total</div>
                  <div className="col-span-2 text-right font-mono">
                    Rp {totalDebit.toLocaleString()}
                  </div>
                  <div className="col-span-2 text-right font-mono">
                    Rp {totalCredit.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                {isBalanced ? (
                  <span className="text-[#087747] font-semibold flex items-center gap-1">
                    <Check size={14} />
                    <span>Journal is balanced</span>
                  </span>
                ) : (
                  <span className="text-[#b42336] font-semibold flex items-center gap-1">
                    <AlertTriangle size={14} />
                    <span>Out of balance: diff Rp {Math.abs(totalDebit - totalCredit).toLocaleString()}</span>
                  </span>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#d6e7fa] text-[#52658a]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !isBalanced}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#0755c9] text-white hover:bg-[#1675e8] disabled:opacity-50"
                  >
                    {loading ? "Recording..." : "Record Journal"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function JournalActions({
  journalId,
  status,
}: {
  journalId: string;
  status: "DRAFT" | "POSTED" | "REVERSED";
}) {
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    setLoading(true);
    await postJournalAction(journalId);
    setLoading(false);
  };

  const handleReverse = async () => {
    const reason = prompt("Enter reversal reason:");
    if (!reason) return;
    setLoading(true);
    await reverseJournalAction(journalId, reason);
    setLoading(false);
  };

  if (status === "DRAFT") {
    return (
      <button
        onClick={handlePost}
        disabled={loading}
        className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#e6f9ed] text-[#15803d] hover:bg-[#cbf4d8]"
      >
        Post
      </button>
    );
  }

  if (status === "POSTED") {
    return (
      <button
        onClick={handleReverse}
        disabled={loading}
        className="px-2 py-0.5 rounded text-[11px] font-semibold text-red-600 hover:text-red-800"
      >
        Reverse
      </button>
    );
  }

  return <span className="text-[11px] text-gray-400">Archived</span>;
}
