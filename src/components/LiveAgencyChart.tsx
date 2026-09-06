import { useEffect, useState } from "react";
import { AgencyChart } from "./AgencyChart";
import { useDateRange } from "../dateRange/DateRangeContext";
import { loadAgencyData } from "../loadAgencyData";
import type { AgencyStat } from "../types";

type LiveAgencyChartProps = {
  fallbackData: AgencyStat[];
};

export function LiveAgencyChart({ fallbackData }: LiveAgencyChartProps) {
  const { startDate, endDate } = useDateRange();
  const [liveData, setLiveData] = useState<AgencyStat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!startDate || !endDate) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadAgencyData(startDate, endDate)
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
              : "Agency data could not be loaded for the selected dates.",
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

  return (
    <div className="relative">
      {loading && <p className="mb-2 text-xs text-slate-400">Updating agency data…</p>}
      {error && <p className="mb-2 text-xs text-red-700">{error}</p>}
      <div className={loading ? "opacity-60" : undefined}>
        <AgencyChart data={chartData} />
      </div>
    </div>
  );
}
