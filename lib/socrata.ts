const SOCRATA_QUERY_URL =
  "https://data.cityofnewyork.us/api/v3/views/erm2-nwe9/query.json";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type DateRangeParams = {
  start: string;
  end: string;
};

export type ErrorResponse = {
  error: string;
};

export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function getSocrataToken(): string | undefined {
  const nodeProcess = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;

  return nodeProcess?.env?.SOCRATA_APP_TOKEN?.trim();
}

export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function nextIsoDate(value: string): string {
  const match = ISO_DATE.exec(value);
  if (!match) {
    throw new Error("Invalid date");
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseQueryDates(request: Request): DateRangeParams | ErrorResponse {
  const url = new URL(request.url);
  const start = url.searchParams.get("start")?.trim() ?? "";
  const end = url.searchParams.get("end")?.trim() ?? "";

  if (!start || !end) {
    return { error: "Query parameters start and end are required (YYYY-MM-DD)." };
  }
  if (!isValidIsoDate(start) || !isValidIsoDate(end)) {
    return { error: "start and end must be valid dates in YYYY-MM-DD format." };
  }
  if (start > end) {
    return { error: "start cannot be after end." };
  }

  return { start, end };
}

export function createdDateWhere(start: string, endInclusive: string): string {
  const endExclusive = nextIsoDate(endInclusive);
  return `created_date >= '${start}T00:00:00' AND created_date < '${endExclusive}T00:00:00'`;
}

export function normalizeIsoDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const match = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export function enumerateInclusiveDates(start: string, end: string): string[] {
  const days: string[] = [];
  let current = start;
  while (current <= end) {
    days.push(current);
    current = nextIsoDate(current);
  }
  return days;
}

export function toCount(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return Math.round(numeric);
}

export function roundShare(requests: number, totalRequests: number): number {
  if (totalRequests === 0) {
    return 0;
  }
  return Math.round((requests / totalRequests) * 1000) / 10;
}

export function readField(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] != null) {
      return row[key];
    }
  }
  const lowerKeyMap = new Map(Object.keys(row).map((key) => [key.toLowerCase(), key]));
  for (const key of keys) {
    const actual = lowerKeyMap.get(key.toLowerCase());
    if (actual != null) {
      return row[actual];
    }
  }
  return undefined;
}

export function extractRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((row): row is Record<string, unknown> =>
      Boolean(row) && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["data", "rows", "results"]) {
      if (Array.isArray(record[key])) {
        return extractRows(record[key]);
      }
    }
  }
  return [];
}

export function normalizeLabel(value: unknown, missing: string): string {
  if (value == null) {
    return missing;
  }
  const text = String(value).trim();
  if (!text || text.toUpperCase() === missing.toUpperCase()) {
    return missing;
  }
  return text;
}

export function upstreamErrorMessage(status: number, queryName: string): string {
  if (status === 401 || status === 403) {
    return "NYC Open Data rejected the request. Check the server application token.";
  }
  if (status === 429) {
    return "NYC Open Data rate-limited the request. Try again shortly.";
  }
  if (status >= 500) {
    return "NYC Open Data is currently unavailable.";
  }
  return `NYC Open Data could not complete the ${queryName} query.`;
}

const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUSES.has(status);
}

export type SocrataPage = {
  pageNumber: number;
  pageSize: number;
};

type SocrataQueryResult =
  | { ok: true; payload: unknown }
  | { ok: false; response: Response; retryable: boolean };

async function querySocrataOnce(
  query: string,
  appToken: string,
  queryName: string,
  page?: SocrataPage,
): Promise<SocrataQueryResult> {
  const body: Record<string, unknown> = { query };
  if (page) {
    body.page = page;
    body.includeSynthetic = false;
    body.includeSystem = false;
  }

  let upstream: Response;
  try {
    upstream = await fetch(SOCRATA_QUERY_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-App-Token": appToken,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      retryable: true,
      response: jsonResponse({ error: "Unable to reach NYC Open Data." }, 502),
    };
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    return {
      ok: false,
      retryable: isRetryableStatus(upstream.status),
      response: jsonResponse(
        { error: "NYC Open Data returned a non-JSON response." },
        upstream.ok ? 502 : upstream.status,
      ),
    };
  }

  if (!upstream.ok) {
    return {
      ok: false,
      retryable: isRetryableStatus(upstream.status),
      response: jsonResponse(
        { error: upstreamErrorMessage(upstream.status, queryName) },
        upstream.status >= 400 ? upstream.status : 502,
      ),
    };
  }

  return { ok: true, payload };
}

export async function querySocrata(
  query: string,
  appToken: string,
  queryName: string,
  page?: SocrataPage,
): Promise<{ ok: true; payload: unknown } | { ok: false; response: Response }> {
  let lastFailure: { ok: false; response: Response } | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS);
    }

    const result = await querySocrataOnce(query, appToken, queryName, page);
    if (result.ok) {
      return result;
    }

    lastFailure = { ok: false, response: result.response };
    if (!result.retryable) {
      return lastFailure;
    }
  }

  return lastFailure ?? {
    ok: false,
    response: jsonResponse({ error: "Unable to reach NYC Open Data." }, 502),
  };
}

export function parseTotalCount(payload: unknown): number {
  const row = extractRows(payload)[0];
  if (!row) {
    return 0;
  }
  return toCount(
    readField(row, ["requests", "count", "n", "total_requests", "closed_requests"]),
  );
}

export const socrataFunctionConfig = {
  maxDuration: 30,
};
