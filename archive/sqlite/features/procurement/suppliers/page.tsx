import { Search, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { procurementService } from "../service";
import { CreateSupplierDialog } from "../components/supplier-dialog";
import { DEMO_POLICIES } from "../policies";

export async function SuppliersPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const search = resolvedParams.search;

  const user = await requireUser("/procurement/suppliers");
  const suppliersPage = await procurementService.listSuppliers(user, {
    search,
    limit: 100,
  });

  const canWrite = can(user, "suppliers:write");

  return (
    <div className="flex flex-col gap-5">
      {/* Policy Notice Box */}
      <div className="p-4 bg-[#f0f6fd] border border-[#d6e7fa] rounded-xl text-xs text-[#102b55] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <strong className="text-sm font-bold text-[#0755c9] block">
            Supplier Qualification &amp; Risk Governance Framework
          </strong>
          <span className="text-[#52658a]">
            Vendors undergo multi-criteria audits covering quality certification, manufacturing scale, on-time delivery reliability, and financial risk.
          </span>
        </div>
        <span className="badge badge-info text-xs py-1 px-3 whitespace-nowrap font-semibold">
          ISO &amp; Halal Validated
        </span>
      </div>

      {/* Main Suppliers Table Card */}
      <div className="card p-5 border border-[#d6e7fa] bg-white shadow-sm rounded-xl flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#102b55]">
              Supplier Records &amp; Evaluations
            </h2>
            <p className="text-xs text-[#52658a] mt-0.5">
              Approved vendor master records, legal compliance documents, and supply chain ratings.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <form method="GET" className="flex items-center gap-2">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7485a3]"
                />
                <input
                  name="search"
                  type="search"
                  defaultValue={search}
                  placeholder="Search code, name, or email..."
                  className="input text-xs pl-8.5 pr-3 py-1.5 h-9 w-44 sm:w-60"
                />
              </div>
              <button type="submit" className="sr-only">
                Search
              </button>
            </form>
            {canWrite && <CreateSupplierDialog />}
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="table-scroll border border-[#d6e7fa] rounded-lg overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-[#f5f9ff] text-[#52658a] font-semibold border-b border-[#d6e7fa]">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Code</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Company name</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Contact email</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Tax ID (NPWP)</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Rating</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Qualification</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Legal validity</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Risk level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf5ff]">
              {suppliersPage.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[#52658a]">
                    No suppliers found matching query.
                  </td>
                </tr>
              ) : (
                suppliersPage.items.map((sup) => (
                  <tr key={sup.id} className="hover:bg-[#fafcff]">
                    <td className="py-2.5 px-3 font-semibold text-[#0755c9] whitespace-nowrap">
                      {sup.code}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#102b55] whitespace-nowrap">
                      {sup.name}
                    </td>
                    <td className="py-2.5 px-3 text-[#52658a] whitespace-nowrap">
                      {sup.email}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#52658a] whitespace-nowrap">
                      {sup.taxId || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-[#102b55] whitespace-nowrap">
                      ★ {sup.rating || "5.0"}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {sup.qualificationStatus === "QUALIFIED" ? (
                        <span className="badge badge-success text-[11px] py-0.5 px-2 flex items-center gap-1">
                          <CheckCircle size={11} /> Qualified
                        </span>
                      ) : sup.qualificationStatus === "PENDING" ? (
                        <span className="badge badge-warning text-[11px] py-0.5 px-2 flex items-center gap-1">
                          <Clock size={11} /> Pending Audit
                        </span>
                      ) : (
                        <span className="badge badge-danger text-[11px] py-0.5 px-2 flex items-center gap-1">
                          <AlertCircle size={11} /> Expired
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[#52658a] whitespace-nowrap">
                      {sup.legalDocValidUntil || "Active"}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {sup.riskLevel === "LOW" ? (
                        <span className="badge badge-info text-[10px] py-0.5 px-2">Low Risk</span>
                      ) : sup.riskLevel === "MEDIUM" ? (
                        <span className="badge badge-warning text-[10px] py-0.5 px-2">Medium Risk</span>
                      ) : (
                        <span className="badge badge-danger text-[10px] py-0.5 px-2">High Risk</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-[#52658a] pt-1">
          Showing {suppliersPage.items.length} of {suppliersPage.total} approved vendors
        </div>
      </div>

      {/* Multi-Criteria Evaluation Policy Card (Demo Configuration) */}
      <div className="card p-5 border border-[#d6e7fa] bg-white shadow-sm rounded-xl flex flex-col gap-3 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#102b55]">
            Supplier Multi-Criteria Evaluation Weights
          </h3>
          <span className="badge badge-neutral text-[11px] py-0.5 px-2">
            Demo Configuration
          </span>
        </div>
        <p className="text-[#52658a]">
          Every supplier proposal is scored objectively across six weighted dimensions to prevent single-attribute bias:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-1">
          {DEMO_POLICIES.supplierEvaluationCriteria.map((c) => (
            <div
              key={c.id}
              className="p-3 bg-[#f8fbff] border border-[#d6e7fa] rounded-lg flex flex-col gap-1"
            >
              <div className="flex justify-between items-center">
                <strong className="text-[#102b55] font-semibold">{c.name}</strong>
                <span className="badge badge-info text-xs py-0 px-2 font-bold">{c.weight}%</span>
              </div>
              <p className="text-[#52658a] text-[11px] mt-0.5">{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
