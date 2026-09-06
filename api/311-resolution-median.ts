import {
  createdDateWhere,
  enumerateInclusiveDates,
  extractRows,
  getSocrataToken,
  jsonResponse,
  parseQueryDates,
  querySocrata,
  readField,
} from "../lib/socrata";

const PAGE_SIZE = 50_000;
const MAX_LIVE_DAYS = 90;
const MAX_PAGES = 40;

const NAIVE_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/;

type MedianResponse = {
  period: { start: string; end: string };
  validResolutionCount: number;
  medianResolutionHours: number | null;
  pagesFetched: number;
  reason?: "range_too_large";
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function inclusiveDayCount(start: string, end: string): number {
  return enumerateInclusiveDates(start, end).length;
}

function parseNaiveTimestampMs(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  const match = NAIVE_TIMESTAMP.exec(String(value).trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const fraction = match[7] ?? "0";
  const millisecond = Number(fraction.slice(0, 3).padEnd(3, "0"));
  const ms = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  return Number.isFinite(ms) ? ms : null;
}

function resolutionHoursFromRow(row: Record<string, unknown>): number | null {
  const createdMs = parseNaiveTimestampMs(readField(row, ["created_date"]));
  const closedMs = parseNaiveTimestampMs(readField(row, ["closed_date"]));
  if (createdMs == null || closedMs == null || closedMs < createdMs) {
    return null;
  }
  return (closedMs - createdMs) / 3_600_000;
}

function exactMedian(values: number[]): number | null {
  const n = values.length;
  if (n === 0) {
    return null;
  }
  values.sort((a, b) => a - b);
  if (n % 2 === 1) {
    return values[Math.floor(n / 2)];
  }
  return (values[n / 2 - 1] + values[n / 2]) / 2;
}

export async function GET(request: Request): Promise<Response> {
  const parsed = parseQueryDates(request);
  if ("error" in parsed) {
    return jsonResponse(parsed, 400);
  }

  if (inclusiveDayCount(parsed.start, parsed.end) > MAX_LIVE_DAYS) {
    const tooLarge: MedianResponse = {
      period: { start: parsed.start, end: parsed.end },
      validResolutionCount: 0,
      medianResolutionHours: null,
      pagesFetched: 0,
      reason: "range_too_large",
    };
    return jsonResponse(tooLarge, 200);
  }

  const appToken = getSocrataToken();
  if (!appToken) {
    return jsonResponse(
      { error: "Server configuration error: SOCRATA_APP_TOKEN is not set." },
      500,
    );
  }

  const where = createdDateWhere(parsed.start, parsed.end);
  const queryWithKey = `
SELECT created_date, closed_date
WHERE ${where}
  AND closed_date IS NOT NULL
  AND closed_date >= created_date
ORDER BY unique_key
`.trim();
  const queryFallback = `
SELECT created_date, closed_date
WHERE ${where}
  AND closed_date IS NOT NULL
  AND closed_date >= created_date
ORDER BY created_date, closed_date
`.trim();

  const hours: number[] = [];
  let pageNumber = 1;
  let query = queryWithKey;
  let usedFallbackOrder = false;

  while (pageNumber <= MAX_PAGES) {
    const result = await querySocrata(query, appToken, "resolution timestamps", {
      pageNumber,
      pageSize: PAGE_SIZE,
    });
    if (!result.ok) {
      if (
        !usedFallbackOrder &&
        pageNumber === 1 &&
        result.response.status >= 400 &&
        result.response.status < 500 &&
        result.response.status !== 429
      ) {
        query = queryFallback;
        usedFallbackOrder = true;
        continue;
      }
      return result.response;
    }

    const rows = extractRows(result.payload);
    for (const row of rows) {
      const value = resolutionHoursFromRow(row);
      if (value != null) {
        hours.push(value);
      }
    }

    if (rows.length !== PAGE_SIZE) {
      break;
    }
    pageNumber += 1;
  }

  if (pageNumber > MAX_PAGES) {
    return jsonResponse(
      { error: "Resolution median exceeded the maximum number of upstream pages." },
      502,
    );
  }

  const median = exactMedian(hours);
  const body: MedianResponse = {
    period: {
      start: parsed.start,
      end: parsed.end,
    },
    validResolutionCount: hours.length,
    medianResolutionHours: median == null ? null : round1(median),
    pagesFetched: pageNumber > MAX_PAGES ? MAX_PAGES : pageNumber,
  };

  return jsonResponse(body, 200);
}

export const config = {
  maxDuration: 300,
};
