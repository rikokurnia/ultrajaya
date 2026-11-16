CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role TEXT NOT NULL CHECK(role IN (
    'ADMIN','PRODUCTION','WAREHOUSE','PURCHASING','APPROVER','QC','AP','TREASURY','ACCOUNTING','AUDITOR',
    'SALES_ADMIN','CREDIT_MANAGER','AR','FAM'
  )),
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO users_new (id, name, email, role, password_hash, active, created_at, updated_at)
SELECT id, name, email, role, password_hash, active, created_at, updated_at FROM users;

DROP TABLE users;

ALTER TABLE users_new RENAME TO users;
