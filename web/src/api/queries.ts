import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createComponent,
  getAnalyticsBreakdown,
  getAnalyticsDistribution,
  getBandPlacement,
  getAnalyticsSummary,
  getCompensation,
  getEmployee,
  listComponentDefinitions,
  listEmployees,
  updateComponentAmount,
} from "./client";
import type { SalaryComponent } from "../types";

const ANALYTICS_STALE_TIME = 5 * 60_000;

export function useEmployeesQuery(params: URLSearchParams) {
  return useQuery({
    queryKey: ["employees", params.toString()],
    queryFn: () => listEmployees(params),
    placeholderData: (previous) => previous,
  });
}

export function useEmployeeQuery(employeeId: string) {
  return useQuery({
    queryKey: ["employee", employeeId],
    queryFn: () => getEmployee(employeeId),
  });
}

export function useCompensationQuery(employeeId: string) {
  return useQuery({
    queryKey: ["compensation", employeeId],
    queryFn: () => getCompensation(employeeId),
  });
}

export function useComponentDefinitionsQuery() {
  return useQuery({
    queryKey: ["component-definitions"],
    queryFn: listComponentDefinitions,
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function useAnalyticsSummaryQuery() {
  return useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: getAnalyticsSummary,
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function useAnalyticsBreakdownQuery(dimension: string) {
  return useQuery({
    queryKey: ["analytics", "breakdown", dimension],
    queryFn: () => getAnalyticsBreakdown(dimension),
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function useAnalyticsDistributionQuery(job: string, location: string) {
  return useQuery({
    queryKey: ["analytics", "distribution", job, location],
    queryFn: () => getAnalyticsDistribution(job, location),
    staleTime: ANALYTICS_STALE_TIME,
    enabled: Boolean(job && location),
  });
}

export function useBandPlacementQuery(job: string) {
  return useQuery({
    queryKey: ["analytics", "band-placement", job],
    queryFn: () => getBandPlacement(job),
    staleTime: ANALYTICS_STALE_TIME,
    enabled: Boolean(job),
  });
}

export function useUpdateComponentMutation(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ componentId, amount }: { componentId: number; amount: number }) =>
      updateComponentAmount(componentId, amount),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["compensation", employeeId] });
    },
  });
}

export function useCreateComponentMutation(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<SalaryComponent, "id">) => createComponent(employeeId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["compensation", employeeId] });
    },
  });
}
