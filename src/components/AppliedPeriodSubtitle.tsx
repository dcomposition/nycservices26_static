import { useDateRange } from "../dateRange/DateRangeContext";
import { formatAppliedPeriod } from "../utils/formatters";

const STATIC_PERIOD_LABEL = "August 2–31, 2026";

export function AppliedPeriodSubtitle() {
  const { startDate, endDate, status } = useDateRange();

  if (status === "ready" && startDate && endDate) {
    return <p className="mt-2 text-base text-slate-500">{formatAppliedPeriod(startDate, endDate)}</p>;
  }

  if (status === "loading") {
    return <p className="mt-2 text-base text-slate-500">Loading selected dates…</p>;
  }

  return <p className="mt-2 text-base text-slate-500">{STATIC_PERIOD_LABEL}</p>;
}
