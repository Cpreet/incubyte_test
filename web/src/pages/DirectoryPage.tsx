import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useEmployeesQuery } from "@/api/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FILTER_OPTIONS } from "@/types";
import { useDebouncedValue } from "@/utils/useDebouncedValue";

const PAGE_SIZE = 50;
const ALL = "all";

const FILTER_FIELDS = [
  { param: "job", label: "Job", options: FILTER_OPTIONS.jobs },
  { param: "location", label: "Location", options: FILTER_OPTIONS.locations },
  { param: "org_unit", label: "Org unit", options: FILTER_OPTIONS.orgUnits },
  { param: "level", label: "Level", options: FILTER_OPTIONS.levels },
] as const;

export function DirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const urlSearch = searchParams.get("search") ?? "";

  useEffect(() => {
    setSearchInput((current) => (current === urlSearch ? current : urlSearch));
  }, [urlSearch]);

  const page = Number(searchParams.get("page") ?? "1");

  const queryParams = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debouncedSearch) queryParams.set("search", debouncedSearch);
  for (const field of FILTER_FIELDS) {
    const value = searchParams.get(field.param);
    if (value) queryParams.set(field.param, value);
  }

  const { data, isLoading, isError, error } = useEmployeesQuery(queryParams);

  function updateParam(param: string, value: string | null) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(param, value);
      else next.delete(param);
      next.delete("page");
      return next;
    });
  }

  function setPage(nextPage: number) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("page", String(nextPage));
      return next;
    });
  }

  const activeFilters = FILTER_FIELDS.map((field) => ({ ...field, value: searchParams.get(field.param) })).filter(
    (field) => field.value,
  );
  const activeSearch = searchParams.get("search");

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Employee directory</h1>
        <p className="text-sm text-muted-foreground">{total.toLocaleString()} employees</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-56">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name"
            className="pl-8"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              updateParam("search", event.target.value || null);
            }}
          />
        </div>

        {FILTER_FIELDS.map((field) => (
          <Select
            key={field.param}
            value={searchParams.get(field.param) ?? ALL}
            onValueChange={(value) => updateParam(field.param, value === ALL ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All {field.label.toLowerCase()}s</SelectItem>
              {field.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      {activeFilters.length > 0 || activeSearch ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeSearch ? (
            <Badge variant="secondary" className="gap-1 pr-1">
              Search: {activeSearch}
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchInput("");
                  updateParam("search", null);
                }}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ) : null}
          {activeFilters.map((field) => (
            <Badge key={field.param} variant="secondary" className="gap-1 pr-1">
              {field.label}: {field.value}
              <button type="button" aria-label={`Clear ${field.label}`} onClick={() => updateParam(field.param, null)}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      {isError ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}

      <div className="rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Org unit</TableHead>
              <TableHead>Level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((employee) => (
              <TableRow
                key={employee.employeeId}
                className="cursor-pointer"
                onClick={() => navigate(`/employees/${employee.employeeId}`)}
              >
                <TableCell>
                  <div className="font-medium">{employee.name}</div>
                  <div className="text-xs text-muted-foreground">{employee.employeeId}</div>
                </TableCell>
                <TableCell>{employee.job}</TableCell>
                <TableCell>{employee.location}</TableCell>
                <TableCell>{employee.orgUnit}</TableCell>
                <TableCell>{employee.level}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!isLoading && data?.data.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No employees match these filters.</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {total === 0 ? "0 results" : `${rangeStart}–${rangeEnd} of ${total.toLocaleString()}`}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
