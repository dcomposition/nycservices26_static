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
import type { BoroughStat } from "../types";
import {
  formatCompact,
  formatCompactNumber,
  formatInteger,
  formatPercent,
} from "../utils/formatters";

type BoroughChartProps = {
  data: BoroughStat[];
};

function isUnspecified(borough: string): boolean {
  return borough.trim().toUpperCase() === "UNSPECIFIED";
}

export function BoroughChart({ data }: BoroughChartProps) {
  const unspecified = data.find((row) => isUnspecified(row.borough));
  const hideUnspecified = unspecified != null && unspecified.share < 1;
  const visible = [...data]
    .filter((row) => !(hideUnspecified && isUnspecified(row.borough)))
    .sort((a, b) => b.requests - a.requests);

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={visible} margin={{ top: 22, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="borough"
            tick={{ fill: "#334155", fontSize: 11 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={56}
          />
          <YAxis
            tickFormatter={formatCompact}
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={[0, (max: number) => max * 1.12]}
          />
          <Tooltip
            cursor={{ fill: "#f8fafc" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) {
                return null;
              }
              const item = payload[0].payload as BoroughStat;
              return (
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                  <p className="font-medium text-slate-900">{item.borough}</p>
                  <p className="mt-1 text-slate-600">{formatInteger(item.requests)} requests</p>
                  <p className="text-slate-600">Share: {formatPercent(item.share)}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="requests" fill="#1d4ed8" radius={[2, 2, 0, 0]} barSize={36} isAnimationActive={false}>
            <LabelList
              dataKey="requests"
              position="top"
              offset={6}
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
