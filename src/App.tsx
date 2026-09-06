import { useEffect, useState } from "react";
import { ChartCard } from "./components/ChartCard";
import { DateRangeSelector } from "./components/DateRangeSelector";
import { KpiCard } from "./components/KpiCard";
import { LiveAgencyChart } from "./components/LiveAgencyChart";
import { LiveBoroughChart } from "./components/LiveBoroughChart";
import { LiveChannelChart } from "./components/LiveChannelChart";
import { LiveProblemsChart } from "./components/LiveProblemsChart";
import { RequestsLineChart } from "./components/RequestsLineChart";
import { loadDashboardData } from "./loadDashboardData";
import type { DashboardData } from "./types";
import { formatHours, formatNumber, formatPercent } from "./utils/formatters";

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadDashboardData()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Dashboard data could not be loaded.";
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                New York City Service Requests
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                NYC 311 Operations Dashboard
              </h1>
              <p className="mt-2 text-base text-slate-500">August 2–31, 2026</p>
            </div>
            <DateRangeSelector />
          </div>
        </header>

        {loading && (
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-900">Loading dashboard data</p>
            <p className="mt-2 text-sm text-slate-500">
              Fetching preprocessed 311 request summaries.
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-red-200 bg-white px-6 py-10 shadow-sm">
            <p className="text-sm font-medium text-red-800">Unable to load dashboard data</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              One of the JSON files in <code className="font-mono text-slate-800">/data/</code>{" "}
              could not be loaded. Confirm that the files exist in{" "}
              <code className="font-mono text-slate-800">public/data/</code> and reload the page.
            </p>
            <p className="mt-3 text-sm text-slate-500">{error}</p>
          </div>
        )}

        {data && !loading && !error && (
          <div className="space-y-6">
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Total Requests"
                value={formatNumber(data.summary.totalRequests)}
                description="Service requests created during the selected period"
              />
              <KpiCard
                label="Closed Rate"
                value={formatPercent(data.summary.closedRate)}
                description="Share of requests currently marked Closed"
              />
              <KpiCard
                label="Median Resolution Time"
                value={formatHours(data.summary.medianResolutionHours)}
                description="Median time from creation to closure"
              />
              <KpiCard
                label="Avg Requests / Day"
                value={formatNumber(data.summary.avgRequestsPerDay)}
                description="Average daily request volume"
              />
            </section>

            <ChartCard
              title="Requests by Day"
              subtitle="Daily service request volume"
            >
              <RequestsLineChart
                data={data.dailyRequests}
                avgRequestsPerDay={data.summary.avgRequestsPerDay}
              />
            </ChartCard>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <ChartCard
                className="lg:col-span-3"
                title="Top Problem Types"
                subtitle="Most frequently reported service request categories"
              >
                <LiveProblemsChart fallbackData={data.topProblems} />
              </ChartCard>
              <ChartCard
                className="lg:col-span-2"
                title="Requests by Borough"
                subtitle="Geographic distribution of service requests"
              >
                <LiveBoroughChart fallbackData={data.boroughs} />
              </ChartCard>
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <ChartCard
                className="lg:col-span-3"
                title="Requests by Agency"
                subtitle="Top NYC agencies by request volume"
              >
                <LiveAgencyChart fallbackData={data.agencies} />
              </ChartCard>
              <ChartCard
                className="lg:col-span-2"
                title="Request Channels"
                subtitle="How residents submitted their service requests"
              >
                <LiveChannelChart
                  fallbackData={data.channels}
                  fallbackTotal={data.summary.totalRequests}
                />
              </ChartCard>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
