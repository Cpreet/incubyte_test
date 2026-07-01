import { describe, expect, test } from "bun:test";
import { openDatabase } from "./db";
import { seedDatabase } from "./seed";
import { handleRequest } from "./server";

type EmployeeListResponse = {
  total: number;
  pageSize: number;
  data: Array<{ location: string; level: string }>;
};

type EmployeeResponse = {
  employeeId: string;
  level: string;
};

type CompensationResponse = {
  components: Array<{ id: number; type: string }>;
};

describe("handleRequest", () => {
  test("returns health status", async () => {
    const response = await handleRequest(new Request("http://localhost/health"), testDatabase());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, service: "api" });
  });

  test("lists seeded employees with pagination metadata", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 25 });

    const response = await handleRequest(new Request("http://localhost/employees?pageSize=10"), db);
    const body = await response.json() as EmployeeListResponse;

    expect(response.status).toBe(200);
    expect(body.total).toBe(25);
    expect(body.pageSize).toBe(10);
    expect(body.data).toHaveLength(10);
  });

  test("filters employees by location and level", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 50 });

    const response = await handleRequest(new Request("http://localhost/employees?location=Berlin&level=L1"), db);
    const body = await response.json() as EmployeeListResponse;

    expect(response.status).toBe(200);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((employee: { location: string; level: string }) => {
      return employee.location === "Berlin" && employee.level === "L1";
    })).toBe(true);
  });

  test("creates, updates, and deletes an employee", async () => {
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
        components: [{ type: "base", amount: 12000000, currency: "GBP", frequency: "annual" }],
      }),
      db,
    );
    const created = await createResponse.json() as EmployeeResponse;

    expect(createResponse.status).toBe(201);
    expect(created.employeeId).toBe("E00001");

    const updateResponse = await handleRequest(
      jsonRequest(`http://localhost/employees/${created.employeeId}`, "PATCH", { level: "L5" }),
      db,
    );
    const updated = await updateResponse.json() as EmployeeResponse;

    expect(updateResponse.status).toBe(200);
    expect(updated.level).toBe("L5");

    const deleteResponse = await handleRequest(new Request(`http://localhost/employees/${created.employeeId}`, {
      method: "DELETE",
    }), db);

    expect(deleteResponse.status).toBe(200);
  });

  test("returns compensation and updates component amounts", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 1 });

    const compensationResponse = await handleRequest(new Request("http://localhost/employees/E00001/compensation"), db);
    const compensation = await compensationResponse.json() as CompensationResponse;

    expect(compensationResponse.status).toBe(200);
    expect(compensation.components.length).toBeGreaterThan(0);
    const componentId = compensation.components[0]!.id;

    const updateResponse = await handleRequest(
      jsonRequest(`http://localhost/components/${componentId}`, "PATCH", {
        amount: 9990000,
      }),
      db,
    );
    const updated = await updateResponse.json() as { amount: number };

    expect(updateResponse.status).toBe(200);
    expect(updated.amount).toBe(9990000);
  });

  test("rejects component updates without a valid amount", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 1 });

    const compensationResponse = await handleRequest(new Request("http://localhost/employees/E00001/compensation"), db);
    const compensation = await compensationResponse.json() as CompensationResponse;

    const response = await handleRequest(
      jsonRequest(`http://localhost/components/${compensation.components[0]!.id}`, "PATCH", {}),
      db,
    );

    expect(response.status).toBe(400);
  });

  test("creates and deletes a compensation component", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 1 });

    const createResponse = await handleRequest(
      jsonRequest("http://localhost/employees/E00001/components", "POST", {
        type: "bonus",
        amount: 500000,
        currency: "EUR",
        frequency: "one_time",
      }),
      db,
    );
    const created = await createResponse.json() as { id: number };

    expect(createResponse.status).toBe(201);

    const deleteResponse = await handleRequest(new Request(`http://localhost/components/${created.id}`, {
      method: "DELETE",
    }), db);

    expect(deleteResponse.status).toBe(200);
  });

  test("defines a salary component type at runtime and uses it in a package", async () => {
    const db = testDatabase();
    seedDatabase(db, { count: 1 });

    const definitionResponse = await handleRequest(
      jsonRequest("http://localhost/component-definitions", "POST", {
        code: "commission",
        name: "Commission",
        description: "Sales commission payout",
      }),
      db,
    );
    const definition = await definitionResponse.json() as { code: string };

    expect(definitionResponse.status).toBe(201);
    expect(definition.code).toBe("commission");

    const componentResponse = await handleRequest(
      jsonRequest("http://localhost/employees/E00001/components", "POST", {
        type: "commission",
        amount: 750000,
        currency: "EUR",
        frequency: "one_time",
      }),
      db,
    );

    expect(componentResponse.status).toBe(201);

    const compensationResponse = await handleRequest(new Request("http://localhost/employees/E00001/compensation"), db);
    const compensation = await compensationResponse.json() as CompensationResponse;

    expect(compensation.components.some((component) => component.type === "commission")).toBe(true);
  });
});

function testDatabase() {
  return openDatabase(":memory:");
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
