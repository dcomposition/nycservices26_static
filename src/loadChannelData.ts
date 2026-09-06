import type { ChannelStat } from "./types";
import { loadLiveJsonArray } from "./loadLiveApi";

export async function loadChannelData(
  startDate: string,
  endDate: string,
): Promise<ChannelStat[]> {
  return loadLiveJsonArray(
    "/api/311-channels",
    startDate,
    endDate,
    "Channel data could not be loaded for the selected dates.",
    (row) => ({
      channel: String(row.channel ?? "UNKNOWN"),
      requests: Number(row.requests) || 0,
      share: Number(row.share) || 0,
    }),
  );
}
