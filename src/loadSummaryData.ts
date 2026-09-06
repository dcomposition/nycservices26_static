import type { Summary } from "./types";

export type LiveSummary = {
  period: { start: string; end: string };
  totalRequests: number;
  closedRequests: number;
  closedRate: number;
  avgRequestsPerDay: number;
};

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

function requiredNumber(value: unknown, errorMessage: string): number {
  const numeric = toFiniteNumber(value);
  if (numeric == null) {
    throw new Error(errorMessage);
  }
  return numeric;
}

export async function loadSummaryData(
  startDate: string,
  endDate: string,
): Promise<LiveSummary> {
  const errorMessage = "Summary data could not be loaded for the selected dates.";
  const params = new URLSearchParams({
    start: startDate,
    end: endDate,
  });
  const response = await fetch(`/api/311-summary?${params.toString()}`);
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
  } catch {
    throw new Error(errorMessage);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(errorMessage);
  }

  const period =
    payload.period && typeof payload.period === "object" && !Array.isArray(payload.period)
      ? (payload.period as Record<string, unknown>)
      : {};

  return {
    period: {
      start: String(period.start ?? startDate),
      end: String(period.end ?? endDate),
    },
    totalRequests: requiredNumber(payload.totalRequests, errorMessage),
    closedRequests: requiredNumber(payload.closedRequests, errorMessage),
    closedRate: requiredNumber(payload.closedRate, errorMessage),
    avgRequestsPerDay: requiredNumber(payload.avgRequestsPerDay, errorMessage),
  };
}

export function summaryFromFallback(fallback: Summary): LiveSummary {
  return {
    period: fallback.period,
    totalRequests: fallback.totalRequests,
    closedRequests: fallback.closedRequests,
    closedRate: fallback.closedRate,
    avgRequestsPerDay: fallback.avgRequestsPerDay,
  };
}
