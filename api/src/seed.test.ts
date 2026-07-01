import { describe, expect, test } from "bun:test";
import { seedDatabase } from "./seed";
import { employeeCompHash, testDatabase } from "./test-helpers";

describe("seedDatabase", () => {
  test("API-SEED-001 seeds 10000 employees", () => {
    const db = testDatabase();
    seedDatabase(db, { count: 10_000 });

    const row = db.query("SELECT COUNT(*) AS count FROM employees").get() as { count: number };
    expect(row.count).toBe(10_000);
  }, 15_000);

  test("API-SEED-002 is deterministic", () => {
    const db1 = testDatabase();
    const db2 = testDatabase();
    seedDatabase(db1, { count: 100 });
    seedDatabase(db2, { count: 100 });

    expect(employeeCompHash(db1)).toEqual(employeeCompHash(db2));
  });

  test("API-SEED-003 every package has a base component", () => {
    const db = testDatabase();
    seedDatabase(db, { count: 100 });

    const missing = db
      .query(
        `
          SELECT COUNT(*) AS count
          FROM employees e
          WHERE NOT EXISTS (
            SELECT 1 FROM salary_components sc
            WHERE sc.package_id = e.compensation_package_id AND sc.type = 'base'
          )
        `,
      )
      .get() as { count: number };

    expect(missing.count).toBe(0);
  });

  test("API-SEED-004 spans multiple jobs and locations", () => {
    const db = testDatabase();
    seedDatabase(db, { count: 100 });

    const jobs = db.query("SELECT COUNT(DISTINCT job_id) AS count FROM employees").get() as { count: number };
    const locations = db.query("SELECT COUNT(DISTINCT location_id) AS count FROM employees").get() as { count: number };

    expect(jobs.count).toBeGreaterThan(1);
    expect(locations.count).toBeGreaterThan(1);
  });

  test("API-SEED-005 seeds fx rates and pay ranges", () => {
    const db = testDatabase();
    seedDatabase(db, { count: 10 });

    const fx = db.query("SELECT COUNT(*) AS count FROM fx_rates").get() as { count: number };
    const ranges = db.query("SELECT COUNT(*) AS count FROM pay_ranges").get() as { count: number };

    expect(fx.count).toBeGreaterThan(0);
    expect(ranges.count).toBeGreaterThan(0);
  });
});
