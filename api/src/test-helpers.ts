import type { AppDatabase } from "./db";
import { openDatabase } from "./db";

export function testDatabase() {
  return openDatabase(":memory:");
}

export function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function insertGoldenPackageEmployee(db: AppDatabase) {
  const now = "2026-07-01T00:00:00.000Z";
  const jobId = (db.query("INSERT INTO jobs (name) VALUES (?) RETURNING id").get("Software Engineer") as { id: number }).id;
  const locationId = (
    db.query("INSERT INTO locations (name, country, currency) VALUES (?, ?, ?) RETURNING id").get(
      "Berlin",
      "Germany",
      "EUR",
    ) as { id: number }
  ).id;
  const orgUnitId = (db.query("INSERT INTO org_units (name) VALUES (?) RETURNING id").get("Engineering") as { id: number })
    .id;
  const packageId = (
    db.query("INSERT INTO compensation_packages (native_currency, created_at) VALUES (?, ?) RETURNING id").get(
      "EUR",
      now,
    ) as { id: number }
  ).id;

  db.query(
    `
      INSERT INTO employees (
        employee_id, first_name, last_name, name, job_id, location_id,
        org_unit_id, level, status, compensation_package_id, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `,
  ).run("E-GOLD", "Gold", "Fixture", "Gold Fixture", jobId, locationId, orgUnitId, "L3", packageId, now);

  const insertComponent = db.query(`
    INSERT INTO salary_components (package_id, type, amount, currency, frequency, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertComponent.run(packageId, "base", 12_000_000, "EUR", "annual", now, now);
  insertComponent.run(packageId, "allowance", 100_000, "EUR", "monthly", now, now);
  insertComponent.run(packageId, "bonus", 1_200_000, "EUR", "one_time", now, now);
}

export function employeeCompHash(db: AppDatabase) {
  return db
    .query(
      `
        SELECT e.employee_id AS employeeId,
          GROUP_CONCAT(sc.type || ':' || sc.amount, ',' ORDER BY sc.id) AS comps
        FROM employees e
        JOIN salary_components sc ON sc.package_id = e.compensation_package_id
        GROUP BY e.id
        ORDER BY e.employee_id
      `,
    )
    .all();
}

export type EmployeeListResponse = {
  total: number;
  page: number;
  pageSize: number;
  data: Array<{
    employeeId: string;
    name: string;
    job: string;
    location: string;
    orgUnit: string;
    level: string;
  }>;
};

export type CompensationResponse = {
  employeeId: string;
  annualizedTotal: number;
  components: Array<{
    id: number;
    type: string;
    amount: number;
    currency: string;
    frequency: string;
  }>;
};
