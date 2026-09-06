import type { BoroughStat } from "./types";

export async function loadBoroughData(
  startDate: string,
  endDate: string,
): Promise<BoroughStat[]> {
  const params = new URLSearchParams({
    start: startDate,
    end: endDate,
  });
  const response = await fetch(`/api/311-boroughs?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Borough data could not be loaded for the selected dates.");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("Borough data could not be loaded for the selected dates.");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Borough data could not be loaded for the selected dates.");
  }

  if (!Array.isArray(payload)) {
    throw new Error("Borough data is incomplete.");
  }

  return payload.map((row) => {
    const item = row as Partial<BoroughStat>;
    return {
      borough: String(item.borough ?? "UNSPECIFIED"),
      requests: Number(item.requests) || 0,
      share: Number(item.share) || 0,
    };
  });
}
