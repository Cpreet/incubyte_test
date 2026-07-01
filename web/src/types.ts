export type Employee = {
  employeeId: string;
  firstName: string;
  lastName: string;
  name: string;
  job: string;
  location: string;
  country: string;
  currency: string;
  orgUnit: string;
  level: string;
  status: string;
};

export type EmployeeListResponse = {
  total: number;
  page: number;
  pageSize: number;
  data: Employee[];
};

export type SalaryComponent = {
  id: number;
  type: string;
  amount: number;
  currency: string;
  frequency: "annual" | "monthly" | "one_time";
};

export type Compensation = {
  employeeId: string;
  package?: { id: number; nativeCurrency: string };
  components: SalaryComponent[];
  annualizedTotal: number;
};

export type ComponentDefinition = {
  code: string;
  name: string;
  description?: string | null;
};

export type AnalyticsSummary = {
  headcount: number;
  totalAnnualizedCompUsd: number;
  meanAnnualizedCompUsd: number;
  medianAnnualizedCompUsd: number;
};

export type BreakdownGroup = {
  key: string;
  count: number;
  totalAnnualizedCompUsd: number;
  meanAnnualizedCompUsd: number;
  medianAnnualizedCompUsd: number;
};

export type AnalyticsBreakdown = {
  dimension: string;
  groups: BreakdownGroup[];
};

export type AnalyticsDistribution = {
  job: string;
  location: string;
  count: number;
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
};

export type BandPlacement = {
  job: string;
  counts: { below: number; within: number; above: number; no_band: number };
  percentages: { below: number; within: number; above: number };
  noBand: number;
};

export const FILTER_OPTIONS = {
  jobs: [
    "Software Engineer",
    "Product Manager",
    "Data Analyst",
    "HR Partner",
    "Sales Manager",
    "Finance Analyst",
  ],
  locations: ["Berlin", "London", "New York", "Bengaluru", "Singapore"],
  orgUnits: ["Engineering", "Product", "People", "Sales", "Finance"],
  levels: ["L1", "L2", "L3", "L4", "L5"],
};
