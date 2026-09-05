import type { DashboardData } from "./types";

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path} (${response.status} ${response.statusText})`);
  }
  return (await response.json()) as T;
}

export async function loadDashboardData(): Promise<DashboardData> {
  const [summary, dailyRequests, topProblems, boroughs, agencies, channels] =
    await Promise.all([
      loadJson<DashboardData["summary"]>("/data/summary.json"),
      loadJson<DashboardData["dailyRequests"]>("/data/daily_requests.json"),
      loadJson<DashboardData["topProblems"]>("/data/top_problems.json"),
      loadJson<DashboardData["boroughs"]>("/data/boroughs.json"),
      loadJson<DashboardData["agencies"]>("/data/agencies.json"),
      loadJson<DashboardData["channels"]>("/data/channels.json"),
    ]);

  return {
    summary,
    dailyRequests,
    topProblems,
    boroughs,
    agencies,
    channels,
  };
}
