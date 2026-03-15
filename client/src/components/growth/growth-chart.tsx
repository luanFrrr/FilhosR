import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";
import { differenceInDays } from "date-fns";
import {
  getPercentileCurves,
  getChildPercentileZone,
  type GrowthMetric,
  type Gender,
} from "@/lib/who-growth-data";

interface DataPoint {
  date: string | Date;
  value: number;
}

interface GrowthChartProps {
  data: DataPoint[];
  color: string;
  unit: string;
  birthDate?: string | Date;
  gender?: string;
  metric?: "weight" | "height";
}

const PERCENTILE_COLORS = {
  p3: "#dc2626",
  p15: "#f97316",
  p50: "#16a34a",
  p85: "#f97316",
  p97: "#dc2626",
};

const PERCENTILE_LABELS: Record<string, string> = {
  p3: "P3",
  p15: "P15",
  p50: "P50",
  p85: "P85",
  p97: "P97",
};

function preciseAgeMonths(birthDate: Date, recordDate: Date): number {
  const totalDays = differenceInDays(recordDate, birthDate);
  return Math.round((totalDays / 30.4375) * 10) / 10;
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  if (payload?.childValue == null || cx == null || cy == null) return null;
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={5}
      fill={props.stroke}
      stroke="#fff"
      strokeWidth={2}
    />
  );
}

function interpolatePercentile(
  curves: { month: number; p3: number; p15: number; p50: number; p85: number; p97: number }[],
  month: number,
  key: "p3" | "p15" | "p50" | "p85" | "p97",
): number {
  if (month <= curves[0].month) return curves[0][key];
  if (month >= curves[curves.length - 1].month) return curves[curves.length - 1][key];
  for (let i = 0; i < curves.length - 1; i++) {
    if (month >= curves[i].month && month <= curves[i + 1].month) {
      const t = (month - curves[i].month) / (curves[i + 1].month - curves[i].month);
      return Math.round((curves[i][key] + t * (curves[i + 1][key] - curves[i][key])) * 10) / 10;
    }
  }
  return curves[curves.length - 1][key];
}

export function GrowthChart({
  data,
  color,
  unit,
  birthDate,
  gender,
  metric,
}: GrowthChartProps) {
  const validGender = gender === "female" || gender === "male";
  const hasPediatricMode = !!(birthDate && validGender && metric);

  const chartData = useMemo(() => {
    if (!hasPediatricMode) {
      const sortedData = [...data].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      return sortedData.map((d) => ({
        month: new Date(d.date).getTime(),
        childValue: d.value,
      }));
    }

    const birth = new Date(birthDate!);
    if (isNaN(birth.getTime())) {
      return data.map((d) => ({
        month: new Date(d.date).getTime(),
        childValue: d.value,
      }));
    }

    const genderVal = gender as Gender;
    const metricVal = metric as GrowthMetric;

    const childPoints = data
      .map((d) => {
        const age = preciseAgeMonths(birth, new Date(d.date));
        return { month: age, childValue: d.value, exactMonth: age };
      })
      .filter((p) => p.month >= 0 && !isNaN(p.month))
      .sort((a, b) => a.month - b.month);

    const maxChildMonth = childPoints.length > 0
      ? Math.max(...childPoints.map((p) => p.month))
      : 12;
    const curveEndMonth = Math.max(Math.ceil(maxChildMonth) + 3, 12);

    const curves = getPercentileCurves(metricVal, genderVal, curveEndMonth);

    const merged: {
      month: number;
      p3: number;
      p15: number;
      p50: number;
      p85: number;
      p97: number;
      childValue?: number;
      exactMonth?: number;
    }[] = [];

    curves.forEach((c) => {
      merged.push({
        month: c.month,
        p3: c.p3,
        p15: c.p15,
        p50: c.p50,
        p85: c.p85,
        p97: c.p97,
      });
    });

    childPoints.forEach((cp) => {
      const alreadyExists = merged.some((m) => Math.abs(m.month - cp.month) < 0.05);
      if (alreadyExists) {
        const closest = merged.reduce((prev, curr) =>
          Math.abs(curr.month - cp.month) < Math.abs(prev.month - cp.month) ? curr : prev
        );
        if (closest.childValue == null) {
          closest.childValue = cp.childValue;
          closest.exactMonth = cp.exactMonth;
        } else {
          merged.push({
            month: cp.month,
            p3: interpolatePercentile(curves, cp.month, "p3"),
            p15: interpolatePercentile(curves, cp.month, "p15"),
            p50: interpolatePercentile(curves, cp.month, "p50"),
            p85: interpolatePercentile(curves, cp.month, "p85"),
            p97: interpolatePercentile(curves, cp.month, "p97"),
            childValue: cp.childValue,
            exactMonth: cp.exactMonth,
          });
        }
      } else {
        merged.push({
          month: cp.month,
          p3: interpolatePercentile(curves, cp.month, "p3"),
          p15: interpolatePercentile(curves, cp.month, "p15"),
          p50: interpolatePercentile(curves, cp.month, "p50"),
          p85: interpolatePercentile(curves, cp.month, "p85"),
          p97: interpolatePercentile(curves, cp.month, "p97"),
          childValue: cp.childValue,
          exactMonth: cp.exactMonth,
        });
      }
    });

    return merged.sort((a, b) => a.month - b.month);
  }, [data, birthDate, gender, metric, hasPediatricMode]);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
        <p className="text-muted-foreground font-medium">
          Sem dados suficientes
        </p>
      </div>
    );
  }

  if (!hasPediatricMode) {
    return (
      <div className="h-64 w-full -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e5e5"
            />
            <XAxis
              dataKey="month"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(ts) => {
                const d = new Date(ts);
                return d.toLocaleDateString("pt-BR", { month: "short" });
              }}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              unit={unit}
            />
            <Tooltip
              formatter={(value: number) => [`${value} ${unit}`, ""]}
              labelFormatter={() => ""}
            />
            <Line
              type="monotone"
              dataKey="childValue"
              stroke={color}
              strokeWidth={3}
              dot={{ r: 4, fill: color, stroke: "#fff", strokeWidth: 2 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const genderVal = gender as Gender;
  const metricVal = metric as GrowthMetric;

  return (
    <div className="w-full space-y-3">
      <div className="h-80 w-full -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 15, left: -5, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="hsl(var(--border))"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="month"
              type="number"
              domain={[0, "dataMax"]}
              tickFormatter={(m) => `${Math.round(m)}`}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              label={{
                value: "Idade (meses)",
                position: "insideBottom",
                offset: -2,
                style: {
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 11,
                  fontWeight: 500,
                },
              }}
            />
            <YAxis
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              label={{
                value: unit === "kg" ? "Peso (kg)" : "Altura (cm)",
                angle: -90,
                position: "insideLeft",
                offset: 15,
                style: {
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 11,
                  fontWeight: 500,
                },
              }}
              domain={["auto", "auto"]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const point = payload[0]?.payload;
                if (!point) return null;
                const month = point.exactMonth ?? point.month;
                const childVal = point.childValue;

                return (
                  <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-sm" data-testid="chart-tooltip">
                    <p className="font-semibold text-foreground mb-1">
                      {Number(month).toFixed(1)} {month === 1 ? "mês" : "meses"}
                    </p>
                    {childVal != null && (
                      <>
                        <p className="text-foreground font-bold" style={{ color }}>
                          {childVal} {unit}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getChildPercentileZone(
                            childVal,
                            month,
                            metricVal,
                            genderVal,
                          )}
                        </p>
                      </>
                    )}
                    {childVal == null && (
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        <p>P97: {point.p97} {unit}</p>
                        <p>P50: {point.p50} {unit}</p>
                        <p>P3: {point.p3} {unit}</p>
                      </div>
                    )}
                  </div>
                );
              }}
            />

            <Area
              type="monotone"
              dataKey="p97"
              stroke="none"
              fill="rgba(220, 38, 38, 0.04)"
              fillOpacity={1}
              activeDot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="p85"
              stroke="none"
              fill="rgba(249, 115, 22, 0.05)"
              fillOpacity={1}
              activeDot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="p50"
              stroke="none"
              fill="rgba(22, 163, 74, 0.06)"
              fillOpacity={1}
              activeDot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="p15"
              stroke="none"
              fill="rgba(249, 115, 22, 0.05)"
              fillOpacity={1}
              activeDot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="p3"
              stroke="none"
              fill="hsl(var(--background))"
              fillOpacity={1}
              activeDot={false}
              isAnimationActive={false}
            />

            {(["p3", "p15", "p50", "p85", "p97"] as const).map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={PERCENTILE_COLORS[key]}
                strokeWidth={key === "p50" ? 2.5 : 1.5}
                strokeDasharray={key === "p50" ? undefined : "6 3"}
                dot={false}
                activeDot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}

            <Line
              type="monotone"
              dataKey="childValue"
              stroke={color}
              strokeWidth={3}
              dot={<CustomDot stroke={color} />}
              activeDot={{
                r: 7,
                fill: color,
                stroke: "#fff",
                strokeWidth: 2,
              }}
              connectNulls
              animationDuration={1000}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs" data-testid="chart-legend">
        {(["p3", "p15", "p50", "p85", "p97"] as const).map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="inline-block w-5 h-0.5 rounded"
              style={{
                backgroundColor: PERCENTILE_COLORS[key],
                height: key === "p50" ? 3 : 2,
              }}
            />
            <span className="text-muted-foreground">
              {PERCENTILE_LABELS[key]}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-muted-foreground font-medium">
            {gender === "female" ? "Sua filha" : "Seu filho"}
          </span>
        </div>
      </div>
    </div>
  );
}
