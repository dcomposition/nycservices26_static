export type ResolutionMedian = {
  period: { start: string; end: string };
  validResolutionCount: number;
  medianResolutionHours: number | null;
  pagesFetched: number;
  reason?: "range_too_large";
};

const medianCache = new Map<string, ResolutionMedian>();

export function medianRangeCacheKey(startDate: string, endDate: string): string {
  return `${startDate}:${endDate}`;
}

export function getCachedResolutionMedian(
  startDate: string,
  endDate: string,
): ResolutionMedian | undefined {
  return medianCache.get(medianRangeCacheKey(startDate, endDate));
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException || error instanceof Error) &&
    error.name === "AbortError"
  );
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

export async function loadResolutionMedian(
  startDate: string,
  endDate: string,
  signal?: AbortSignal,
): Promise<ResolutionMedian> {
  const errorMessage = "Median resolution could not be loaded for the selected dates.";
  const params = new URLSearchParams({
    start: startDate,
    end: endDate,
  });
  const response = await fetch(`/api/311-resolution-median?${params.toString()}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(errorMessage);
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new Error(errorMessage);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(errorMessage);
  }

  const period =
    payload.period && typeof payload.period === "object" && !Array.isArray(payload.period)
      ? (payload.period as Record<string, unknown>)
      : {};

  const reason = payload.reason === "range_too_large" ? "range_too_large" : undefined;
  const count = toFiniteNumber(payload.validResolutionCount);

  const result: ResolutionMedian = {
    period: {
      start: String(period.start ?? startDate),
      end: String(period.end ?? endDate),
    },
    validResolutionCount: count == null ? 0 : Math.round(count),
    medianResolutionHours:
      payload.medianResolutionHours == null
        ? null
        : toFiniteNumber(payload.medianResolutionHours),
    pagesFetched: Math.max(0, Math.round(toFiniteNumber(payload.pagesFetched) ?? 0)),
    reason,
  };

  medianCache.set(medianRangeCacheKey(startDate, endDate), result);
  return result;
}
