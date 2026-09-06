export async function loadLiveJsonArray<T>(
  path: string,
  startDate: string,
  endDate: string,
  errorMessage: string,
  mapRow: (row: Record<string, unknown>) => T,
): Promise<T[]> {
  const params = new URLSearchParams({
    start: startDate,
    end: endDate,
  });
  const response = await fetch(`${path}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(errorMessage);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(errorMessage);
  }

  if (!Array.isArray(payload)) {
    throw new Error(errorMessage);
  }

  return payload.map((row) =>
    mapRow(row && typeof row === "object" ? (row as Record<string, unknown>) : {}),
  );
}
