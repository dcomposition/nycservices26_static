import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  useXAxisScale,
  useYAxisScale,
} from "recharts";
import type { DailyRequest } from "../types";
import {
  formatAxisDate,
  formatCompact,
  formatCompactNumber,
  formatFullDate,
  formatInteger,
} from "../utils/formatters";

type RequestsLineChartProps = {
  data: DailyRequest[];
  avgRequestsPerDay: number;
};

function findExtremum(
  data: DailyRequest[],
  compare: (candidate: number, current: number) => boolean,
): DailyRequest {
  return data.reduce((current, row) =>
    compare(row.requests, current.requests) ? row : current,
  );
}

function ExtremumAnnotations({
  peak,
  low,
  dates,
}: {
  peak: DailyRequest;
  low: DailyRequest;
  dates: string[];
}) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!xScale || !yScale) {
    return null;
  }

  const maybeBand = xScale as unknown as { bandwidth?: () => number };
  const bandwidth = typeof maybeBand.bandwidth === "function" ? maybeBand.bandwidth() : 0;

  return (
    <g>
      {(
        [
          { row: peak, kind: "peak" as const },
          { row: low, kind: "low" as const },
        ]
      ).map(({ row, kind }) => {
        const x = Number(xScale(row.date)) + bandwidth / 2;
        const y = Number(yScale(row.requests));
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return null;
        }

        const index = dates.indexOf(row.date);
        const nearRight = index >= dates.length - 4;
        const nearLeft = index <= 2;
        const textAnchor = nearRight ? "end" : nearLeft ? "start" : "middle";
        const labelY = kind === "peak" ? y - 16 : y + 18;

        return (
          <g key={kind}>
            <circle cx={x} cy={y} r={4} fill="#1d4ed8" stroke="#ffffff" strokeWidth={1.5} />
            <text
              x={x}
              y={labelY}
              textAnchor={textAnchor}
              fill="#334155"
              fontSize={11}
              fontWeight={500}
            >
              <tspan x={x} dy="0">
                {formatAxisDate(row.date)}
              </tspan>
              <tspan x={x} dy="13">
                {formatCompactNumber(row.requests)} {kind}
              </tspan>
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function RequestsLineChart({ data, avgRequestsPerDay }: RequestsLineChartProps) {
  if (data.length === 0) {
    return <div className="h-[320px] w-full" />;
  }

  const peak = findExtremum(data, (candidate, current) => candidate > current);
  const low = findExtremum(data, (candidate, current) => candidate < current);
  const dates = data.map((row) => row.date);

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 36, right: 28, left: 8, bottom: 12 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={18}
          />
          <YAxis
            tickFormatter={formatCompact}
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={48}
            domain={[(min: number) => min * 0.88, (max: number) => max * 1.1]}
          />
          <Tooltip
            cursor={{ stroke: "#94a3b8", strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length || typeof label !== "string") {
                return null;
              }
              const requests = Number(payload[0].value);
              if (Number.isNaN(requests)) {
                return null;
              }
              return (
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                  <p className="font-medium text-slate-900">{formatFullDate(label)}</p>
                  <p className="mt-1 text-slate-600">
                    {formatInteger(requests)} requests
                  </p>
                </div>
              );
            }}
          />
          <ReferenceLine
            y={avgRequestsPerDay}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            ifOverflow="extendDomain"
            label={{
              value: `Avg ${formatCompactNumber(avgRequestsPerDay)}`,
              position: "insideTopLeft",
              fill: "#64748b",
              fontSize: 12,
            }}
          />
          <Line
            type="linear"
            dataKey="requests"
            stroke="#1d4ed8"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 4, fill: "#1d4ed8" }}
          />
          <ExtremumAnnotations peak={peak} low={low} dates={dates} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
