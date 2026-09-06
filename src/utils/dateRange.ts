import type { DateRange, DateRangePreset } from "../types";
import { parseIsoDate } from "./formatters";

export const PRESET_LABELS: Record<DateRangePreset, string> = {
  last7: "Last 7 days",
  last30: "Last 30 days",
  thisMonth: "This month",
  custom: "Custom range",
};

export const DEFAULT_PRESET: DateRangePreset = "last30";

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(isoDate: string, days: number): string {
  const date = parseIsoDate(isoDate);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function compareIsoDates(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

export function maxIsoDate(a: string, b: string): string {
  return compareIsoDates(a, b) >= 0 ? a : b;
}

export function minIsoDate(a: string, b: string): string {
  return compareIsoDates(a, b) <= 0 ? a : b;
}

export function clampDate(value: string, minDate: string, maxDate: string): string {
  return minIsoDate(maxIsoDate(value, minDate), maxDate);
}

export function clampRange(
  start: string,
  end: string,
  minDate: string,
  maxDate: string,
): DateRange {
  let nextStart = clampDate(start, minDate, maxDate);
  let nextEnd = clampDate(end, minDate, maxDate);
  if (compareIsoDates(nextStart, nextEnd) > 0) {
    nextEnd = nextStart;
  }
  return { start: nextStart, end: nextEnd };
}

export function inclusiveRangeEndingOn(end: string, dayCount: number): DateRange {
  return {
    start: addDays(end, -(dayCount - 1)),
    end,
  };
}

export function monthToDateRange(maxDate: string): DateRange {
  const date = parseIsoDate(maxDate);
  const start = toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1));
  return { start, end: maxDate };
}

export function rangeForPreset(
  preset: Exclude<DateRangePreset, "custom">,
  minDate: string,
  maxDate: string,
): DateRange {
  const raw =
    preset === "last7"
      ? inclusiveRangeEndingOn(maxDate, 7)
      : preset === "last30"
        ? inclusiveRangeEndingOn(maxDate, 30)
        : monthToDateRange(maxDate);

  return clampRange(raw.start, raw.end, minDate, maxDate);
}

export function isValidCustomRange(
  start: string,
  end: string,
  minDate: string,
  maxDate: string,
): boolean {
  if (!start || !end) {
    return false;
  }
  return (
    compareIsoDates(start, minDate) >= 0 &&
    compareIsoDates(end, maxDate) <= 0 &&
    compareIsoDates(start, end) <= 0
  );
}
