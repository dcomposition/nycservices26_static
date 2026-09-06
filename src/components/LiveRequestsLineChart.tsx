import { useEffect, useMemo, useState } from "react";
import { RequestsLineChart } from "./RequestsLineChart";
import { useDateRange } from "../dateRange/DateRangeContext";
import { loadDailyRequests } from "../loadDailyRequests";
import type { DailyRequest } from "../types";

type LiveRequestsLineChartProps = {
  fallbackData: DailyRequest[];
};

export function LiveRequestsLineChart({ fallbackData }: LiveRequestsLineChartProps) {
  const { startDate, endDate } = useDateRange();
  const [liveData, setLiveData] = useState<DailyRequest[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!startDate || !endDate) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadDailyRequests(startDate, endDate)
      .then((rows) => {
        if (!cancelled) {
          setLiveData(rows);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Daily request data could not be loaded for the selected dates.",
          );
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
  }, [endDate, startDate]);

  const chartData = liveData ?? fallbackData;
  const avgRequestsPerDay = useMemo(() => {
    if (chartData.length === 0) {
      return 0;
    }
    const total = chartData.reduce((sum, row) => sum + row.requests, 0);
    return total / chartData.length;
  }, [chartData]);

  return (
    <div className="relative">
      {loading && <p className="mb-2 text-xs text-slate-400">Updating daily request data…</p>}
      {error && <p className="mb-2 text-xs text-red-700">{error}</p>}
      <div className={loading ? "opacity-60" : undefined}>
        <RequestsLineChart data={chartData} avgRequestsPerDay={avgRequestsPerDay} />
      </div>
    </div>
  );
}
