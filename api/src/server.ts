import type { AppDatabase } from "./db";
import { openDatabase } from "./db";
import {
  getAnalyticsBandPlacement,
  getAnalyticsBreakdown,
  getAnalyticsDistribution,
  getAnalyticsSummary,
} from "./analytics";
import { annualizeComponent } from "./domain/money";

type EmployeePayload = {
  employeeId?: string;
  firstName: string;
  lastName: string;
  job: string;
  location: string;
  country: string;
  currency: string;
  orgUnit: string;
  level: string;
  status?: "active" | "inactive";
  components?: ComponentPayload[];
};

type ComponentPayload = {
  type: string;
  amount: number;
  currency: string;
  frequency: "annual" | "monthly" | "one_time";
};

type ComponentDefinitionPayload = {
  code: string;
  name: string;
  description?: string;
};

type EmployeeRow = {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  name: string;
  jobId: number;
  job: string;
  locationId: number;
  location: string;
  country: string;
  currency: string;
  orgUnitId: number;
  orgUnit: string;
  level: string;
  status: "active" | "inactive";
  compensationPackageId: number;
};

let defaultDatabase: AppDatabase | undefined;

export async function handleRequest(request: Request, db = getDefaultDatabase()) {
  const url = new URL(request.url);
  const segments = url.pathname.split("/").filter(Boolean);

  try {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, service: "api" });
    }

    if (request.method === "GET" && url.pathname === "/employees") {
      return json(listEmployees(db, url));
    }

    if (request.method === "POST" && url.pathname === "/employees") {
      return await withJsonBody<EmployeePayload>(request, (body) => json(createEmployee(db, body), 201));
    }

    if (request.method === "GET" && url.pathname === "/component-definitions") {
      return json(listComponentDefinitions(db));
    }

    if (request.method === "POST" && url.pathname === "/component-definitions") {
      return await withJsonBody<ComponentDefinitionPayload>(request, (body) => {
        return json(createComponentDefinition(db, body), 201);
      });
    }

    if (request.method === "GET" && url.pathname === "/analytics/summary") {
      return json(getAnalyticsSummary(db));
    }

    if (request.method === "GET" && url.pathname === "/analytics/breakdown") {
      const dimension = url.searchParams.get("dimension");
      if (!dimension || !["job", "level", "location", "org_unit"].includes(dimension)) {
        throw new HttpError(400, "dimension must be job, level, location, or org_unit");
      }

      return json(getAnalyticsBreakdown(db, dimension as "job" | "level" | "location" | "org_unit"));
    }

    if (request.method === "GET" && url.pathname === "/analytics/distribution") {
      const job = url.searchParams.get("job");
      const location = url.searchParams.get("location");
      if (!job || !location) {
        throw new HttpError(400, "job and location are required");
      }

      return json(getAnalyticsDistribution(db, job, location));
    }

    if (request.method === "GET" && url.pathname === "/analytics/band-placement") {
      const job = url.searchParams.get("job");
      if (!job) {
        throw new HttpError(400, "job is required");
      }

      return json(getAnalyticsBandPlacement(db, job));
    }

    if (segments[0] === "employees" && segments[1]) {
      const employeeId = segments[1];

      if (request.method === "GET" && segments.length === 2) {
        const employee = getEmployee(db, employeeId);
        return employee ? json(employee) : json({ error: "Employee not found" }, 404);
      }

      if (request.method === "PATCH" && segments.length === 2) {
        return await withJsonBody<Partial<EmployeePayload>>(request, (body) => {
          const employee = updateEmployee(db, employeeId, body);
          return employee ? json(employee) : json({ error: "Employee not found" }, 404);
        });
      }

      if (request.method === "DELETE" && segments.length === 2) {
        return deleteEmployee(db, employeeId) ? json({ deleted: true }) : json({ error: "Employee not found" }, 404);
      }

      if (request.method === "GET" && segments[2] === "compensation") {
        const compensation = getCompensation(db, employeeId);
        return compensation ? json(compensation) : json({ error: "Employee not found" }, 404);
      }

      if (request.method === "POST" && segments[2] === "components") {
        return await withJsonBody<ComponentPayload>(request, (body) => {
          const component = createComponent(db, employeeId, body);
          return component ? json(component, 201) : json({ error: "Employee not found" }, 404);
        });
      }

    }

    if (request.method === "PATCH" && segments[0] === "components" && segments[1]) {
      return await withJsonBody<{ amount?: number }>(request, (body) => {
        const component = updateComponentAmount(db, Number(segments[1]), body);
        return component ? json(component) : json({ error: "Component not found" }, 404);
      });
    }

    if (request.method === "DELETE" && segments[0] === "components" && segments[1]) {
      return deleteComponent(db, Number(segments[1]))
        ? json({ deleted: true })
        : json({ error: "Component not found" }, 404);
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, error.status);
    }

    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 400);
  }
}

export function createServer(
  port = Number(process.env.PORT ?? 8787),
  db = getDefaultDatabase(),
  hostname = process.env.HOST,
) {
  return Bun.serve({
    port,
    hostname,
    fetch: (request) => handleRequest(request, db),
  });
}

function getDefaultDatabase() {
  defaultDatabase ??= openDatabase();
  return defaultDatabase;
}

function listEmployees(db: AppDatabase, url: URL) {
  const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? 50), 1), 100);
  const offset = (page - 1) * pageSize;
  const clauses: string[] = [];
  const params: string[] = [];

  for (const [queryKey, column] of [["level", "e.level"]] as const) {
    const value = url.searchParams.get(queryKey);
    if (value) {
      clauses.push(`${column} = ?`);
      params.push(value);
    }
  }

  const job = url.searchParams.get("job");
  if (job) {
    clauses.push("j.name = ?");
    params.push(job);
  }

  const orgUnit = url.searchParams.get("org_unit");
  if (orgUnit) {
    clauses.push("ou.name = ?");
    params.push(orgUnit);
  }

  const location = url.searchParams.get("location");
  if (location) {
    clauses.push("l.name = ?");
    params.push(location);
  }

  const search = url.searchParams.get("search");
  if (search) {
    clauses.push("LOWER(e.name) LIKE ?");
    params.push(`%${search.toLowerCase()}%`);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const total = db
    .query(`
      SELECT COUNT(*) AS count
      FROM employees e
      JOIN jobs j ON j.id = e.job_id
      JOIN locations l ON l.id = e.location_id
      JOIN org_units ou ON ou.id = e.org_unit_id
      ${where}
    `)
    .get(...params) as { count: number };
  const rows = db
    .query(
      `
        SELECT e.id, e.employee_id AS employeeId, e.first_name AS firstName, e.last_name AS lastName,
          e.name, e.job_id AS jobId, j.name AS job, e.location_id AS locationId, l.name AS location,
          l.country, l.currency, e.org_unit_id AS orgUnitId, ou.name AS orgUnit,
          e.level, e.status, e.compensation_package_id AS compensationPackageId
        FROM employees e
        JOIN jobs j ON j.id = e.job_id
        JOIN locations l ON l.id = e.location_id
        JOIN org_units ou ON ou.id = e.org_unit_id
        ${where}
        ORDER BY e.employee_id ASC
        LIMIT ? OFFSET ?
      `,
    )
    .all(...params, pageSize, offset);

  return { total: total.count, page, pageSize, data: rows };
}

function getEmployee(db: AppDatabase, employeeId: string) {
  return db
    .query(
      `
        SELECT e.id, e.employee_id AS employeeId, e.first_name AS firstName, e.last_name AS lastName,
          e.name, e.job_id AS jobId, j.name AS job, e.location_id AS locationId, l.name AS location,
          l.country, l.currency, e.org_unit_id AS orgUnitId, ou.name AS orgUnit,
          e.level, e.status, e.compensation_package_id AS compensationPackageId
        FROM employees e
        JOIN jobs j ON j.id = e.job_id
        JOIN locations l ON l.id = e.location_id
        JOIN org_units ou ON ou.id = e.org_unit_id
        WHERE e.employee_id = ? OR e.id = ?
      `,
    )
    .get(employeeId, Number(employeeId) || -1) as EmployeeRow | undefined;
}

function createEmployee(db: AppDatabase, body: EmployeePayload) {
  requireFields(body, ["firstName", "lastName", "job", "location", "country", "currency", "orgUnit", "level"]);
  const now = new Date().toISOString();
  const employeeId = body.employeeId ?? nextEmployeeId(db);
  const components = body.components?.length
    ? body.components
    : [{ type: "base", amount: 0, currency: body.currency, frequency: "annual" } satisfies ComponentPayload];

  const transaction = db.transaction(() => {
    const jobId = findOrCreateNamedRecord(db, "jobs", body.job);
    const locationId = findOrCreateLocation(db, body.location, body.country, body.currency);
    const orgUnitId = findOrCreateNamedRecord(db, "org_units", body.orgUnit);
    const compensationPackage = db
      .query(
        "INSERT INTO compensation_packages (native_currency, created_at) VALUES (?, ?) RETURNING id",
      )
      .get(body.currency, now) as { id: number };

    const created = db
      .query(
        `
          INSERT INTO employees (
            employee_id, first_name, last_name, name, job_id, location_id,
            org_unit_id, level, status, compensation_package_id, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id, employee_id AS employeeId, first_name AS firstName, last_name AS lastName,
            name, job_id AS jobId, location_id AS locationId, org_unit_id AS orgUnitId, level, status,
            compensation_package_id AS compensationPackageId
        `,
      )
      .get(
        employeeId,
        body.firstName,
        body.lastName,
        `${body.firstName} ${body.lastName}`,
        jobId,
        locationId,
        orgUnitId,
        body.level,
        body.status ?? "active",
        compensationPackage.id,
        now,
      ) as { id: number; compensationPackageId: number };

    for (const component of components) {
      insertComponent(db, created.compensationPackageId, component, now);
    }

    return getEmployee(db, String(created.id));
  });

  return transaction();
}

function listComponentDefinitions(db: AppDatabase) {
  return {
    data: db
      .query(
        `
          SELECT code, name, description, created_at AS createdAt
          FROM salary_component_definitions
          ORDER BY code ASC
        `,
      )
      .all(),
  };
}

function createComponentDefinition(db: AppDatabase, body: ComponentDefinitionPayload) {
  requireFields(body, ["code", "name"]);

  const code = normalizeComponentCode(body.code);
  const now = new Date().toISOString();

  try {
    return db
      .query(
        `
          INSERT INTO salary_component_definitions (code, name, description, created_at)
          VALUES (?, ?, ?, ?)
          RETURNING code, name, description, created_at AS createdAt
        `,
      )
      .get(code, body.name.trim(), body.description?.trim() || null, now);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      throw new HttpError(400, "component definition already exists");
    }

    throw error;
  }
}

function findOrCreateLocation(db: AppDatabase, name: string, country: string, currency: string) {
  const normalizedName = name.trim();
  const existing = db.query("SELECT id FROM locations WHERE name = ?").get(normalizedName) as { id: number } | undefined;
  if (existing) {
    return existing.id;
  }

  const created = db
    .query("INSERT INTO locations (name, country, currency) VALUES (?, ?, ?) RETURNING id")
    .get(normalizedName, country.trim(), currency) as { id: number };

  return created.id;
}

function findOrCreateNamedRecord(db: AppDatabase, table: "jobs" | "org_units", name: string) {
  const normalizedName = name.trim();
  const existing = db.query(`SELECT id FROM ${table} WHERE name = ?`).get(normalizedName) as { id: number } | undefined;
  if (existing) {
    return existing.id;
  }

  const created = db.query(`INSERT INTO ${table} (name) VALUES (?) RETURNING id`).get(normalizedName) as { id: number };
  return created.id;
}

function updateEmployee(db: AppDatabase, employeeId: string, body: Partial<EmployeePayload>) {
  const existing = getEmployee(db, employeeId);
  if (!existing) {
    return undefined;
  }

  const firstName = body.firstName ?? String(existing.firstName);
  const lastName = body.lastName ?? String(existing.lastName);
  const locationId = body.location
    ? findOrCreateLocation(db, body.location, body.country ?? existing.country, body.currency ?? existing.currency)
    : existing.locationId;
  const jobId = body.job ? findOrCreateNamedRecord(db, "jobs", body.job) : existing.jobId;
  const orgUnitId = body.orgUnit ? findOrCreateNamedRecord(db, "org_units", body.orgUnit) : existing.orgUnitId;

  db
    .query(
      `
        UPDATE employees
        SET first_name = ?, last_name = ?, name = ?, job_id = ?, location_id = ?,
          org_unit_id = ?, level = ?, status = ?
        WHERE id = ?
      `,
    )
    .run(
      firstName,
      lastName,
      `${firstName} ${lastName}`,
      jobId,
      locationId,
      orgUnitId,
      body.level ?? existing.level,
      body.status ?? existing.status,
      existing.id,
    );

  return getEmployee(db, String(existing.id));
}

function deleteEmployee(db: AppDatabase, employeeId: string) {
  const employee = getEmployee(db, employeeId);
  if (!employee) {
    return false;
  }

  db.query("DELETE FROM employees WHERE id = ?").run(employee.id);
  db.query("DELETE FROM compensation_packages WHERE id = ?").run(employee.compensationPackageId);
  return true;
}

function getCompensation(db: AppDatabase, employeeId: string) {
  const employee = getEmployee(db, employeeId);
  if (!employee) {
    return undefined;
  }

  const compensationPackage = db
    .query("SELECT id, native_currency AS nativeCurrency FROM compensation_packages WHERE id = ?")
    .get(employee.compensationPackageId) as { id: number; nativeCurrency: string } | undefined;

  if (!compensationPackage) {
    return { employeeId: employee.employeeId, package: undefined, components: [], annualizedTotal: 0 };
  }

  const components = db
    .query(
      `
        SELECT id, type, amount, currency, frequency
        FROM salary_components
        WHERE package_id = ?
        ORDER BY id ASC
      `,
    )
    .all(compensationPackage.id) as Array<{ amount: number; frequency: string }>;

  const annualizedTotal = components.reduce((total, component) => total + annualizeComponent(component), 0);
  return { employeeId: employee.employeeId, package: compensationPackage, components, annualizedTotal };
}

function createComponent(db: AppDatabase, employeeId: string, body: ComponentPayload) {
  requireFields(body, ["type", "amount", "currency", "frequency"]);
  const compensation = getCompensation(db, employeeId);
  if (!compensation?.package) {
    return undefined;
  }

  const now = new Date().toISOString();
  return insertComponent(db, compensation.package.id, body, now);
}

function updateComponentAmount(db: AppDatabase, componentId: number, body: { amount?: number }) {
  if (body.amount === undefined || !Number.isInteger(body.amount) || body.amount < 0) {
    throw new HttpError(400, "amount must be a non-negative integer");
  }

  const existing = db
    .query("SELECT id FROM salary_components WHERE id = ?")
    .get(componentId) as { id: number } | undefined;
  if (!existing) {
    return undefined;
  }

  const newAmount = body.amount;
  const now = new Date().toISOString();

  return db
    .query(
      `
        UPDATE salary_components
        SET amount = ?, updated_at = ?
        WHERE id = ?
        RETURNING id, type, amount, currency, frequency
      `,
    )
    .get(newAmount, now, componentId);
}

function deleteComponent(db: AppDatabase, componentId: number) {
  const result = db.query("DELETE FROM salary_components WHERE id = ?").run(componentId);
  return result.changes > 0;
}

function insertComponent(db: AppDatabase, packageId: number, component: ComponentPayload, now: string) {
  if (!Number.isInteger(component.amount) || component.amount < 0) {
    throw new HttpError(400, "component amount must be a non-negative integer");
  }

  const type = normalizeComponentCode(component.type);

  try {
    return db
      .query(
        `
          INSERT INTO salary_components (package_id, type, amount, currency, frequency, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          RETURNING id, type, amount, currency, frequency
        `,
      )
      .get(packageId, type, component.amount, component.currency, component.frequency, now, now);
  } catch (error) {
    if (error instanceof Error && error.message.includes("FOREIGN KEY constraint failed")) {
      throw new HttpError(400, "unknown component type");
    }

    throw error;
  }
}

function nextEmployeeId(db: AppDatabase) {
  const row = db.query("SELECT COUNT(*) + 1 AS next FROM employees").get() as { next: number };
  return `E${String(row.next).padStart(5, "0")}`;
}

async function withJsonBody<T>(request: Request, handler: (body: T) => Response) {
  let body: T;

  try {
    body = (await request.json()) as T;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  return handler(body);
}

function requireFields(body: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = body[field];
    if (value === undefined || value === null || value === "") {
      throw new HttpError(400, `${field} is required`);
    }
  }
}

function normalizeComponentCode(code: string) {
  const normalized = code.trim().toLowerCase().replaceAll(/\s+/g, "_");
  if (!/^[a-z][a-z0-9_]*$/.test(normalized)) {
    throw new HttpError(400, "component type code must start with a letter and contain only letters, numbers, and underscores");
  }

  return normalized;
}

function json(payload: unknown, status = 200) {
  return Response.json(payload, { status, headers: corsHeaders() });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
