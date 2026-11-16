import { migrate } from "./migrate";
import { db } from "../src/server/db";
import { hashPassword } from "../src/server/auth-service";
import { ROLES } from "../src/shared/contracts/auth";
if (process.env.NODE_ENV === "production")
  throw new Error("Demo seed is disabled in production.");
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 12)
  throw new Error("Set DEMO_PASSWORD (12+ characters) in .env.local.");
migrate();
const now = new Date().toISOString();
for (const role of ROLES) {
  const name =
    role === "ADMIN"
      ? "Ayu Pratama"
      : role === "SALES_ADMIN"
        ? "Sales Admin Demo"
        : role === "CREDIT_MANAGER"
          ? "Credit Manager Demo"
          : role === "AR"
            ? "AR Specialist Demo"
            : role === "FAM"
              ? "FAM Demo"
              : `${role.charAt(0)}${role.slice(1).toLowerCase()} Demo`;
  db()
    .prepare("INSERT OR IGNORE INTO users VALUES (?,?,?,?,?,1,?,?)")
    .run(
      `usr_${role.toLowerCase()}`,
      name,
      `${role.toLowerCase()}@ultraops.local`,
      role,
      hashPassword(password),
      now,
      now,
    );
}
console.log(
  `Seeded ${ROLES.length} accounts: <role lowercase>@ultraops.local. Existing accounts preserved.`,
);
