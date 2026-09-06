import {
  createdDateWhere,
  enumerateInclusiveDates,
  extractRows,
  getSocrataToken,
  jsonResponse,
  normalizeIsoDate,
  parseQueryDates,
  querySocrata,
  readField,
  socrataFunctionConfig,
  toCount,
} from "../lib/socrata";

type DailyRequest = {
  date: string;
  requests: number;
};

function fillDailyRange(
  payload: unknown,
  start: string,
  end: string,
): DailyRequest[] {
  const counts = new Map<string, number>();

  for (const row of extractRows(payload)) {
    const date = normalizeIsoDate(readField(row, ["date", "request_date", "day"]));
    if (!date) {
      continue;
    }
    counts.set(date, (counts.get(date) ?? 0) + toCount(readField(row, ["requests", "count"])));
  }

  return enumerateInclusiveDates(start, end).map((date) => ({
    date,
    requests: counts.get(date) ?? 0,
  }));
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
  date_trunc_ymd(created_date) AS date,
  count(*) AS requests
WHERE ${where}
GROUP BY date_trunc_ymd(created_date)
ORDER BY date ASC
`.trim(),
    appToken,
    "daily",
  );

  if (!result.ok) {
    return result.response;
  }

  return jsonResponse(fillDailyRange(result.payload, parsed.start, parsed.end), 200);
}

export const config = socrataFunctionConfig;
