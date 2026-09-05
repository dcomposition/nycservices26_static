export type Summary = {
  period: {
    start: string;
    end: string;
  };
  totalRequests: number;
  closedRequests: number;
  closedRate: number;
  medianResolutionHours: number;
  avgRequestsPerDay: number;
};

export type DailyRequest = {
  date: string;
  requests: number;
};

export type ProblemStat = {
  problem: string;
  requests: number;
  share: number;
  medianResolutionHours: number | null;
};

export type BoroughStat = {
  borough: string;
  requests: number;
  share: number;
};

export type AgencyStat = {
  agency: string;
  agencyName: string;
  requests: number;
  share: number;
};

export type ChannelStat = {
  channel: string;
  requests: number;
  share: number;
};

export type DashboardData = {
  summary: Summary;
  dailyRequests: DailyRequest[];
  topProblems: ProblemStat[];
  boroughs: BoroughStat[];
  agencies: AgencyStat[];
  channels: ChannelStat[];
};
