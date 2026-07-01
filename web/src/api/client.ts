import type {
  AnalyticsBreakdown,
  AnalyticsDistribution,
  AnalyticsSummary,
  BandPlacement,
  Compensation,
  ComponentDefinition,
  Employee,
  EmployeeListResponse,
  SalaryComponent,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export function listEmployees(params: URLSearchParams) {
  const query = params.toString();
  return request<EmployeeListResponse>(`/employees${query ? `?${query}` : ""}`);
}

export function getEmployee(employeeId: string) {
  return request<Employee>(`/employees/${employeeId}`);
}

export function getCompensation(employeeId: string) {
  return request<Compensation>(`/employees/${employeeId}/compensation`);
}

export function updateComponentAmount(componentId: number, amount: number) {
  return request<SalaryComponent>(`/components/${componentId}`, {
    method: "PATCH",
    body: JSON.stringify({ amount }),
  });
}

export function createComponent(employeeId: string, body: Omit<SalaryComponent, "id">) {
  return request<SalaryComponent>(`/employees/${employeeId}/components`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listComponentDefinitions() {
  return request<{ data: ComponentDefinition[] }>("/component-definitions");
}

export function getAnalyticsSummary() {
  return request<AnalyticsSummary>("/analytics/summary");
}

export function getAnalyticsBreakdown(dimension: string) {
  return request<AnalyticsBreakdown>(`/analytics/breakdown?dimension=${dimension}`);
}

export function getAnalyticsDistribution(job: string, location: string) {
  const params = new URLSearchParams({ job, location });
  return request<AnalyticsDistribution>(`/analytics/distribution?${params}`);
}

export function getBandPlacement(job: string) {
  return request<BandPlacement>(`/analytics/band-placement?job=${encodeURIComponent(job)}`);
}
