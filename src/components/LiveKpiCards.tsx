import { useEffect, useState } from "react";
import { KpiCard } from "./KpiCard";
import { useDateRange } from "../dateRange/DateRangeContext";
import {
  getCachedResolutionMedian,
  isAbortError,
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

function matchesAppliedRange(
  median: ResolutionMedian | null,
  startDate: string | null,
  endDate: string | null,
): boolean {
  return Boolean(
    median &&
      startDate &&
      endDate &&
      median.period.start === startDate &&
      median.period.end === endDate,
  );
}

export function LiveKpiCards({ fallbackSummary }: LiveKpiCardsProps) {
  const { startDate, endDate } = useDateRange();
  const [liveSummary, setLiveSummary] = useState<LiveSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [median, setMedian] = useState<ResolutionMedian | null>(null);
  const [medianLoading, setMedianLoading] = useState(false);
  const [medianErrorKey, setMedianErrorKey] = useState<string | null>(null);

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

    const cached = getCachedResolutionMedian(startDate, endDate);
    if (cached) {
      setMedian(cached);
      setMedianLoading(false);
      setMedianErrorKey(null);
      return;
    }

    const requestKey = `${startDate}:${endDate}`;
    const controller = new AbortController();
    setMedianLoading(true);
    setMedianErrorKey(null);

    loadResolutionMedian(startDate, endDate, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }
        setMedian(result);
        setMedianLoading(false);
        setMedianErrorKey(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) {
          return;
        }
        setMedianLoading(false);
        setMedianErrorKey(requestKey);
      });

    return () => {
      controller.abort();
    };
  }, [endDate, startDate]);

  const summary = liveSummary ?? summaryFromFallback(fallbackSummary);
  const cachedMedian =
    startDate && endDate
      ? getCachedResolutionMedian(startDate, endDate)
      : undefined;
  const currentMedian =
    cachedMedian ??
    (matchesAppliedRange(median, startDate, endDate) ? median : null);
  const appliedKey = startDate && endDate ? `${startDate}:${endDate}` : null;
  const medianFailed = Boolean(appliedKey && medianErrorKey === appliedKey);

  let medianValue = "N/A";
  let medianFootnote: string | undefined;
  let medianCardLoading = false;

  if (!appliedKey) {
    medianFootnote = "Live median unavailable";
  } else if (currentMedian?.reason === "range_too_large") {
    medianFootnote = "Available for ranges up to 90 days";
  } else if (currentMedian?.medianResolutionHours != null) {
    medianValue = formatHours(currentMedian.medianResolutionHours);
  } else if (!medianFailed && (medianLoading || !currentMedian)) {
    medianValue = "Calculating…";
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
