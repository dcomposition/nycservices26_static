const SOCRATA_QUERY_URL =
  "https://data.cityofnewyork.us/api/v3/views/erm2-nwe9/query.json";

const DATE_QUERY = `
SELECT
  min(created_date) AS min_date,
  max(created_date) AS max_date
`.trim();

type DateBoundsResponse = {
  minDate: string;
  maxDate: string;
};

type ErrorResponse = {
  error: string;
};

function jsonResponse(body: DateBoundsResponse | ErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function toIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function readBound(row: Record<string, unknown>, keys: string[]): unknown {
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

function parseDateBounds(payload: unknown): DateBoundsResponse | null {
  const row = Array.isArray(payload) ? payload[0] : payload;
  if (!row || typeof row !== "object") {
    return null;
  }

  const record = row as Record<string, unknown>;
  const minDate = toIsoDate(readBound(record, ["min_date", "minDate"]));
  const maxDate = toIsoDate(readBound(record, ["max_date", "maxDate"]));

  if (!minDate || !maxDate) {
    return null;
  }

  return { minDate, maxDate };
}

function upstreamErrorMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "NYC Open Data rejected the request. Check the server application token.";
  }
  if (status === 429) {
    return "NYC Open Data rate-limited the request. Try again shortly.";
  }
  if (status >= 500) {
    return "NYC Open Data is currently unavailable.";
  }
  return "NYC Open Data could not complete the metadata query.";
}

function getSocrataToken(): string | undefined {
  const nodeProcess = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;

  return nodeProcess?.env?.SOCRATA_APP_TOKEN?.trim();
}

export async function GET(): Promise<Response> {
  const appToken = getSocrataToken();
  if (!appToken) {
    return jsonResponse(
      { error: "Server configuration error: SOCRATA_APP_TOKEN is not set." },
      500,
    );
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
      body: JSON.stringify({ query: DATE_QUERY }),
    });
  } catch {
    return jsonResponse({ error: "Unable to reach NYC Open Data." }, 502);
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    return jsonResponse(
      { error: "NYC Open Data returned a non-JSON response." },
      upstream.ok ? 502 : upstream.status,
    );
  }

  if (!upstream.ok) {
    return jsonResponse(
      { error: upstreamErrorMessage(upstream.status) },
      upstream.status >= 400 ? upstream.status : 502,
    );
  }

  const bounds = parseDateBounds(payload);
  if (!bounds) {
    return jsonResponse(
      { error: "NYC Open Data did not return valid created_date bounds." },
      502,
    );
  }

  return jsonResponse(bounds, 200);
}

export const config = {
  maxDuration: 30,
};
