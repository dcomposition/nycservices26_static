import {
  createdDateWhere,
  extractRows,
  getSocrataToken,
  jsonResponse,
  normalizeLabel,
  parseQueryDates,
  querySocrata,
  readField,
  roundShare,
  socrataFunctionConfig,
  toCount,
} from "../lib/socrata";

type ChannelStat = {
  channel: string;
  requests: number;
  share: number;
};

function normalizeChannels(payload: unknown): ChannelStat[] {
  const totals = new Map<string, number>();

  for (const row of extractRows(payload)) {
    const channel = normalizeLabel(
      readField(row, ["channel", "open_data_channel_type"]),
      "UNKNOWN",
    ).toUpperCase();
    const requests = toCount(readField(row, ["requests", "count"]));
    totals.set(channel, (totals.get(channel) ?? 0) + requests);
  }

  const totalRequests = [...totals.values()].reduce((sum, value) => sum + value, 0);

  return [...totals.entries()]
    .map(([channel, requests]) => ({
      channel,
      requests,
      share: roundShare(requests, totalRequests),
    }))
    .sort((a, b) => b.requests - a.requests);
}

export async function GET(request: Request): Promise<Response> {
  const parsed = parseQueryDates(request);
  if ("error" in parsed) {
    return jsonResponse(parsed, 400);
  }

  const appToken = getSocrataToken();
  if (!appToken) {
    return jsonResponse(
      { error: "Server configuration error: SOCRATA_APP_TOKEN is not set." },
      500,
    );
  }

  const where = createdDateWhere(parsed.start, parsed.end);
  const result = await querySocrata(
    `
SELECT
  open_data_channel_type AS channel,
  count(*) AS requests
WHERE ${where}
GROUP BY open_data_channel_type
ORDER BY requests DESC
`.trim(),
    appToken,
    "channel",
  );

  if (!result.ok) {
    return result.response;
  }

  return jsonResponse(normalizeChannels(result.payload), 200);
}

export const config = socrataFunctionConfig;
