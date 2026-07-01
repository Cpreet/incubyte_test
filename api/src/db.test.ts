import { describe, expect, test } from "bun:test";
import { openDatabase } from "./db";
import { seedDatabase } from "./seed";
import { handleRequest } from "./server";
import { testDatabase } from "./test-helpers";

const requiredIndexes = [
  "idx_employees_employee_id",
  "idx_employees_job_id",
  "idx_employees_location_id",
  "idx_employees_org_unit_id",
  "idx_employees_level",
  "idx_employees_compensation_package_id",
  "idx_components_package_id",
];

describe("schema constraints", () => {
  test("API-SCHEMA-001 rejects component with invalid package_id", () => {
    const db = testDatabase();
    const now = "2026-07-01T00:00:00.000Z";

    expect(() => {
      db.query(
        `
          INSERT INTO salary_components (package_id, type, amount, currency, frequency, created_at, updated_at)
          VALUES (99999, 'base', 100, 'USD', 'annual', ?, ?)
        `,
      ).run(now, now);
    }).toThrow();
  });

  test("API-SCHEMA-002 rejects unknown component type", () => {
    const db = testDatabase();
    const now = "2026-07-01T00:00:00.000Z";
    const packageId = (
      db.query("INSERT INTO compensation_packages (native_currency, created_at) VALUES ('USD', ?) RETURNING id").get(
        now,
      ) as { id: number }
    ).id;

    expect(() => {
      db.query(
        `
          INSERT INTO salary_components (package_id, type, amount, currency, frequency, created_at, updated_at)
          VALUES (?, 'unknown_type', 100, 'USD', 'annual', ?, ?)
        `,
      ).run(packageId, now, now);
    }).toThrow();
  });

  test("API-SCHEMA-003 rejects invalid currency", () => {
    const db = testDatabase();
    const now = "2026-07-01T00:00:00.000Z";
    const packageId = (
      db.query("INSERT INTO compensation_packages (native_currency, created_at) VALUES ('USD', ?) RETURNING id").get(
        now,
      ) as { id: number }
    ).id;

    expect(() => {
      db.query(
        `
          INSERT INTO salary_components (package_id, type, amount, currency, frequency, created_at, updated_at)
          VALUES (?, 'base', 100, 'JPY', 'annual', ?, ?)
        `,
      ).run(packageId, now, now);
    }).toThrow();
  });

  test("API-SCHEMA-004 rejects invalid frequency", () => {
    const db = testDatabase();
    const now = "2026-07-01T00:00:00.000Z";
    const packageId = (
      db.query("INSERT INTO compensation_packages (native_currency, created_at) VALUES ('USD', ?) RETURNING id").get(
        now,
      ) as { id: number }
    ).id;

    expect(() => {
      db.query(
        `
          INSERT INTO salary_components (package_id, type, amount, currency, frequency, created_at, updated_at)
          VALUES (?, 'base', 100, 'USD', 'weekly', ?, ?)
        `,
      ).run(packageId, now, now);
    }).toThrow();
  });
});

describe("indexes", () => {
  test("API-PERF-001 required indexes exist", () => {
    const db = testDatabase();
    const indexes = db.query("SELECT name FROM sqlite_master WHERE type = 'index'").all() as Array<{ name: string }>;
    const names = new Set(indexes.map((index) => index.name));

    for (const indexName of requiredIndexes) {
      expect(names.has(indexName)).toBe(true);
    }
  });

  test("API-PERF-002 list and summary stay under 2s on 10k seed", async () => {
    const db = openDatabase(":memory:");
    seedDatabase(db, { count: 10_000 });

    const start = performance.now();
    await handleRequest(new Request("http://localhost/employees?location=Berlin&pageSize=50"), db);
    await handleRequest(new Request("http://localhost/analytics/summary"), db);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(2000);
  }, 20_000);
});
