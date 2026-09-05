import { Cell, Label, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ChannelStat } from "../types";
import { formatCompactNumber, formatInteger, formatPercent } from "../utils/formatters";

type ChannelChartProps = {
  data: ChannelStat[];
  totalRequests: number;
};

const CHANNEL_COLORS: Record<string, string> = {
  ONLINE: "#1d4ed8",
  PHONE: "#3b82f6",
  MOBILE: "#64748b",
  UNKNOWN: "#cbd5e1",
};

export function ChannelChart({ data, totalRequests }: ChannelChartProps) {
  const sorted = [...data].sort((a, b) => b.requests - a.requests);

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={sorted}
            dataKey="requests"
            nameKey="channel"
            cx="50%"
            cy="42%"
            innerRadius={72}
            outerRadius={104}
            paddingAngle={2}
            stroke="#ffffff"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {sorted.map((entry) => (
              <Cell
                key={entry.channel}
                fill={CHANNEL_COLORS[entry.channel] ?? "#94a3b8"}
              />
            ))}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                  return null;
                }
                const { cx, cy } = viewBox;
                return (
                  <text x={cx} y={cy} textAnchor="middle">
                    <tspan
                      x={cx}
                      y={cy - 6}
                      fill="#0f172a"
                      fontSize={20}
                      fontWeight={600}
                    >
                      {formatCompactNumber(totalRequests)}
                    </tspan>
                    <tspan
                      x={cx}
                      y={cy + 14}
                      fill="#64748b"
                      fontSize={10}
                      fontWeight={500}
                      letterSpacing="0.08em"
                    >
                      TOTAL REQUESTS
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) {
                return null;
              }
              const item = payload[0].payload as ChannelStat;
              return (
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                  <p className="font-medium text-slate-900">{item.channel}</p>
                  <p className="mt-1 text-slate-600">{formatPercent(item.share)}</p>
                  <p className="text-slate-600">{formatInteger(item.requests)} requests</p>
                </div>
              );
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            formatter={(value, entry) => {
              const payload = entry.payload as ChannelStat | { payload?: ChannelStat } | undefined;
              const item =
                payload && "share" in payload
                  ? payload
                  : payload && "payload" in payload
                    ? payload.payload
                    : undefined;
              const label =
                item?.share == null
                  ? String(value)
                  : `${value} ${formatPercent(item.share)}`;
              return <span className="text-xs text-slate-600">{label}</span>;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
