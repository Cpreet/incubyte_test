import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  useAnalyticsBreakdownQuery,
  useAnalyticsDistributionQuery,
  useAnalyticsSummaryQuery,
  useBandPlacementQuery,
} from "@/api/queries";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FILTER_OPTIONS } from "@/types";
import { formatMoney } from "@/utils/money";

const DIMENSIONS = [
  { value: "job", label: "Job" },
  { value: "level", label: "Level" },
  { value: "location", label: "Location" },
  { value: "org_unit", label: "Org unit" },
] as const;

export function DashboardPage() {
  const [dimension, setDimension] = useState<string>("job");
  const [distributionJob, setDistributionJob] = useState(FILTER_OPTIONS.jobs[0]!);
  const [distributionLocation, setDistributionLocation] = useState(FILTER_OPTIONS.locations[0]!);
  const [bandJob, setBandJob] = useState(FILTER_OPTIONS.jobs[0]!);
  const navigate = useNavigate();

  const summaryQuery = useAnalyticsSummaryQuery();
  const breakdownQuery = useAnalyticsBreakdownQuery(dimension);
  const distributionQuery = useAnalyticsDistributionQuery(distributionJob, distributionLocation);
  const bandQuery = useBandPlacementQuery(bandJob);

  const summary = summaryQuery.data;
  const breakdown = breakdownQuery.data;
  const distribution = distributionQuery.data;
  const band = bandQuery.data;

  function goToDirectoryFilteredByJob(job: string) {
    navigate(`/?${new URLSearchParams({ job }).toString()}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pay dashboard</h1>
        <p className="text-sm text-muted-foreground">Company-wide compensation analytics in USD</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Headcount" value={summary ? summary.headcount.toLocaleString() : "—"} />
        <StatCard
          label="Total annual cost"
          value={summary ? formatMoney(summary.totalAnnualizedCompUsd, "USD") : "—"}
        />
        <StatCard label="Mean" value={summary ? formatMoney(summary.meanAnnualizedCompUsd, "USD") : "—"} />
        <StatCard label="Median" value={summary ? formatMoney(summary.medianAnnualizedCompUsd, "USD") : "—"} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Breakdown</CardTitle>
          <Tabs value={dimension} onValueChange={setDimension}>
            <TabsList>
              {DIMENSIONS.map((dim) => (
                <TabsTrigger key={dim.value} value={dim.value}>
                  {dim.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {breakdown ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown.groups} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border" />
                  <XAxis dataKey="key" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tickFormatter={(value: number) => formatMoney(value, "USD")} width={80} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatMoney(Number(value), "USD")} />
                  <Bar dataKey="meanAnnualizedCompUsd" name="Mean comp" radius={[4, 4, 0, 0]} className="fill-primary" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          {breakdown ? (
            <div className="rounded-lg ring-1 ring-foreground/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Mean</TableHead>
                    <TableHead>Median</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.groups.map((group) => (
                    <TableRow key={group.key}>
                      <TableCell>{group.key}</TableCell>
                      <TableCell>{group.count}</TableCell>
                      <TableCell>{formatMoney(group.totalAnnualizedCompUsd, "USD")}</TableCell>
                      <TableCell>{formatMoney(group.meanAnnualizedCompUsd, "USD")}</TableCell>
                      <TableCell>{formatMoney(group.medianAnnualizedCompUsd, "USD")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribution</CardTitle>
            <div className="flex gap-2 pt-1">
              <Select value={distributionJob} onValueChange={setDistributionJob}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILTER_OPTIONS.jobs.map((job) => (
                    <SelectItem key={job} value={job}>
                      {job}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={distributionLocation} onValueChange={setDistributionLocation}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILTER_OPTIONS.locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {distribution ? <DistributionChart distribution={distribution} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Band placement</CardTitle>
            <div className="pt-1">
              <Select value={bandJob} onValueChange={setBandJob}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILTER_OPTIONS.jobs.map((job) => (
                    <SelectItem key={job} value={job}>
                      {job}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {band ? (
              <BandChart band={band} onSegmentClick={() => goToDirectoryFilteredByJob(bandJob)} />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DistributionChart({
  distribution,
}: {
  distribution: { count: number; min: number; p25: number; median: number; p75: number; max: number };
}) {
  const { min, p25, median, p75, max } = distribution;
  const range = Math.max(1, max - min);
  const pct = (value: number) => ((value - min) / range) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="pt-6 pb-8">
        <div className="relative h-2 rounded-full bg-muted">
          <div
            className="absolute h-2 rounded-full bg-primary/30"
            style={{ left: `${pct(p25)}%`, width: `${pct(p75) - pct(p25)}%` }}
          />
          <div className="absolute h-2 w-0.5 -translate-x-1/2 bg-primary" style={{ left: `${pct(median)}%` }} />
          <div
            className="absolute top-1/2 size-2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-foreground"
            style={{ left: `${pct(min)}%` }}
          />
          <div
            className="absolute top-1/2 size-2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-foreground"
            style={{ left: `${pct(max)}%` }}
          />
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3 text-sm sm:grid-cols-5">
        {(
          [
            ["Employees", distribution.count.toLocaleString()],
            ["Min", formatMoney(min, "USD")],
            ["P25", formatMoney(p25, "USD")],
            ["Median", formatMoney(median, "USD")],
            ["P75", formatMoney(p75, "USD")],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
        <div>
          <dt className="text-xs text-muted-foreground">Max</dt>
          <dd className="font-medium">{formatMoney(max, "USD")}</dd>
        </div>
      </dl>
    </div>
  );
}

function BandChart({
  band,
  onSegmentClick,
}: {
  band: {
    counts: { below: number; within: number; above: number; no_band: number };
    percentages: { below: number; within: number; above: number };
    noBand: number;
  };
  onSegmentClick: () => void;
}) {
  const segments = [
    { key: "below" as const, label: "Below band", count: band.counts.below, pct: band.percentages.below, clickable: true },
    { key: "within" as const, label: "Within band", count: band.counts.within, pct: band.percentages.within, clickable: false },
    { key: "above" as const, label: "Above band", count: band.counts.above, pct: band.percentages.above, clickable: true },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-8 w-full overflow-hidden rounded-lg ring-1 ring-foreground/10">
        {segments.map((segment) => (
          <button
            key={segment.key}
            type="button"
            disabled={!segment.clickable || segment.count === 0}
            onClick={() => segment.clickable && onSegmentClick()}
            className={`flex items-center justify-center text-xs font-medium text-primary-foreground transition-opacity ${
              segment.key === "within" ? "bg-primary/40 text-foreground" : "bg-primary"
            } ${segment.clickable && segment.count > 0 ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
            style={{ width: `${Math.max(segment.pct, segment.count > 0 ? 4 : 0)}%` }}
            title={`${segment.label}: ${segment.count} (${segment.pct}%)`}
          >
            {segment.pct >= 8 ? `${segment.pct}%` : ""}
          </button>
        ))}
      </div>

      <dl className="grid grid-cols-3 gap-3 text-sm">
        {segments.map((segment) => (
          <div key={segment.key}>
            <dt className="text-xs text-muted-foreground">{segment.label}</dt>
            <dd className="font-medium">
              {segment.count} ({segment.pct}%)
            </dd>
          </div>
        ))}
      </dl>

      {band.noBand > 0 ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {band.noBand} employee{band.noBand === 1 ? "" : "s"} have no pay range defined for their job, location, and
          level.
        </p>
      ) : null}
    </div>
  );
}
