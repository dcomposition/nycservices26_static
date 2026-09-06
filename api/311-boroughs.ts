import {
  createdDateWhere,
  extractRows,
  getSocrataToken,
  jsonResponse,
  parseQueryDates,
  querySocrata,
  readField,
  roundShare,
  socrataFunctionConfig,
  toCount,
} from "../lib/socrata";

type BoroughStat = {
  borough: string;
  requests: number;
  share: number;
};

function normalizeBorough(value: unknown): string {
  if (value == null) {
    return "UNSPECIFIED";
  }
  const text = String(value).trim();
  if (!text || text.toUpperCase() === "UNSPECIFIED") {
    return "UNSPECIFIED";
  }
  return text;
}

function normalizeBoroughStats(payload: unknown): BoroughStat[] {
  const totals = new Map<string, number>();

  for (const row of extractRows(payload)) {
    const borough = normalizeBorough(readField(row, ["borough"]));
    const requests = toCount(readField(row, ["requests", "count"]));
    totals.set(borough, (totals.get(borough) ?? 0) + requests);
  }

  const totalRequests = [...totals.values()].reduce((sum, value) => sum + value, 0);

  return [...totals.entries()]
    .map(([borough, requests]) => ({
      borough,
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
  borough,
  count(*) AS requests
WHERE ${where}
GROUP BY borough
ORDER BY requests DESC
`.trim(),
    appToken,
    "borough",
  );

  if (!result.ok) {
    return result.response;
  }

  return jsonResponse(normalizeBoroughStats(result.payload), 200);
}

export const config = socrataFunctionConfig;
