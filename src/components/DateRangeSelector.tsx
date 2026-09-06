import { useEffect, useId, useRef, useState } from "react";
import { useDateRange } from "../dateRange/DateRangeContext";
import type { DateRangePreset } from "../types";
import {
  clampDate,
  isValidCustomRange,
  PRESET_LABELS,
} from "../utils/dateRange";
import { formatAvailableThrough, formatSelectedRange } from "../utils/formatters";

const PRESET_OPTIONS: DateRangePreset[] = ["last7", "last30", "thisMonth", "custom"];

export function DateRangeSelector() {
  const {
    preset,
    range,
    minDate,
    maxDate,
    status,
    error,
    setPreset,
    applyCustomRange,
  } = useDateRange();
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (range) {
      setDraftStart(range.start);
      setDraftEnd(range.end);
    }
  }, [range]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const customValid =
    minDate != null &&
    maxDate != null &&
    isValidCustomRange(draftStart, draftEnd, minDate, maxDate);

  function handlePreset(nextPreset: DateRangePreset) {
    setPreset(nextPreset);
    if (nextPreset !== "custom") {
      setOpen(false);
    }
  }

  function handleFromChange(value: string) {
    if (!minDate || !maxDate) {
      return;
    }
    const nextStart = clampDate(value, minDate, maxDate);
    const nextEnd = draftEnd && nextStart > draftEnd ? nextStart : draftEnd;
    setDraftStart(nextStart);
    if (nextEnd) {
      setDraftEnd(clampDate(nextEnd, nextStart, maxDate));
    }
  }

  function handleToChange(value: string) {
    if (!minDate || !maxDate) {
      return;
    }
    const nextEnd = clampDate(value, minDate, maxDate);
    const nextStart = draftStart && nextEnd < draftStart ? nextEnd : draftStart;
    setDraftEnd(nextEnd);
    if (nextStart) {
      setDraftStart(clampDate(nextStart, minDate, nextEnd));
    }
  }

  function handleApply() {
    if (!customValid) {
      return;
    }
    applyCustomRange({ start: draftStart, end: draftEnd });
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-xs sm:w-auto">
      <button
        type="button"
        className="inline-flex w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={status !== "ready"}
        onClick={() => setOpen((current) => !current)}
      >
        <span>
          {status === "loading" ? "Loading date range…" : PRESET_LABELS[preset]}
        </span>
        <span aria-hidden="true" className="text-slate-400">
          ▾
        </span>
      </button>

      {open && status === "ready" && minDate && maxDate && (
        <div
          id={menuId}
          role="listbox"
          className="absolute right-0 z-20 mt-2 w-72 rounded-md border border-slate-200 bg-white p-2 shadow-sm"
        >
          {PRESET_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={preset === option}
              className={`flex w-full rounded px-3 py-2 text-left text-sm ${
                preset === option
                  ? "bg-slate-100 font-medium text-slate-900"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => handlePreset(option)}
            >
              {PRESET_LABELS[option]}
            </button>
          ))}

          {preset === "custom" && (
            <div className="mt-2 space-y-3 border-t border-slate-200 px-1 pt-3">
              <label className="block text-xs font-medium text-slate-500">
                From
                <input
                  type="date"
                  value={draftStart}
                  min={minDate}
                  max={draftEnd || maxDate}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
                  onChange={(event) => handleFromChange(event.target.value)}
                />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                To
                <input
                  type="date"
                  value={draftEnd}
                  min={draftStart || minDate}
                  max={maxDate}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
                  onChange={(event) => handleToChange(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="w-full rounded-md bg-[#1d4ed8] px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!customValid}
                onClick={handleApply}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}

      {status === "ready" && range && maxDate && (
        <div className="mt-2 space-y-0.5">
          <p className="text-sm text-slate-600">{formatSelectedRange(range.start, range.end)}</p>
          <p className="text-xs text-slate-400">{formatAvailableThrough(maxDate)}</p>
        </div>
      )}

      {status === "error" && (
        <p className="mt-2 text-xs text-red-700">
          {error ?? "Live date range is unavailable. Showing the static dashboard."}
        </p>
      )}
    </div>
  );
}
