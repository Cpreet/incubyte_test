import { faker } from "@faker-js/faker";
import type { AppDatabase } from "./db";
import { resetDatabase } from "./db";

const seedValue = 20260701;

const jobs = [
  "Software Engineer",
  "Product Manager",
  "Data Analyst",
  "HR Partner",
  "Sales Manager",
  "Finance Analyst",
] as const;

const orgUnits = ["Engineering", "Product", "People", "Sales", "Finance"] as const;
const levels = ["L1", "L2", "L3", "L4", "L5"] as const;
const locations = [
  { city: "Berlin", country: "Germany", currency: "EUR" },
  { city: "London", country: "United Kingdom", currency: "GBP" },
  { city: "New York", country: "United States", currency: "USD" },
  { city: "Bengaluru", country: "India", currency: "INR" },
  { city: "Singapore", country: "Singapore", currency: "SGD" },
] as const;

const fxRates = [
  ["USD", 1],
  ["EUR", 1.1],
  ["GBP", 1.27],
  ["INR", 0.012],
  ["SGD", 0.74],
] as const;

type SeedOptions = {
  count?: number;
};

export function seedDatabase(db: AppDatabase, options: SeedOptions = {}) {
  const count = options.count ?? 10_000;
  faker.seed(seedValue);
  resetDatabase(db);

  const now = "2026-07-01T00:00:00.000Z";
  const insertEmployee = db.query(`
    INSERT INTO employees (
      employee_id, first_name, last_name, name, job_id, location_id,
      org_unit_id, level, status, compensation_package_id, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    RETURNING id
  `);
  const insertJob = db.query(`
    INSERT INTO jobs (name)
    VALUES (?)
    RETURNING id
  `);
  const insertOrgUnit = db.query(`
    INSERT INTO org_units (name)
    VALUES (?)
    RETURNING id
  `);
  const insertLocation = db.query(`
    INSERT INTO locations (name, country, currency)
    VALUES (?, ?, ?)
    RETURNING id
  `);
  const insertPackage = db.query(`
    INSERT INTO compensation_packages (native_currency, created_at)
    VALUES (?, ?)
    RETURNING id
  `);
  const insertComponent = db.query(`
    INSERT INTO salary_components (package_id, type, amount, currency, frequency, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPayRange = db.query(`
    INSERT INTO pay_ranges (job, location, level, currency, min_amount, max_amount)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertFxRate = db.query("INSERT INTO fx_rates (currency, rate_to_usd) VALUES (?, ?)");

  const transaction = db.transaction(() => {
    const locationIdsByName = new Map<string, number>();
    const jobIdsByName = new Map<string, number>();
    const orgUnitIdsByName = new Map<string, number>();

    for (const [currency, rate] of fxRates) {
      insertFxRate.run(currency, rate);
    }

    for (const location of locations) {
      const row = insertLocation.get(location.city, location.country, location.currency) as { id: number };
      locationIdsByName.set(location.city, row.id);
    }

    for (const job of jobs) {
      const row = insertJob.get(job) as { id: number };
      jobIdsByName.set(job, row.id);
    }

    for (const orgUnit of orgUnits) {
      const row = insertOrgUnit.get(orgUnit) as { id: number };
      orgUnitIdsByName.set(orgUnit, row.id);
    }

    for (const job of jobs) {
      for (const location of locations) {
        for (const level of levels) {
          const levelIndex = Number(level.slice(1));
          const midpoint = salaryFor(location.currency, job, levelIndex);
          insertPayRange.run(
            job,
            location.city,
            level,
            location.currency,
            Math.round(midpoint * 0.85),
            Math.round(midpoint * 1.15),
          );
        }
      }
    }

    for (let index = 0; index < count; index += 1) {
      const firstName = faker.person.firstName();
      const lastName = index % 997 === 0 ? "Smithson" : faker.person.lastName();
      const name = `${firstName} ${lastName}`;
      const job = jobs[index % jobs.length]!;
      const orgUnit = orgUnits[index % orgUnits.length]!;
      const level = levels[index % levels.length]!;
      const location = locations[index % locations.length]!;
      const locationId = locationIdsByName.get(location.city);
      const jobId = jobIdsByName.get(job);
      const orgUnitId = orgUnitIdsByName.get(orgUnit);
      if (locationId === undefined) {
        throw new Error(`Missing seeded location: ${location.city}`);
      }
      if (jobId === undefined) {
        throw new Error(`Missing seeded job: ${job}`);
      }
      if (orgUnitId === undefined) {
        throw new Error(`Missing seeded org unit: ${orgUnit}`);
      }
      const employeeNumber = `E${String(index + 1).padStart(5, "0")}`;

      const compensationPackage = insertPackage.get(location.currency, now) as { id: number };

      insertEmployee.get(
        employeeNumber,
        firstName,
        lastName,
        name,
        jobId,
        locationId,
        orgUnitId,
        level,
        compensationPackage.id,
        now,
      );

      const baseAmount = salaryFor(location.currency, job, Number(level.slice(1))) + (index % 19) * 10_000;

      insertComponent.run(compensationPackage.id, "base", baseAmount, location.currency, "annual", now, now);

      if (index % 3 === 0) {
        insertComponent.run(
          compensationPackage.id,
          "allowance",
          Math.round(baseAmount * 0.01),
          location.currency,
          "monthly",
          now,
          now,
        );
      }

      if (index % 4 === 0) {
        insertComponent.run(
          compensationPackage.id,
          "bonus",
          Math.round(baseAmount * 0.08),
          location.currency,
          "one_time",
          now,
          now,
        );
      }
    }
  });

  transaction();
  return { employees: count, seed: seedValue };
}

function salaryFor(currency: string, job: string, level: number) {
  const baseByCurrency: Record<string, number> = {
    USD: 85_000_00,
    EUR: 78_000_00,
    GBP: 72_000_00,
    INR: 2_500_000_00,
    SGD: 95_000_00,
  };
  const jobMultiplier = jobs.indexOf(job as (typeof jobs)[number]) + 1;
  const base = baseByCurrency[currency];
  if (base === undefined) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  return base + level * 12_000_00 + jobMultiplier * 2_500_00;
}
