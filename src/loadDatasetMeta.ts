import type { DatasetMeta } from "./types";

export async function loadDatasetMeta(): Promise<DatasetMeta> {
  const response = await fetch("/api/311-meta");
  if (!response.ok) {
    throw new Error("Dataset date range could not be loaded.");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("Dataset date range could not be loaded.");
  }

  let payload: Partial<DatasetMeta>;
  try {
    payload = (await response.json()) as Partial<DatasetMeta>;
  } catch {
    throw new Error("Dataset date range could not be loaded.");
  }

  if (!payload.minDate || !payload.maxDate) {
    throw new Error("Dataset date range is incomplete.");
  }

  return {
    minDate: payload.minDate,
    maxDate: payload.maxDate,
  };
}
