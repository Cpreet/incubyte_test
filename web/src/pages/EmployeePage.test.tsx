import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import { EmployeePage } from "./EmployeePage";

vi.mock("@/api/client", () => ({
  getEmployee: vi.fn(async () => ({
    employeeId: "E00001",
    firstName: "Lynne",
    lastName: "Smithson",
    name: "Lynne Smithson",
    job: "Software Engineer",
    location: "Berlin",
    country: "Germany",
    currency: "EUR",
    orgUnit: "Engineering",
    level: "L1",
    status: "active",
  })),
  getCompensation: vi.fn(async () => ({
    employeeId: "E00001",
    package: { id: 1, nativeCurrency: "EUR" },
    components: [
      { id: 1, type: "base", amount: 9250000, currency: "EUR", frequency: "annual" },
      { id: 2, type: "allowance", amount: 92500, currency: "EUR", frequency: "monthly" },
    ],
    annualizedTotal: 11100000,
  })),
  listComponentDefinitions: vi.fn(async () => ({
    data: [
      { code: "base", name: "Base salary" },
      { code: "bonus", name: "Bonus" },
    ],
  })),
}));

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/employees/E00001"]}>
        <Routes>
          <Route path="/employees/:employeeId" element={<EmployeePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EmployeePage", () => {
  test("renders employee header and compensation components", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Lynne Smithson")).toBeTruthy());
    expect(screen.getByText("base")).toBeTruthy();
    expect(screen.getByText("allowance")).toBeTruthy();
  });
});
