import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadDatasetMeta } from "../loadDatasetMeta";
import type { DateRange, DateRangePreset, DatasetMeta } from "../types";
import { DEFAULT_PRESET, rangeForPreset } from "../utils/dateRange";

type DateRangeStatus = "loading" | "ready" | "error";

type DateRangeContextValue = {
  preset: DateRangePreset;
  range: DateRange | null;
  startDate: string | null;
  endDate: string | null;
  minDate: string | null;
  maxDate: string | null;
  status: DateRangeStatus;
  error: string | null;
  setPreset: (preset: DateRangePreset) => void;
  applyCustomRange: (range: DateRange) => void;
};

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [status, setStatus] = useState<DateRangeStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [preset, setPresetState] = useState<DateRangePreset>(DEFAULT_PRESET);
  const [customRange, setCustomRange] = useState<DateRange | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadDatasetMeta()
      .then((result) => {
        if (cancelled) {
          return;
        }
        setMeta(result);
        setCustomRange(rangeForPreset("last30", result.minDate, result.maxDate));
        setStatus("ready");
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setMeta(null);
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : "Dataset date range could not be loaded.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const range = useMemo(() => {
    if (!meta) {
      return null;
    }
    if (preset === "custom") {
      return customRange ?? rangeForPreset("last30", meta.minDate, meta.maxDate);
    }
    return rangeForPreset(preset, meta.minDate, meta.maxDate);
  }, [customRange, meta, preset]);

  const setPreset = useCallback(
    (nextPreset: DateRangePreset) => {
      setPresetState(nextPreset);
      if (nextPreset !== "custom" && meta) {
        setCustomRange(rangeForPreset(nextPreset, meta.minDate, meta.maxDate));
      }
    },
    [meta],
  );

  const applyCustomRange = useCallback((nextRange: DateRange) => {
    setPresetState("custom");
    setCustomRange(nextRange);
  }, []);

  const value = useMemo<DateRangeContextValue>(
    () => ({
      preset,
      range,
      startDate: range?.start ?? null,
      endDate: range?.end ?? null,
      minDate: meta?.minDate ?? null,
      maxDate: meta?.maxDate ?? null,
      status,
      error,
      setPreset,
      applyCustomRange,
    }),
    [applyCustomRange, error, meta, preset, range, setPreset, status],
  );

  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>;
}

export function useDateRange(): DateRangeContextValue {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error("useDateRange must be used within a DateRangeProvider.");
  }
  return context;
}
