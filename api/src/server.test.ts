import { describe, expect, test } from "bun:test";
import { handleRequest } from "./server";

describe("handleRequest", () => {
  test("returns health status", async () => {
    const response = handleRequest(new Request("http://localhost/health"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, service: "api" });
  });

  test("returns the default payload", async () => {
    const response = handleRequest(new Request("http://localhost/"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Hello via Bun!" });
  });
});
