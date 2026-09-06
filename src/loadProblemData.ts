import type { ProblemStat } from "./types";
import { loadLiveJsonArray } from "./loadLiveApi";

export async function loadProblemData(
  startDate: string,
  endDate: string,
): Promise<ProblemStat[]> {
  return loadLiveJsonArray(
    "/api/311-problems",
    startDate,
    endDate,
    "Problem data could not be loaded for the selected dates.",
    (row) => ({
      problem: String(row.problem ?? "Unknown"),
      requests: Number(row.requests) || 0,
      share: Number(row.share) || 0,
    }),
  );
}
