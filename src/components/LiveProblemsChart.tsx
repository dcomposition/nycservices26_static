import { useEffect, useState } from "react";
import { ProblemsChart } from "./ProblemsChart";
import { useDateRange } from "../dateRange/DateRangeContext";
import { loadProblemData } from "../loadProblemData";
import type { ProblemStat } from "../types";

type LiveProblemsChartProps = {
  fallbackData: ProblemStat[];
};

export function LiveProblemsChart({ fallbackData }: LiveProblemsChartProps) {
  const { startDate, endDate } = useDateRange();
  const [liveData, setLiveData] = useState<ProblemStat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!startDate || !endDate) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadProblemData(startDate, endDate)
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
              : "Problem data could not be loaded for the selected dates.",
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
      {loading && <p className="mb-2 text-xs text-slate-400">Updating problem data…</p>}
      {error && <p className="mb-2 text-xs text-red-700">{error}</p>}
      <div className={loading ? "opacity-60" : undefined}>
        <ProblemsChart data={chartData} />
      </div>
    </div>
  );
}
