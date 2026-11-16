"use client";
import { ROLES, ROLE_LABELS } from "@/shared/contracts/auth";
import { demoUser } from "@/lib/demo/users";
import { CYCLES } from "@/shared/cycles";
import { useDemo } from "@/lib/demo/provider";
import { switchDemoRole } from "@/features/auth/actions";
const descriptions = {
  SYSTEM_ADMIN:
    "Pengguna, peran, izin, dan workspace. Akses bisnis ditetapkan terpisah.",
  OPERATIONS_STAFF:
    "Pesanan, pembelian, penerimaan, dan produksi. QC memiliki tugas tersendiri.",
  FINANCE_STAFF:
    "Kredit, faktur, pembayaran, biaya produksi, dan jurnal penggajian.",
  HR_PAYROLL_STAFF:
    "Data karyawan, onboarding, absensi, KPI, dan perhitungan gaji.",
  MANAGER_APPROVER:
    "Persetujuan PO, periode gaji, umur piutang, dan tinjauan HPP.",
};
export function DemoRolesPanel() {
  const { user } = useDemo();
  return (
    <section className="demo-roles-panel">
      <h2>Lima peran ERP</h2>
      <p>
        Kelola akses berdasarkan peran, siklus, dan tugas. Data gaji dan bank
        individual memerlukan tugas eksplisit.
      </p>
      <div className="demo-roles-grid">
        {ROLES.map((role) => {
          const profile = demoUser(role);
          return (
            <article
              key={role}
              className={
                user.role === role
                  ? "demo-role-card selected"
                  : "demo-role-card"
              }
            >
              <h3>{ROLE_LABELS[role]}</h3>
              <p>{descriptions[role]}</p>
              <small>
                {profile.assignments
                  .map((a) => CYCLES.find((c) => c.key === a.cycle)?.title)
                  .join(" · ") || "Administrasi sistem"}
              </small>
              <form action={switchDemoRole}>
                <input type="hidden" name="role" value={role} />
                <button disabled={user.role === role}>
                  {user.role === role ? "Peran aktif" : "Gunakan peran"}
                </button>
              </form>
            </article>
          );
        })}
      </div>
    </section>
  );
}
