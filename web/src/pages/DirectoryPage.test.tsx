import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import { DirectoryPage } from "./DirectoryPage";

vi.mock("@/api/client", () => ({
  listEmployees: vi.fn(async () => ({
    total: 1,
    page: 1,
    pageSize: 50,
    data: [
      {
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
      },
    ],
  })),
}));

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <DirectoryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DirectoryPage", () => {
  test("renders employee rows from the API", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Lynne Smithson")).toBeTruthy());
    expect(screen.getByText("Software Engineer")).toBeTruthy();
    expect(screen.getByText("1 employees")).toBeTruthy();
  });
});
