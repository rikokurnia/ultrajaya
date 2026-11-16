import type {
  ReactNode,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
} from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CalendarDays, Inbox, AlertCircle, Check } from "lucide-react";
import {
  formatCurrency,
  formatQuantity,
  formatDate,
  statusLabel,
} from "@/shared/format";
export const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs));
export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      className={cn("button", `button-${variant}`, className)}
      {...props}
    />
  );
}
export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input", className)} {...props} />;
}
export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("input", className)} {...props} />;
}
export function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("card", className)} {...props}>
      {children}
    </section>
  );
}
export function PageHeader({
  title,
  description,
  actions,
  concept = false,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  concept?: boolean;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-header-meta">
        {concept && <span className="concept">Concept • Simulated Data</span>}
        <span className="header-date">
          <CalendarDays size={20} aria-hidden />
          {formatDate(new Date())}
        </span>
        {actions}
      </div>
    </header>
  );
}
export function TabNavigation({
  items,
  active,
}: {
  items: { path: string; label: string }[];
  active: string;
}) {
  return (
    <nav className="page-tabs" aria-label="Module pages">
      {items.map((item) => (
        <Link
          key={item.path}
          href={item.path}
          aria-current={item.path === active ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";
export function StatusBadge({
  status,
  tone = "neutral",
}: {
  status: string;
  tone?: StatusTone;
}) {
  return <span className={`badge badge-${tone}`}>{statusLabel(status)}</span>;
}
export function KpiCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <Card className="kpi">
      <span className="icon-tile">{icon}</span>
      <div>
        <h2>{label}</h2>
        <strong>{value}</strong>
        {hint && <p>{hint}</p>}
      </div>
    </Card>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="icon-tile">
        <Inbox size={28} aria-hidden />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  state = "ready",
  error,
  retry,
  empty = "Records will appear here when they are available.",
}: {
  columns: { key: string; label: string; render: (row: T) => ReactNode }[];
  rows: T[];
  rowKey: (row: T) => string;
  state?: "ready" | "loading" | "error";
  error?: string;
  retry?: ReactNode;
  empty?: string;
}) {
  if (state === "error")
    return (
      <div role="alert" className="error-state">
        <AlertCircle aria-hidden />
        <h2>Could not load records</h2>
        <p>{error || "Try again or contact your administrator."}</p>
        {retry}
      </div>
    );
  return (
    <div className="table-scroll" aria-busy={state === "loading"}>
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state === "loading"
            ? Array.from({ length: 3 }, (_, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key}>
                      <span className="skeleton" aria-label="Loading" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((c) => (
                    <td key={c.key}>{c.render(row)}</td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      {state === "ready" && !rows.length && (
        <EmptyState title="No records yet" description={empty} />
      )}
    </div>
  );
}
export function ApprovalTimeline({
  steps,
}: {
  steps: {
    id: string;
    name: string;
    description: string;
    status: "pending" | "approved" | "rejected";
  }[];
}) {
  return (
    <ol className="timeline">
      {steps.map((s) => (
        <li key={s.id}>
          <span
            className={`timeline-dot badge-${s.status === "approved" ? "success" : s.status === "rejected" ? "danger" : "neutral"}`}
          >
            {s.status === "approved" ? <Check size={14} aria-hidden /> : null}
          </span>
          <div>
            <strong>{s.name}</strong>
            <p>{s.description}</p>
            <StatusBadge status={s.status} />
          </div>
        </li>
      ))}
    </ol>
  );
}
export function Currency({ minor }: { minor: number }) {
  return <span className="numeric">{formatCurrency(minor)}</span>;
}
export function Quantity({ value, unit }: { value: string; unit: string }) {
  return <span className="numeric">{formatQuantity(value, unit)}</span>;
}
export function DateDisplay({
  value,
  time = false,
}: {
  value: string;
  time?: boolean;
}) {
  return <time dateTime={value}>{formatDate(value, time)}</time>;
}
