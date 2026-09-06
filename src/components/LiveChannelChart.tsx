import { useEffect, useState } from "react";
import { ChannelChart } from "./ChannelChart";
import { useDateRange } from "../dateRange/DateRangeContext";
import { loadChannelData } from "../loadChannelData";
import type { ChannelStat } from "../types";

type LiveChannelChartProps = {
  fallbackData: ChannelStat[];
  fallbackTotal: number;
};

export function LiveChannelChart({ fallbackData, fallbackTotal }: LiveChannelChartProps) {
  const { startDate, endDate } = useDateRange();
  const [liveData, setLiveData] = useState<ChannelStat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!startDate || !endDate) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadChannelData(startDate, endDate)
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
              : "Channel data could not be loaded for the selected dates.",
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
  const totalRequests = liveData
    ? liveData.reduce((sum, row) => sum + row.requests, 0)
    : fallbackTotal;

  return (
    <div className="relative">
      {loading && <p className="mb-2 text-xs text-slate-400">Updating channel data…</p>}
      {error && <p className="mb-2 text-xs text-red-700">{error}</p>}
      <div className={loading ? "opacity-60" : undefined}>
        <ChannelChart data={chartData} totalRequests={totalRequests} />
      </div>
    </div>
  );
}
