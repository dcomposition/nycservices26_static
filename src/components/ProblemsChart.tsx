import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProblemStat } from "../types";
import {
  formatCompact,
  formatCompactNumber,
  formatHours,
  formatInteger,
  formatPercent,
} from "../utils/formatters";

type ProblemsChartProps = {
  data: ProblemStat[];
};

export function ProblemsChart({ data }: ProblemsChartProps) {
  const sorted = [...data].sort((a, b) => b.requests - a.requests);

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={sorted}
          margin={{ top: 4, right: 56, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={formatCompact}
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
            domain={[0, (max: number) => max * 1.28]}
          />
          <YAxis
            type="category"
            dataKey="problem"
            width={168}
            tick={{ fill: "#334155", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "#f8fafc" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) {
                return null;
              }
              const item = payload[0].payload as ProblemStat;
              return (
                <div className="max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                  <p className="font-medium text-slate-900">{item.problem}</p>
                  <p className="mt-1 text-slate-600">{formatInteger(item.requests)} requests</p>
                  <p className="text-slate-600">Share: {formatPercent(item.share)}</p>
                  <p className="text-slate-600">
                    Median resolution: {formatHours(item.medianResolutionHours)}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="requests" fill="#1d4ed8" radius={[0, 2, 2, 0]} barSize={18} isAnimationActive={false}>
            <LabelList
              dataKey="requests"
              position="right"
              offset={8}
              fill="#475569"
              fontSize={11}
              formatter={(label) => formatCompactNumber(Number(label))}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
