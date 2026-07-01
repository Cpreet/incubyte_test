import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  };
});

vi.mock("@/api/client", () => ({
  getAnalyticsSummary: vi.fn(async () => ({
    headcount: 10000,
    totalAnnualizedCompUsd: 111613821937,
    meanAnnualizedCompUsd: 11161382,
    medianAnnualizedCompUsd: 12661400,
  })),
  getAnalyticsBreakdown: vi.fn(async () => ({
    dimension: "job",
    groups: [
      { key: "Data Analyst", count: 1667, totalAnnualizedCompUsd: 1, meanAnnualizedCompUsd: 1, medianAnnualizedCompUsd: 1 },
    ],
  })),
  getAnalyticsDistribution: vi.fn(async () => ({
    job: "Software Engineer",
    location: "Berlin",
    count: 334,
    min: 11396000,
    p25: 11506880,
    median: 11913880,
    p75: 12328800,
    max: 12447600,
  })),
  getBandPlacement: vi.fn(async () => ({
    job: "Software Engineer",
    counts: { below: 0, within: 1667, above: 0, no_band: 0 },
    percentages: { below: 0, within: 100, above: 0 },
    noBand: 0,
  })),
}));

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DashboardPage", () => {
  test("renders summary stats and breakdown groups", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("10,000")).toBeTruthy());
    expect(screen.getByText("Headcount")).toBeTruthy();
    expect(screen.getByText("Data Analyst")).toBeTruthy();
  });
});
