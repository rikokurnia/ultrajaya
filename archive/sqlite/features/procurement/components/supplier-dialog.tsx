"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X, AlertCircle } from "lucide-react";
import { createSupplierAction } from "../actions";

export function CreateSupplierDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const [code, setCode] = useState("SUP-006");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+62 21 ");
  const [taxId, setTaxId] = useState("");
  const [qualificationStatus, setQualificationStatus] = useState<"QUALIFIED" | "PENDING" | "EXPIRED">("QUALIFIED");
  const [riskLevel, setRiskLevel] = useState<"LOW" | "MEDIUM" | "HIGH">("LOW");
  const [legalDocValidUntil, setLegalDocValidUntil] = useState("2027-12-31");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const res = await createSupplierAction({
        code,
        name,
        email,
        phone,
        taxId,
        qualificationStatus,
        riskLevel,
        legalDocValidUntil,
        active: true,
      });
      if (!res.success) {
        setError(res.error);
      } else {
        setOpen(false);
        setName("");
        setEmail("");
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="button button-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold"
        >
          <Plus size={16} />
          Add Supplier
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="drawer max-w-lg">
          <div className="flex items-center justify-between pb-3 border-b border-[#d6e7fa]">
            <div>
              <Dialog.Title className="text-lg font-bold text-[#102b55]">
                New Supplier Record
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[#52658a]">
                Register a validated vendor with legal and qualification credentials.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="icon-button text-[#52658a] hover:text-[#102b55]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {error && (
            <div className="p-3 my-2 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="sup-code" className="font-semibold text-[#102b55]">
                  Supplier Code
                </label>
                <input
                  id="sup-code"
                  type="text"
                  className="input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="sup-name" className="font-semibold text-[#102b55]">
                  Company Name
                </label>
                <input
                  id="sup-name"
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. PT Mitra Logistik Utama"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="sup-email" className="font-semibold text-[#102b55]">
                  Primary Contact Email
                </label>
                <input
                  id="sup-email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="commercial@vendor.co.id"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="sup-phone" className="font-semibold text-[#102b55]">
                  Phone
                </label>
                <input
                  id="sup-phone"
                  type="text"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="sup-tax" className="font-semibold text-[#102b55]">
                  Tax ID (NPWP)
                </label>
                <input
                  id="sup-tax"
                  type="text"
                  className="input"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="01.234.567.8-000.000"
                />
              </div>
              <div className="field">
                <label htmlFor="sup-legal" className="font-semibold text-[#102b55]">
                  Legal Document Validity
                </label>
                <input
                  id="sup-legal"
                  type="date"
                  className="input"
                  value={legalDocValidUntil}
                  onChange={(e) => setLegalDocValidUntil(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="sup-qual" className="font-semibold text-[#102b55]">
                  Qualification Status
                </label>
                <select
                  id="sup-qual"
                  className="input"
                  value={qualificationStatus}
                  onChange={(e) =>
                    setQualificationStatus(
                      e.target.value as "QUALIFIED" | "PENDING" | "EXPIRED",
                    )
                  }
                >
                  <option value="QUALIFIED">Qualified</option>
                  <option value="PENDING">Pending Audit</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="sup-risk" className="font-semibold text-[#102b55]">
                  Supply Risk Rating
                </label>
                <select
                  id="sup-risk"
                  className="input"
                  value={riskLevel}
                  onChange={(e) =>
                    setRiskLevel(e.target.value as "LOW" | "MEDIUM" | "HIGH")
                  }
                >
                  <option value="LOW">Low Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="HIGH">High Risk</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#d6e7fa] mt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={isPending}
                  className="button button-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isPending}
                className="button button-primary text-xs py-2 px-4"
              >
                {isPending ? "Creating..." : "Save Supplier"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
