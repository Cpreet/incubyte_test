import { describe, expect, test } from "bun:test";
import { seedDatabase } from "./seed";
import { handleRequest } from "./server";
import {
  type CompensationResponse,
  type EmployeeListResponse,
  insertGoldenPackageEmployee,
  jsonRequest,
  testDatabase,
} from "./test-helpers";

describe("health", () => {
  test("API-HEALTH-001 returns health status", async () => {
    const response = await handleRequest(new Request("http://localhost/health"), testDatabase());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, service: "api" });
  });
});

describe("GET /employees", () => {
  test("API-EMP-LIST-001 lists seeded employees with pagination metadata", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 25 });

    const response = await handleRequest(new Request("http://localhost/employees?pageSize=10"), db);
    const body = (await response.json()) as EmployeeListResponse;

    expect(response.status).toBe(200);
    expect(body.total).toBe(25);
    expect(body.pageSize).toBe(10);
    expect(body.data).toHaveLength(10);
  });

  test("API-EMP-LIST-002 defaults pageSize to 50", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 60 });

    const response = await handleRequest(new Request("http://localhost/employees"), db);
    const body = (await response.json()) as EmployeeListResponse;

    expect(response.status).toBe(200);
    expect(body.pageSize).toBe(50);
    expect(body.data).toHaveLength(50);
  });

  test("API-EMP-LIST-003 clamps pageSize to 100", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 200 });

    const response = await handleRequest(new Request("http://localhost/employees?pageSize=150"), db);
    const body = (await response.json()) as EmployeeListResponse;

    expect(response.status).toBe(200);
    expect(body.pageSize).toBe(100);
    expect(body.data).toHaveLength(100);
  });

  test("API-EMP-LIST-004 keeps page slices disjoint", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 30 });

    const page1 = (await (
      await handleRequest(new Request("http://localhost/employees?page=1&pageSize=10"), db)
    ).json()) as EmployeeListResponse;
    const page2 = (await (
      await handleRequest(new Request("http://localhost/employees?page=2&pageSize=10"), db)
    ).json()) as EmployeeListResponse;

    const page1Ids = new Set(page1.data.map((employee) => employee.employeeId));
    const overlap = page2.data.some((employee) => page1Ids.has(employee.employeeId));
    expect(overlap).toBe(false);
  });

  test("API-EMP-LIST-005 orders by employeeId ascending", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 15 });

    const body = (await (
      await handleRequest(new Request("http://localhost/employees?pageSize=15"), db)
    ).json()) as EmployeeListResponse;

    const ids = body.data.map((employee) => employee.employeeId);
    expect(ids).toEqual([...ids].sort());
  });

  test("API-EMP-LIST-006 reports 10000 total on full seed", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 10_000 });

    const body = (await (await handleRequest(new Request("http://localhost/employees?pageSize=1"), db)).json()) as EmployeeListResponse;
    expect(body.total).toBe(10_000);
  }, 15_000);
});

describe("employee filters", () => {
  test("API-EMP-FILTER-001 filters by location and level", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 50 });

    const body = (await (
      await handleRequest(new Request("http://localhost/employees?location=Berlin&level=L1"), db)
    ).json()) as EmployeeListResponse;

    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((employee) => employee.location === "Berlin" && employee.level === "L1")).toBe(true);
  });

  test("API-EMP-FILTER-002 filters by job", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 100 });

    const body = (await (
      await handleRequest(new Request("http://localhost/employees?job=Software%20Engineer&pageSize=100"), db)
    ).json()) as EmployeeListResponse;

    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((employee) => employee.job === "Software Engineer")).toBe(true);
  });

  test("API-EMP-FILTER-003 filters by org_unit", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 100 });

    const body = (await (
      await handleRequest(new Request("http://localhost/employees?org_unit=Engineering&pageSize=100"), db)
    ).json()) as EmployeeListResponse;

    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((employee) => employee.orgUnit === "Engineering")).toBe(true);
  });

  test("API-EMP-FILTER-004 search is case-insensitive", async () => {
    const db = testDatabase();
    await handleRequest(
      jsonRequest("http://localhost/employees", "POST", {
        firstName: "John",
        lastName: "Smith",
        job: "Software Engineer",
        location: "London",
        country: "United Kingdom",
        currency: "GBP",
        orgUnit: "Engineering",
        level: "L2",
      }),
      db,
    );

    const body = (await (await handleRequest(new Request("http://localhost/employees?search=SMITH"), db)).json()) as EmployeeListResponse;
    expect(body.data.some((employee) => employee.name.includes("Smith"))).toBe(true);
  });

  test("API-EMP-FILTER-005 search smi matches Smithson", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 1000 });

    const body = (await (
      await handleRequest(new Request("http://localhost/employees?search=smi&pageSize=100"), db)
    ).json()) as EmployeeListResponse;

    expect(body.data.some((employee) => /smith/i.test(employee.name))).toBe(true);
  });

  test("API-EMP-FILTER-006 filters Berlin and L3", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 100 });

    const body = (await (
      await handleRequest(new Request("http://localhost/employees?location=Berlin&level=L3"), db)
    ).json()) as EmployeeListResponse;

    expect(body.data.every((employee) => employee.location === "Berlin" && employee.level === "L3")).toBe(true);
  });

  test("API-EMP-FILTER-007 unknown location returns empty page", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 10 });

    const response = await handleRequest(new Request("http://localhost/employees?location=Atlantis"), db);
    const body = (await response.json()) as EmployeeListResponse;

    expect(response.status).toBe(200);
    expect(body.total).toBe(0);
    expect(body.data).toHaveLength(0);
  });

  test("API-EMP-FILTER-008 combines all filters", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 200 });

    const url =
      "http://localhost/employees?job=Software%20Engineer&location=Berlin&org_unit=Engineering&level=L1&search=e&pageSize=50";
    const body = (await (await handleRequest(new Request(url), db)).json()) as EmployeeListResponse;

    expect(
      body.data.every(
        (employee) =>
          employee.job === "Software Engineer" &&
          employee.location === "Berlin" &&
          employee.orgUnit === "Engineering" &&
          employee.level === "L1" &&
          employee.name.toLowerCase().includes("e"),
      ),
    ).toBe(true);
  });
});

describe("employee CRUD", () => {
  test("API-EMP-CRUD-001 through 003 create update delete", async () => {
    const db = testDatabase();
    const createResponse = await handleRequest(
      jsonRequest("http://localhost/employees", "POST", {
        firstName: "Ada",
        lastName: "Lovelace",
        job: "Software Engineer",
        location: "London",
        country: "United Kingdom",
        currency: "GBP",
        orgUnit: "Engineering",
        level: "L4",
        components: [{ type: "base", amount: 12_000_000, currency: "GBP", frequency: "annual" }],
      }),
      db,
    );
    const created = (await createResponse.json()) as { employeeId: string; level: string };

    expect(createResponse.status).toBe(201);
    expect(created.employeeId).toBe("E00001");

    const updateResponse = await handleRequest(
      jsonRequest(`http://localhost/employees/${created.employeeId}`, "PATCH", { level: "L5" }),
      db,
    );
    expect(((await updateResponse.json()) as { level: string }).level).toBe("L5");

    const deleteResponse = await handleRequest(
      new Request(`http://localhost/employees/${created.employeeId}`, { method: "DELETE" }),
      db,
    );
    expect(deleteResponse.status).toBe(200);
  });

  test("API-EMP-CRUD-004 gets single employee", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 1 });

    const response = await handleRequest(new Request("http://localhost/employees/E00001"), db);
    const body = (await response.json()) as {
      employeeId: string;
      job: string;
      location: string;
      orgUnit: string;
      level: string;
    };

    expect(response.status).toBe(200);
    expect(body.employeeId).toBe("E00001");
    expect(body.job).toBeDefined();
    expect(body.location).toBeDefined();
    expect(body.orgUnit).toBeDefined();
    expect(body.level).toBeDefined();
  });

  test("API-EMP-CRUD-005 unknown employee returns 404", async () => {
    const response = await handleRequest(new Request("http://localhost/employees/E99999"), testDatabase());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Employee not found" });
  });

  test("API-EMP-CRUD-006 rejects empty create body", async () => {
    const response = await handleRequest(jsonRequest("http://localhost/employees", "POST", {}), testDatabase());
    expect(response.status).toBe(400);
  });

  test("API-EMP-CRUD-007 creates default base component", async () => {
    const db = testDatabase();
    const createResponse = await handleRequest(
      jsonRequest("http://localhost/employees", "POST", {
        firstName: "Grace",
        lastName: "Hopper",
        job: "Software Engineer",
        location: "New York",
        country: "United States",
        currency: "USD",
        orgUnit: "Engineering",
        level: "L3",
      }),
      db,
    );
    const created = (await createResponse.json()) as { employeeId: string };
    const compensation = (await (
      await handleRequest(new Request(`http://localhost/employees/${created.employeeId}/compensation`), db)
    ).json()) as CompensationResponse;

    expect(compensation.components.some((component) => component.type === "base")).toBe(true);
  });

  test("API-EMP-CRUD-008 patch unknown employee returns 404", async () => {
    const response = await handleRequest(
      jsonRequest("http://localhost/employees/E99999", "PATCH", { level: "L1" }),
      testDatabase(),
    );
    expect(response.status).toBe(404);
  });
});

describe("compensation read", () => {
  test("API-COMP-READ-001 returns components", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 1 });

    const compensation = (await (
      await handleRequest(new Request("http://localhost/employees/E00001/compensation"), db)
    ).json()) as CompensationResponse;

    expect(compensation.components.length).toBeGreaterThan(0);
  });

  test("API-COMP-READ-002 includes component fields", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 1 });

    const compensation = (await (
      await handleRequest(new Request("http://localhost/employees/E00001/compensation"), db)
    ).json()) as CompensationResponse;

    for (const component of compensation.components) {
      expect(component.id).toBeDefined();
      expect(component.type).toBeDefined();
      expect(component.amount).toBeDefined();
      expect(component.currency).toBeDefined();
      expect(component.frequency).toBeDefined();
    }
  });

  test("API-COMP-READ-003 golden annualized total", async () => {
    const db = testDatabase();
    insertGoldenPackageEmployee(db);

    const compensation = (await (
      await handleRequest(new Request("http://localhost/employees/E-GOLD/compensation"), db)
    ).json()) as CompensationResponse;

    expect(compensation.annualizedTotal).toBe(14_400_000);
    expect(compensation.components).toHaveLength(3);
  });

  test("API-COMP-READ-004 unknown employee returns 404", async () => {
    const response = await handleRequest(new Request("http://localhost/employees/E99999/compensation"), testDatabase());
    expect(response.status).toBe(404);
  });
});

describe("component patch", () => {
  test("API-COMP-PATCH-001 updates amount", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 1 });
    const compensation = (await (
      await handleRequest(new Request("http://localhost/employees/E00001/compensation"), db)
    ).json()) as CompensationResponse;
    const componentId = compensation.components[0]!.id;

    const updated = (await (
      await handleRequest(jsonRequest(`http://localhost/components/${componentId}`, "PATCH", { amount: 9_990_000 }), db)
    ).json()) as { amount: number };

    expect(updated.amount).toBe(9_990_000);
  });

  test("API-COMP-PATCH-002 rejects missing amount", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 1 });
    const compensation = (await (
      await handleRequest(new Request("http://localhost/employees/E00001/compensation"), db)
    ).json()) as CompensationResponse;

    const response = await handleRequest(
      jsonRequest(`http://localhost/components/${compensation.components[0]!.id}`, "PATCH", {}),
      db,
    );
    expect(response.status).toBe(400);
  });

  test("API-COMP-PATCH-003 rejects negative amount", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 1 });
    const compensation = (await (
      await handleRequest(new Request("http://localhost/employees/E00001/compensation"), db)
    ).json()) as CompensationResponse;
    const componentId = compensation.components[0]!.id;
    const original = compensation.components[0]!.amount;

    const response = await handleRequest(jsonRequest(`http://localhost/components/${componentId}`, "PATCH", { amount: -1 }), db);
    expect(response.status).toBe(400);

    const after = (await (
      await handleRequest(new Request("http://localhost/employees/E00001/compensation"), db)
    ).json()) as CompensationResponse;
    expect(after.components.find((component) => component.id === componentId)?.amount).toBe(original);
  });

  test("API-COMP-PATCH-004 rejects non-integer amount", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 1 });
    const compensation = (await (
      await handleRequest(new Request("http://localhost/employees/E00001/compensation"), db)
    ).json()) as CompensationResponse;

    const response = await handleRequest(
      jsonRequest(`http://localhost/components/${compensation.components[0]!.id}`, "PATCH", { amount: 99.5 }),
      db,
    );
    expect(response.status).toBe(400);
  });

  test("API-COMP-PATCH-005 unknown component returns 404", async () => {
    const response = await handleRequest(jsonRequest("http://localhost/components/99999", "PATCH", { amount: 100 }), testDatabase());
    expect(response.status).toBe(404);
  });
});

describe("component create delete", () => {
  test("API-COMP-WRITE-001 and 002 create and delete", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 1 });

    const created = (await (
      await handleRequest(
        jsonRequest("http://localhost/employees/E00001/components", "POST", {
          type: "bonus",
          amount: 500_000,
          currency: "EUR",
          frequency: "one_time",
        }),
        db,
      )
    ).json()) as { id: number };

    expect(created.id).toBeDefined();

    const deleteResponse = await handleRequest(new Request(`http://localhost/components/${created.id}`, { method: "DELETE" }), db);
    expect(deleteResponse.status).toBe(200);
  });

  test("API-COMP-WRITE-003 delete removes from compensation", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 1 });

    const created = (await (
      await handleRequest(
        jsonRequest("http://localhost/employees/E00001/components", "POST", {
          type: "bonus",
          amount: 500_000,
          currency: "EUR",
          frequency: "one_time",
        }),
        db,
      )
    ).json()) as { id: number };

    const before = (await (
      await handleRequest(new Request("http://localhost/employees/E00001/compensation"), db)
    ).json()) as CompensationResponse;
    expect(before.components.some((component) => component.id === created.id)).toBe(true);

    await handleRequest(new Request(`http://localhost/components/${created.id}`, { method: "DELETE" }), db);

    const after = (await (
      await handleRequest(new Request("http://localhost/employees/E00001/compensation"), db)
    ).json()) as CompensationResponse;
    expect(after.components.some((component) => component.id === created.id)).toBe(false);
  });

  test("API-COMP-WRITE-004 rejects unknown component type", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 1 });

    const response = await handleRequest(
      jsonRequest("http://localhost/employees/E00001/components", "POST", {
        type: "nonexistent_type",
        amount: 100,
        currency: "EUR",
        frequency: "annual",
      }),
      db,
    );

    expect(response.status).toBe(400);
  });
});

describe("component definitions", () => {
  test("API-DEF-001 defines commission and uses it", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 1 });

    await handleRequest(
      jsonRequest("http://localhost/component-definitions", "POST", {
        code: "commission",
        name: "Commission",
      }),
      db,
    );

    await handleRequest(
      jsonRequest("http://localhost/employees/E00001/components", "POST", {
        type: "commission",
        amount: 750_000,
        currency: "EUR",
        frequency: "one_time",
      }),
      db,
    );

    const compensation = (await (
      await handleRequest(new Request("http://localhost/employees/E00001/compensation"), db)
    ).json()) as CompensationResponse;

    expect(compensation.components.some((component) => component.type === "commission")).toBe(true);
  });

  test("API-DEF-002 lists default definitions", async () => {
    const db = testDatabase();
    const body = (await (await handleRequest(new Request("http://localhost/component-definitions"), db)).json()) as {
      data: Array<{ code: string }>;
    };

    const codes = body.data.map((definition) => definition.code);
    expect(codes).toContain("base");
    expect(codes).toContain("allowance");
    expect(codes).toContain("bonus");
  });

  test("API-DEF-003 rejects duplicate definition", async () => {
    const db = testDatabase();
    await handleRequest(
      jsonRequest("http://localhost/component-definitions", "POST", { code: "commission", name: "Commission" }),
      db,
    );

    const response = await handleRequest(
      jsonRequest("http://localhost/component-definitions", "POST", { code: "commission", name: "Commission 2" }),
      db,
    );
    expect(response.status).toBe(400);
  });

  test("API-DEF-004 normalizes code", async () => {
    const db = testDatabase();
    const body = (await (
      await handleRequest(
        jsonRequest("http://localhost/component-definitions", "POST", { code: "Commission Payout", name: "CP" }),
        db,
      )
    ).json()) as { code: string };

    expect(body.code).toBe("commission_payout");
  });

  test("API-DEF-005 rejects invalid code", async () => {
    const response = await handleRequest(
      jsonRequest("http://localhost/component-definitions", "POST", { code: "123bad", name: "Bad" }),
      testDatabase(),
    );
    expect(response.status).toBe(400);
  });
});

describe("analytics", () => {
  test("API-ANALYTICS-001 summary headcount matches seed", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 25 });

    const body = (await (await handleRequest(new Request("http://localhost/analytics/summary"), db)).json()) as {
      headcount: number;
    };
    expect(body.headcount).toBe(25);
  });

  test("API-ANALYTICS-003 breakdown by location", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 50 });

    const body = (await (
      await handleRequest(new Request("http://localhost/analytics/breakdown?dimension=location"), db)
    ).json()) as { groups: Array<{ count: number }> };

    expect(body.groups.length).toBeGreaterThan(0);
    expect(body.groups.every((group: { count: number }) => group.count > 0)).toBe(true);
  });

  test("API-ANALYTICS-005 distribution requires job and location", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 50 });

    const body = (await (
      await handleRequest(
        new Request("http://localhost/analytics/distribution?job=Software%20Engineer&location=Berlin"),
        db,
      )
    ).json()) as {
      count: number;
      min: number;
      p25: number;
      median: number;
      p75: number;
      max: number;
    };

    expect(body.count).toBeGreaterThan(0);
    expect(body.min).toBeDefined();
    expect(body.p25).toBeDefined();
    expect(body.median).toBeDefined();
    expect(body.p75).toBeDefined();
    expect(body.max).toBeDefined();
  });

  test("API-ANALYTICS-006 band placement for job", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 50 });

    const body = (await (
      await handleRequest(new Request("http://localhost/analytics/band-placement?job=Software%20Engineer"), db)
    ).json()) as { counts: { below: number; within: number; above: number } };

    expect(body.counts.below + body.counts.within + body.counts.above).toBeGreaterThan(0);
  });

  test("API-ANALYTICS-008 analytics does not mutate stored amounts", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 5 });
    const before = employeeCompHash(db);

    await handleRequest(new Request("http://localhost/analytics/summary"), db);
    await handleRequest(new Request("http://localhost/analytics/breakdown?dimension=job"), db);

    expect(employeeCompHash(db)).toEqual(before);
  });
});

function employeeCompHash(db: ReturnType<typeof testDatabase>) {
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
