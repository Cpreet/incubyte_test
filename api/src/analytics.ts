import type { AppDatabase } from "./db";
import { classifyBand } from "./domain/bands";
import { annualizeComponent, convertToUsd } from "./domain/money";
import { distribution, mean, median } from "./domain/stats";

type ComponentRow = {
  type: string;
  amount: number;
  currency: string;
  frequency: string;
};

type EmployeeAnalyticsRow = {
  employeeId: string;
  job: string;
  location: string;
  orgUnit: string;
  level: string;
  status: string;
  components: ComponentRow[];
};

export function loadFxRates(db: AppDatabase): Record<string, number> {
  const rows = db.query("SELECT currency, rate_to_usd AS rate FROM fx_rates").all() as Array<{
    currency: string;
    rate: number;
  }>;

  return Object.fromEntries(rows.map((row) => [row.currency, row.rate]));
}

function loadActiveEmployees(db: AppDatabase): EmployeeAnalyticsRow[] {
  const rows = db
    .query(
      `
        SELECT e.employee_id AS employeeId, e.level, e.status,
          j.name AS job, l.name AS location, ou.name AS orgUnit,
          sc.type, sc.amount, sc.currency, sc.frequency
        FROM employees e
        JOIN jobs j ON j.id = e.job_id
        JOIN locations l ON l.id = e.location_id
        JOIN org_units ou ON ou.id = e.org_unit_id
        JOIN salary_components sc ON sc.package_id = e.compensation_package_id
        WHERE e.status = 'active'
        ORDER BY e.employee_id ASC, sc.id ASC
      `,
    )
    .all() as Array<EmployeeAnalyticsRow & ComponentRow>;

  const byEmployee = new Map<string, EmployeeAnalyticsRow>();

  for (const row of rows) {
    const existing = byEmployee.get(row.employeeId);
    const component: ComponentRow = {
      type: row.type,
      amount: row.amount,
      currency: row.currency,
      frequency: row.frequency,
    };

    if (existing) {
      existing.components.push(component);
      continue;
    }

    byEmployee.set(row.employeeId, {
      employeeId: row.employeeId,
      job: row.job,
      location: row.location,
      orgUnit: row.orgUnit,
      level: row.level,
      status: row.status,
      components: [component],
    });
  }

  return [...byEmployee.values()];
}

function employeeAnnualizedUsd(employee: EmployeeAnalyticsRow, fxRates: Record<string, number>) {
  return employee.components.reduce((total, component) => {
    const annualized = annualizeComponent(component);
    return total + convertToUsd(annualized, component.currency, fxRates);
  }, 0);
}

function employeeBaseAmount(employee: EmployeeAnalyticsRow) {
  const base = employee.components.find((component) => component.type === "base");
  if (!base) {
    return null;
  }

  return {
    amount: annualizeComponent(base),
    currency: base.currency,
  };
}

export function getAnalyticsSummary(db: AppDatabase) {
  const fxRates = loadFxRates(db);
  const employees = loadActiveEmployees(db);
  const totals = employees.map((employee) => employeeAnnualizedUsd(employee, fxRates));

  return {
    headcount: employees.length,
    totalAnnualizedCompUsd: totals.reduce((sum, value) => sum + value, 0),
    meanAnnualizedCompUsd: Math.round(mean(totals)),
    medianAnnualizedCompUsd: Math.round(median(totals)),
  };
}

type BreakdownDimension = "job" | "level" | "location" | "org_unit";

export function getAnalyticsBreakdown(db: AppDatabase, dimension: BreakdownDimension) {
  const fxRates = loadFxRates(db);
  const employees = loadActiveEmployees(db);
  const groups = new Map<string, number[]>();

  for (const employee of employees) {
    const key =
      dimension === "org_unit"
        ? employee.orgUnit
        : dimension === "location"
          ? employee.location
          : dimension === "job"
            ? employee.job
            : employee.level;
    const totals = groups.get(key) ?? [];
    totals.push(employeeAnnualizedUsd(employee, fxRates));
    groups.set(key, totals);
  }

  return {
    dimension,
    groups: [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, totals]) => ({
        key,
        count: totals.length,
        totalAnnualizedCompUsd: totals.reduce((sum, value) => sum + value, 0),
        meanAnnualizedCompUsd: Math.round(mean(totals)),
        medianAnnualizedCompUsd: Math.round(median(totals)),
      })),
  };
}

export function getAnalyticsDistribution(db: AppDatabase, job: string, location: string) {
  const fxRates = loadFxRates(db);
  const employees = loadActiveEmployees(db).filter(
    (employee) => employee.job === job && employee.location === location,
  );
  const totals = employees.map((employee) => employeeAnnualizedUsd(employee, fxRates));
  const stats = distribution(totals);

  return {
    job,
    location,
    count: totals.length,
    ...stats,
  };
}

export function getAnalyticsBandPlacement(db: AppDatabase, job: string) {
  const fxRates = loadFxRates(db);
  const payRanges = db
    .query(
      `
        SELECT location, level, currency, min_amount AS minAmount, max_amount AS maxAmount
        FROM pay_ranges
        WHERE job = ?
      `,
    )
    .all(job) as Array<{ location: string; level: string; currency: string; minAmount: number; maxAmount: number }>;

  const rangeKey = (location: string, level: string) => `${location}::${level}`;
  const rangesByKey = new Map(
    payRanges.map((range) => [rangeKey(range.location, range.level), range]),
  );

  const employees = loadActiveEmployees(db).filter((employee) => employee.job === job);
  const buckets = { below: 0, within: 0, above: 0, no_band: 0 };

  for (const employee of employees) {
    const range = rangesByKey.get(rangeKey(employee.location, employee.level));
    const base = employeeBaseAmount(employee);
    if (!range || !base) {
      buckets.no_band += 1;
      continue;
    }

    let placement;
    if (base.currency === range.currency) {
      placement = classifyBand(base.amount, range.minAmount, range.maxAmount);
    } else {
      const baseUsd = convertToUsd(base.amount, base.currency, fxRates);
      const minUsd = convertToUsd(range.minAmount, range.currency, fxRates);
      const maxUsd = convertToUsd(range.maxAmount, range.currency, fxRates);
      placement = classifyBand(baseUsd, minUsd, maxUsd);
    }

    buckets[placement] += 1;
  }

  const classified = buckets.below + buckets.within + buckets.above;
  const toPercent = (count: number) => (classified === 0 ? 0 : Math.round((count / classified) * 1000) / 10);

  return {
    job,
    counts: buckets,
    percentages: {
      below: toPercent(buckets.below),
      within: toPercent(buckets.within),
      above: toPercent(buckets.above),
    },
    noBand: buckets.no_band,
  };
}
