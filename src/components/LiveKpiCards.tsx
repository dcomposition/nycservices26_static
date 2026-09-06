import { useEffect, useState } from "react";
import { KpiCard } from "./KpiCard";
import { useDateRange } from "../dateRange/DateRangeContext";
import {
  loadResolutionMedian,
  type ResolutionMedian,
} from "../loadResolutionMedian";
import {
  loadSummaryData,
  summaryFromFallback,
  type LiveSummary,
} from "../loadSummaryData";
import type { Summary } from "../types";
import { formatHours, formatNumber, formatPercent } from "../utils/formatters";

type LiveKpiCardsProps = {
  fallbackSummary: Summary;
};

function rangeKey(start: string, end: string): string {
  return `${start}|${end}`;
}

export function LiveKpiCards({ fallbackSummary }: LiveKpiCardsProps) {
  const { startDate, endDate } = useDateRange();
  const [liveSummary, setLiveSummary] = useState<LiveSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [median, setMedian] = useState<ResolutionMedian | null>(null);
  const [medianLoading, setMedianLoading] = useState(false);
  const [medianError, setMedianError] = useState<string | null>(null);

  useEffect(() => {
    if (!startDate || !endDate) {
      return;
    }

    let cancelled = false;
    setSummaryLoading(true);
    setSummaryError(null);

    loadSummaryData(startDate, endDate)
      .then((summary) => {
        if (!cancelled) {
          setLiveSummary(summary);
          setSummaryError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSummaryError(
            err instanceof Error
              ? err.message
              : "Summary data could not be loaded for the selected dates.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [endDate, startDate]);

  useEffect(() => {
    if (!startDate || !endDate) {
      return;
    }

    let cancelled = false;
    setMedianLoading(true);
    setMedianError(null);

    loadResolutionMedian(startDate, endDate)
      .then((result) => {
        if (!cancelled) {
          setMedian(result);
          setMedianError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setMedianError(
            err instanceof Error
              ? err.message
              : "Median resolution could not be loaded for the selected dates.",
          );
          setMedian({
            period: { start: startDate, end: endDate },
            validResolutionCount: 0,
            medianResolutionHours: null,
            pagesFetched: 0,
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMedianLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [endDate, startDate]);

  const summary = liveSummary ?? summaryFromFallback(fallbackSummary);
  const appliedKey = startDate && endDate ? rangeKey(startDate, endDate) : null;
  const medianKey = median
    ? rangeKey(median.period.start, median.period.end)
    : null;
  const medianMatchesApplied = Boolean(appliedKey && medianKey === appliedKey);
  const successfulHours =
    medianMatchesApplied && median?.medianResolutionHours != null
      ? median.medianResolutionHours
      : null;

  let medianValue = "N/A";
  let medianFootnote: string | undefined;
  let medianCardLoading = false;

  if (!appliedKey) {
    medianFootnote = "Live median unavailable";
  } else if (medianMatchesApplied && median?.reason === "range_too_large") {
    medianFootnote = "Available for ranges up to 90 days";
  } else if (successfulHours != null) {
    medianValue = formatHours(successfulHours);
    medianCardLoading = medianLoading;
  } else if (medianLoading) {
    medianFootnote = "Calculating live median…";
    medianCardLoading = true;
  } else {
    medianFootnote = "Live median unavailable";
  }

  return (
    <div className="space-y-2">
      {summaryLoading && (
        <p className="text-xs text-slate-400">Updating summary metrics…</p>
      )}
      {summaryError && <p className="text-xs text-red-700">{summaryError}</p>}
      {medianError && successfulHours == null && (
        <p className="text-xs text-red-700">{medianError}</p>
      )}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Requests"
          value={formatNumber(summary.totalRequests)}
          description="Service requests created during the selected period"
          loading={summaryLoading}
        />
        <KpiCard
          label="Closed Rate"
          value={formatPercent(summary.closedRate)}
          description="Share of requests currently marked Closed"
          loading={summaryLoading}
        />
        <KpiCard
          label="Median Resolution Time"
          value={medianValue}
          description="Median time from creation to closure"
          footnote={medianFootnote}
          loading={medianCardLoading}
        />
        <KpiCard
          label="Avg Requests / Day"
          value={formatNumber(summary.avgRequestsPerDay)}
          description="Average daily request volume"
          loading={summaryLoading}
        />
      </section>
    </div>
  );
}
