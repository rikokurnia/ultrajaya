"use client";
import { useState } from "react";
import {
  ROLES,
  ROLE_LABELS,
  userSchema,
  type User,
  type Role,
  type CycleAssignment,
} from "@/shared/contracts/auth";
import {
  DUTY_CATALOG,
  isEligible,
  validateAssignments,
} from "@/lib/auth/permissions";
import { CYCLES } from "@/shared/cycles";
import { useDemo } from "@/lib/demo/provider";
import { Button, Field, Input, Select } from "@/components/ui";
export function NewUserForm() {
  const { users, saveUsers } = useDemo();
  const [message, setMessage] = useState("");
  function submit(form: FormData) {
    const parsed = userSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      setMessage(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    if (users.some((u) => u.email === parsed.data.email)) {
      setMessage("Email sudah digunakan.");
      return;
    }
    const now = new Date().toISOString();
    saveUsers([
      ...users,
      {
        ...parsed.data,
        id: crypto.randomUUID(),
        active: true,
        assignments: [],
        createdAt: now,
        updatedAt: now,
      },
    ]);
    setMessage(
      "Pengguna ditambahkan. Atur siklus dan tugas melalui Kelola akses.",
    );
  }
  return (
    <form action={submit} className="admin-form">
      <Field id="name" label="Nama lengkap">
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          autoComplete="name"
        />
      </Field>
      <Field id="new-email" label="Email">
        <Input
          id="new-email"
          name="email"
          required
          type="email"
          autoComplete="email"
        />
      </Field>
      <Field id="new-role" label="Peran">
        <Select id="new-role" name="role">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </Field>
      <p role="status">{message}</p>
      <Button>Tambah pengguna</Button>
    </form>
  );
}
export function AccessForm({ user, self }: { user: User; self: boolean }) {
  const { users, saveUsers } = useDemo();
  const [role, setRole] = useState<Role>(user.role);
  const [active, setActive] = useState(user.active);
  const [assignments, setAssignments] = useState<CycleAssignment[]>(
    user.assignments,
  );
  const [message, setMessage] = useState("");
  function toggle(
    cycle: CycleAssignment["cycle"],
    duty: string,
    checked: boolean,
  ) {
    setAssignments((old) => {
      const current = old.find((a) => a.cycle === cycle)?.duties || [];
      const next = checked
        ? [...new Set([...current, "cycle:read", duty])]
        : duty === "cycle:read"
          ? []
          : current.filter((d) => d !== duty);
      return [
        ...old.filter((a) => a.cycle !== cycle),
        { cycle, duties: next },
      ].filter((a) => a.duties.length);
    });
  }
  function save() {
    if (!validateAssignments(role, assignments)) {
      setMessage("Ada tugas yang tidak sesuai dengan peran.");
      return;
    }
    saveUsers(
      users.map((u) =>
        u.id === user.id
          ? {
              ...u,
              role,
              active,
              assignments,
              updatedAt: new Date().toISOString(),
            }
          : u,
      ),
    );
    setMessage("Akses pengguna diperbarui.");
  }
  return (
    <form action={save} className="admin-form">
      <p className="demo-notice">Tetapkan peran, siklus, dan tugas pengguna.</p>
      <Field id={`role-${user.id}`} label="Peran">
        <Select
          id={`role-${user.id}`}
          value={role}
          disabled={self}
          onChange={(e) => {
            setRole(e.target.value as Role);
            setAssignments([]);
          }}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </Field>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={active}
          disabled={self}
          onChange={(e) => setActive(e.target.checked)}
        />
        Aktif
      </label>
      {CYCLES.map((cycle) => {
        const duties = DUTY_CATALOG.filter(
          (d) => d.cycle === cycle.key && isEligible(role, cycle.key, d.key),
        );
        return (
          <fieldset className="duty-fieldset" key={cycle.key}>
            <legend>{cycle.title}</legend>
            {duties.map((d) => (
              <label key={d.key} className="duty-option">
                <input
                  type="checkbox"
                  checked={assignments.some(
                    (a) => a.cycle === cycle.key && a.duties.includes(d.key),
                  )}
                  onChange={(e) => toggle(cycle.key, d.key, e.target.checked)}
                />
                <span>{d.label}</span>
              </label>
            ))}
          </fieldset>
        );
      })}
      <p role="status">{message}</p>
      <Button>Simpan akses</Button>
    </form>
  );
}
