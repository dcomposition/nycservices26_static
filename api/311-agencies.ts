import {
  createdDateWhere,
  extractRows,
  getSocrataToken,
  jsonResponse,
  normalizeLabel,
  parseQueryDates,
  parseTotalCount,
  querySocrata,
  readField,
  roundShare,
  socrataFunctionConfig,
  toCount,
} from "../lib/socrata";

type AgencyStat = {
  agency: string;
  agencyName: string;
  requests: number;
  share: number;
};

type AgencyAccumulator = {
  requests: number;
  names: Map<string, number>;
};

function normalizeAgencies(payload: unknown, totalRequests: number): AgencyStat[] {
  const totals = new Map<string, AgencyAccumulator>();

  for (const row of extractRows(payload)) {
    const agency = normalizeLabel(readField(row, ["agency"]), "UNKNOWN");
    const agencyName = normalizeLabel(readField(row, ["agency_name", "agencyName"]), "");
    const requests = toCount(readField(row, ["requests", "count"]));
    const current = totals.get(agency) ?? { requests: 0, names: new Map<string, number>() };
    current.requests += requests;
    if (agencyName) {
      current.names.set(agencyName, (current.names.get(agencyName) ?? 0) + requests);
    }
    totals.set(agency, current);
  }

  return [...totals.entries()]
    .map(([agency, current]) => {
      let agencyName = agency;
      let best = -1;
      for (const [name, count] of current.names.entries()) {
        if (count > best) {
          agencyName = name;
          best = count;
        }
      }
      return {
        agency,
        agencyName,
        requests: current.requests,
        share: roundShare(current.requests, totalRequests),
      };
    })
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
  const [totalResult, agencyResult] = await Promise.all([
    querySocrata(
      `
SELECT count(*) AS requests
WHERE ${where}
`.trim(),
      appToken,
      "agency total",
    ),
    querySocrata(
      `
SELECT
  agency,
  agency_name,
  count(*) AS requests
WHERE ${where}
GROUP BY agency, agency_name
ORDER BY requests DESC
`.trim(),
      appToken,
      "agency",
    ),
  ]);

  if (!totalResult.ok) {
    return totalResult.response;
  }
  if (!agencyResult.ok) {
    return agencyResult.response;
  }

  const totalRequests = parseTotalCount(totalResult.payload);
  return jsonResponse(normalizeAgencies(agencyResult.payload, totalRequests), 200);
}

export const config = socrataFunctionConfig;
