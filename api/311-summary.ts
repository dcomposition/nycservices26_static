import {
  createdDateWhere,
  enumerateInclusiveDates,
  getSocrataToken,
  jsonResponse,
  parseQueryDates,
  parseTotalCount,
  querySocrata,
  socrataFunctionConfig,
} from "../lib/socrata";

type SummaryResponse = {
  period: { start: string; end: string };
  totalRequests: number;
  closedRequests: number;
  closedRate: number;
  avgRequestsPerDay: number;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function inclusiveDayCount(start: string, end: string): number {
  return enumerateInclusiveDates(start, end).length;
}

function isClientQueryError(status: number): boolean {
  return status >= 400 && status < 500 && status !== 429;
}

async function queryClosedCount(
  where: string,
  appToken: string,
): Promise<{ ok: true; closedRequests: number } | { ok: false; response: Response }> {
  const attempts = [
    {
      name: "closed count case-insensitive",
      query: `
SELECT count(*) AS closed_requests
WHERE ${where} AND lower(status) = 'closed'
`.trim(),
    },
    {
      name: "closed count",
      query: `
SELECT count(*) AS closed_requests
WHERE ${where} AND status = 'Closed'
`.trim(),
    },
  ];

  let lastFailure: Response | undefined;
  for (const attempt of attempts) {
    const result = await querySocrata(attempt.query, appToken, attempt.name);
    if (result.ok) {
      return { ok: true, closedRequests: parseTotalCount(result.payload) };
    }
    lastFailure = result.response;
    if (!isClientQueryError(result.response.status)) {
      return { ok: false, response: result.response };
    }
  }

  return {
    ok: false,
    response:
      lastFailure ??
      jsonResponse({ error: "NYC Open Data could not complete the closed count query." }, 502),
  };
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
  const [totalResult, closedResult] = await Promise.all([
    querySocrata(
      `
SELECT count(*) AS total_requests
WHERE ${where}
`.trim(),
      appToken,
      "summary total",
    ),
    queryClosedCount(where, appToken),
  ]);

  if (!totalResult.ok) {
    return totalResult.response;
  }
  if (!closedResult.ok) {
    return closedResult.response;
  }

  const totalRequests = parseTotalCount(totalResult.payload);
  const closedRequests = closedResult.closedRequests;
  const dayCount = inclusiveDayCount(parsed.start, parsed.end);
  const closedRate = totalRequests === 0 ? 0 : round1((closedRequests / totalRequests) * 100);
  const avgRequestsPerDay = dayCount === 0 ? 0 : round1(totalRequests / dayCount);

  const body: SummaryResponse = {
    period: {
      start: parsed.start,
      end: parsed.end,
    },
    totalRequests,
    closedRequests,
    closedRate,
    avgRequestsPerDay,
  };

  return jsonResponse(body, 200);
}

export const config = socrataFunctionConfig;
