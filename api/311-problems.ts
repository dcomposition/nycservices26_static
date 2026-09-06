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

type ProblemStat = {
  problem: string;
  requests: number;
  share: number;
};

function normalizeProblems(payload: unknown, totalRequests: number): ProblemStat[] {
  const totals = new Map<string, number>();

  for (const row of extractRows(payload)) {
    const problem = normalizeLabel(readField(row, ["problem", "complaint_type"]), "Unknown");
    const requests = toCount(readField(row, ["requests", "count"]));
    totals.set(problem, (totals.get(problem) ?? 0) + requests);
  }

  return [...totals.entries()]
    .map(([problem, requests]) => ({
      problem,
      requests,
      share: roundShare(requests, totalRequests),
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10);
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
  complaint_type AS problem,
  count(*) AS requests
WHERE ${where}
GROUP BY complaint_type
ORDER BY requests DESC
`.trim(),
    appToken,
    "problem",
  );

  if (!result.ok) {
    return result.response;
  }

  const rows = extractRows(result.payload);
  const totalRequests = rows.reduce(
    (sum, row) => sum + toCount(readField(row, ["requests", "count"])),
    0,
  );
  return jsonResponse(normalizeProblems(result.payload, totalRequests), 200);
}

export const config = socrataFunctionConfig;
