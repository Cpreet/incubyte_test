import { Database } from "bun:sqlite";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

export type AppDatabase = Database;

const defaultDatabasePath = resolve(import.meta.dir, "../data/dev.sqlite");
const allowedFrequencies = "'annual', 'monthly', 'one_time'";
const allowedCurrencies = "'USD', 'EUR', 'GBP', 'INR', 'SGD'";

export function openDatabase(path = process.env.DATABASE_PATH ?? defaultDatabasePath) {
  if (path !== ":memory:") {
    mkdirSync(dirname(resolve(path)), { recursive: true });
  }

  const db = new Database(path);
  db.exec("PRAGMA foreign_keys = ON");
  initializeSchema(db);
  return db;
}

export function initializeSchema(db: AppDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS compensation_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      native_currency TEXT NOT NULL CHECK (native_currency IN (${allowedCurrencies})),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      country TEXT NOT NULL,
      currency TEXT NOT NULL CHECK (currency IN (${allowedCurrencies}))
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS org_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      name TEXT NOT NULL,
      job_id INTEGER NOT NULL,
      location_id INTEGER NOT NULL,
      org_unit_id INTEGER NOT NULL,
      level TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      compensation_package_id INTEGER NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      FOREIGN KEY (location_id) REFERENCES locations(id),
      FOREIGN KEY (org_unit_id) REFERENCES org_units(id),
      FOREIGN KEY (compensation_package_id) REFERENCES compensation_packages(id)
    );

    CREATE TABLE IF NOT EXISTS salary_component_definitions (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS salary_components (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL CHECK (amount >= 0),
      currency TEXT NOT NULL CHECK (currency IN (${allowedCurrencies})),
      frequency TEXT NOT NULL CHECK (frequency IN (${allowedFrequencies})),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (package_id) REFERENCES compensation_packages(id) ON DELETE CASCADE,
      FOREIGN KEY (type) REFERENCES salary_component_definitions(code)
    );

    CREATE TABLE IF NOT EXISTS pay_ranges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job TEXT NOT NULL,
      location TEXT NOT NULL,
      level TEXT NOT NULL,
      currency TEXT NOT NULL CHECK (currency IN (${allowedCurrencies})),
      min_amount INTEGER NOT NULL CHECK (min_amount >= 0),
      max_amount INTEGER NOT NULL CHECK (max_amount >= min_amount),
      UNIQUE (job, location, level)
    );

    CREATE TABLE IF NOT EXISTS fx_rates (
      currency TEXT PRIMARY KEY CHECK (currency IN (${allowedCurrencies})),
      rate_to_usd REAL NOT NULL CHECK (rate_to_usd > 0)
    );

    CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
    CREATE INDEX IF NOT EXISTS idx_employees_job_id ON employees(job_id);
    CREATE INDEX IF NOT EXISTS idx_employees_location_id ON employees(location_id);
    CREATE INDEX IF NOT EXISTS idx_employees_org_unit_id ON employees(org_unit_id);
    CREATE INDEX IF NOT EXISTS idx_employees_level ON employees(level);
    CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
    CREATE INDEX IF NOT EXISTS idx_employees_compensation_package_id ON employees(compensation_package_id);
    CREATE INDEX IF NOT EXISTS idx_components_package_id ON salary_components(package_id);
    CREATE INDEX IF NOT EXISTS idx_components_type ON salary_components(type);
    INSERT OR IGNORE INTO salary_component_definitions (code, name, description, created_at)
    VALUES
      ('base', 'Base salary', 'Core recurring salary component.', '2026-07-01T00:00:00.000Z'),
      ('allowance', 'Allowance', 'Recurring allowance component.', '2026-07-01T00:00:00.000Z'),
      ('bonus', 'Bonus', 'One-time or variable bonus component.', '2026-07-01T00:00:00.000Z');
  `);
}

export function resetDatabase(db: AppDatabase) {
  db.exec(`
    DELETE FROM salary_components;
    DELETE FROM employees;
    DELETE FROM compensation_packages;
    DELETE FROM locations;
    DELETE FROM jobs;
    DELETE FROM org_units;
    DELETE FROM pay_ranges;
    DELETE FROM fx_rates;
    DELETE FROM salary_component_definitions;
    DELETE FROM sqlite_sequence WHERE name IN (
      'employees',
      'compensation_packages',
      'locations',
      'jobs',
      'org_units',
      'salary_components',
      'pay_ranges'
    );
  `);
  initializeSchema(db);
}
