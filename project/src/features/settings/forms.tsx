"use client";
import { useActionState } from "react";
import { ROLES, type User } from "@/shared/contracts/auth";
import { addUser, changeAccess } from "./actions";
import { Button, Field, Input, Select } from "@/components/ui";
export function NewUserForm() {
  const [state, action, pending] = useActionState(addUser, {});
  return (
    <form action={action} className="admin-form" aria-busy={pending}>
      <h2>Tambah pengguna</h2>
      <p>
        Setiap pengguna memiliki satu peran. Admin tidak memiliki otorisasi
        persetujuan bisnis.
      </p>
      <Field id="name" label="Nama lengkap">
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
        />
      </Field>
      <Field id="new-email" label="Email">
        <Input
          id="new-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </Field>
      <Field id="new-role" label="Peran">
        <Select id="new-role" name="role">
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
      </Field>
      <Field id="new-password" label="Kata sandi awal">
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={256}
        />
        <small>Gunakan minimal 12 karakter.</small>
      </Field>
      {state.error && (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="success-state" role="status">
          {state.success}
        </p>
      )}
      <Button disabled={pending}>
        {pending ? "Membuat…" : "Tambah pengguna"}
      </Button>
    </form>
  );
}
export function AccessForm({ user, self }: { user: User; self: boolean }) {
  const [state, action, pending] = useActionState(changeAccess, {});
  return (
    <form action={action} className="access-form" aria-busy={pending}>
      <input type="hidden" name="id" value={user.id} />
      <label className="sr-only" htmlFor={`role-${user.id}`}>
        Peran untuk {user.name}
      </label>
      <Select
        id={`role-${user.id}`}
        name="role"
        defaultValue={user.role}
        disabled={self || pending}
      >
        {ROLES.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </Select>
      <label className="checkbox-label">
        <input
          type="checkbox"
          name="active"
          defaultChecked={user.active}
          disabled={self || pending}
        />
        Aktif
      </label>
      <Button variant="secondary" disabled={self || pending}>
        {self ? "Akun Anda" : pending ? "Menyimpan…" : "Simpan akses"}
      </Button>
      {state.error && (
        <span role="alert" className="field-error">
          {state.error}
        </span>
      )}
      {state.success && (
        <span role="status" className="success-state">
          {state.success}
        </span>
      )}
    </form>
  );
}
