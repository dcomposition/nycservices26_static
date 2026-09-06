import type { AgencyStat } from "./types";
import { loadLiveJsonArray } from "./loadLiveApi";

export async function loadAgencyData(
  startDate: string,
  endDate: string,
): Promise<AgencyStat[]> {
  return loadLiveJsonArray(
    "/api/311-agencies",
    startDate,
    endDate,
    "Agency data could not be loaded for the selected dates.",
    (row) => ({
      agency: String(row.agency ?? "UNKNOWN"),
      agencyName: String(row.agencyName ?? row.agency ?? "UNKNOWN"),
      requests: Number(row.requests) || 0,
      share: Number(row.share) || 0,
    }),
  );
}
