"use client";
import { useState } from "react";
import { UserRound, UsersRound, Layers, Search, Plus } from "lucide-react";
import type { User } from "@/shared/contracts/auth";
import { canViewCycle } from "@/lib/auth/permissions";
import { ROLE_LABELS } from "@/shared/contracts/auth";
import { CYCLES } from "@/shared/cycles";
import { useDemo } from "@/lib/demo/provider";
import { DetailDrawer } from "@/components/ui/overlays";
import { AccessForm, NewUserForm } from "./forms";
import styles from "@/components/foundation.module.css";
function cycleAccess(user: User) {
  return (
    CYCLES.filter((c) => canViewCycle(user, c.key))
      .map((c) => c.title)
      .join(", ") || "Belum ditetapkan"
  );
}
export function SettingsView({ actor: serverActor }: { actor: User }) {
  const { user: actor, users } = useDemo();
  void serverActor;
  const [tab, setTab] = useState("users");
  const [search, setSearch] = useState("");
  const filtered = users.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section>
      <header className={styles.banner}>
        <h1>Pengaturan</h1>
      </header>
      <div className={styles.settingsLayout}>
        <nav className={styles.settingsNav} aria-label="Pengaturan">
          {[
            { key: "profile", label: "Profil Saya", icon: UserRound },
            { key: "users", label: "Pengguna & Akses", icon: UsersRound },
            { key: "workspace", label: "Workspace", icon: Layers },
          ].map((item) => (
            <button
              type="button"
              key={item.key}
              aria-pressed={tab === item.key}
              onClick={() => setTab(item.key)}
            >
              <item.icon aria-hidden />
              {item.label}
            </button>
          ))}
        </nav>
        <div className={styles.settingsBody}>
          <h2>
            {tab === "users"
              ? "Pengguna & Akses"
              : tab === "profile"
                ? "Profil Saya"
                : "Workspace"}
          </h2>
          {tab === "users" ? (
            <>
              <div className={styles.settingsToolbar}>
                <label className={styles.userSearch}>
                  <Search aria-hidden />
                  <span className="sr-only">Cari nama atau email</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama atau email"
                  />
                </label>
                <DetailDrawer
                  trigger={
                    <button className={styles.addUser}>
                      <Plus size={26} aria-hidden />
                      Tambah pengguna
                    </button>
                  }
                  title="Tambah pengguna"
                  description=""
                >
                  <NewUserForm />
                </DetailDrawer>
              </div>
              <div className={styles.userTable}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Pengguna</th>
                      <th scope="col">Peran</th>
                      <th scope="col">Akses Siklus</th>
                      <th scope="col">Status</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <strong>{user.name}</strong>
                          <p>{user.email}</p>
                        </td>
                        <td>{ROLE_LABELS[user.role]}</td>
                        <td>
                          <span className={styles.pill}>
                            {cycleAccess(user)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`${styles.pill} ${user.active ? styles.activePill : styles.inactivePill}`}
                          >
                            {user.active ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td>
                          <DetailDrawer
                            trigger={<button>Kelola akses</button>}
                            title={user.name}
                            description={user.email}
                          >
                            <AccessForm
                              user={user}
                              self={user.id === actor.id}
                            />
                          </DetailDrawer>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : tab === "profile" ? (
            <div className={styles.settingsProfile}>
              <strong>{actor.name}</strong>
              <p>{actor.email}</p>
              <p>{ROLE_LABELS[actor.role]}</p>
            </div>
          ) : (
            <div className={styles.settingsTabBlank} />
          )}
        </div>
      </div>
    </section>
  );
}
