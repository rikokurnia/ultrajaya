"use client";
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { DEMO_USERS } from "./users";
import type { User } from "@/shared/contracts/auth";
import { roleSchema } from "@/shared/contracts/auth";
import { validateAssignments } from "@/lib/auth/permissions";
const KEY = "ultrajaya-preview-users-v1",
  EVENT = "ultrajaya-preview-access";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(EVENT, listener);
  };
}
function snapshot() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
const DemoContext = createContext<{
  user: User;
  users: User[];
  saveUsers: (users: User[]) => void;
} | null>(null);
export function DemoProvider({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const users = useMemo(() => {
    try {
      const parsed = JSON.parse(raw || "null");
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (u) =>
            u &&
            typeof u.id === "string" &&
            typeof u.name === "string" &&
            typeof u.email === "string" &&
            typeof u.active === "boolean" &&
            roleSchema.safeParse(u.role).success &&
            Array.isArray(u.assignments) &&
            validateAssignments(u.role, u.assignments),
        )
      )
        return parsed as User[];
    } catch {}
    return DEMO_USERS;
  }, [raw]);
  const current = users.find((u) => u.id === user.id) || user;
  function saveUsers(next: User[]) {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  }
  return (
    <DemoContext.Provider value={{ user: current, users, saveUsers }}>
      {children}
    </DemoContext.Provider>
  );
}
export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("DemoProvider is required.");
  return context;
}
