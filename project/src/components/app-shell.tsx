"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  House,
  FileText,
  Settings,
  ChevronDown,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import type { User } from "@/shared/contracts/auth";
import { can } from "@/lib/auth/permissions";
import { CYCLES } from "@/shared/cycles";
import { Brand } from "./brand";
import { signOut } from "@/features/auth/actions";
import styles from "./foundation.module.css";

function Navigation({ user, close }: { user: User; close?: () => void }) {
  const path = usePathname();
  const items = [
    { path: "/dashboard", label: "Dashboard", icon: House, visible: true },
    { path: "/reports", label: "Laporan", icon: FileText, visible: true },
    {
      path: "/settings",
      label: "Pengaturan",
      icon: Settings,
      visible: can(user, "users:manage"),
    },
  ];
  return (
    <>
      <div className={styles.brand}>
        <Brand />
      </div>
      <nav className={styles.navigation} aria-label="Navigasi utama">
        {items
          .filter((item) => item.visible)
          .map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={close}
              aria-current={
                path.startsWith(item.path) ||
                (item.path === "/dashboard" && path.startsWith("/cycles/"))
                  ? "page"
                  : undefined
              }
            >
              <item.icon size={29} strokeWidth={1.8} aria-hidden />
              {item.label}
            </Link>
          ))}
      </nav>
    </>
  );
}
export function AppShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const activeCycle = CYCLES.find((cycle) => path.startsWith(cycle.path));
  const role =
    user.role === "ADMIN"
      ? "Admin"
      : user.role === "AUDITOR"
        ? "Auditor"
        : user.role.charAt(0) +
          user.role.slice(1).toLowerCase().replaceAll("_", " ");
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Navigation user={user} />
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger
              className={`icon-button ${styles.mobileMenu}`}
              aria-label="Buka navigasi"
            >
              <Menu size={24} />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="dialog-overlay" />
              <Dialog.Content className={styles.mobileSidebar}>
                <Dialog.Title className="sr-only">Navigasi utama</Dialog.Title>
                <Dialog.Description className="sr-only">
                  Dashboard, Laporan, dan Pengaturan.
                </Dialog.Description>
                <Dialog.Close
                  className={`icon-button ${styles.close}`}
                  aria-label="Tutup navigasi"
                >
                  <X size={22} />
                </Dialog.Close>
                <Navigation user={user} close={() => setOpen(false)} />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          {activeCycle && (
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link href="/dashboard">Dashboard</Link>
              <span aria-hidden>/</span>
              <span aria-current="page">{activeCycle.title}</span>
            </nav>
          )}
          <details
            className={styles.userMenu}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.currentTarget.open = false;
                e.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary>
              <span className={styles.avatar}>{role.charAt(0)}</span>
              <span>{role}</span>
              <ChevronDown size={23} aria-hidden />
            </summary>
            <div className={styles.userPopover}>
              <strong>{user.name}</strong>
              <p>{user.email}</p>
              <form action={signOut}>
                <button type="submit">
                  <LogOut size={18} aria-hidden />
                  Keluar
                </button>
              </form>
            </div>
          </details>
        </header>
        <main id="main-content" className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
