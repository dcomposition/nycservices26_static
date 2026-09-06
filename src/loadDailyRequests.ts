import type { DailyRequest } from "./types";
import { loadLiveJsonArray } from "./loadLiveApi";

export async function loadDailyRequests(
  startDate: string,
  endDate: string,
): Promise<DailyRequest[]> {
  return loadLiveJsonArray(
    "/api/311-daily",
    startDate,
    endDate,
    "Daily request data could not be loaded for the selected dates.",
    (row) => ({
      date: String(row.date ?? ""),
      requests: Number(row.requests) || 0,
    }),
  );
}
