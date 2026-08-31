import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { PhoneCall } from "lucide-react";
import { useWorkspace } from "@/workspace/store";
import { CALL_HASHTAGS, PROPERTY_STYLES } from "@/lib/property-codes";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const WEEKDAYS = [
  { key: "mon", label: "Mon", jsDay: 1 },
  { key: "tue", label: "Tue", jsDay: 2 },
  { key: "wed", label: "Wed", jsDay: 3 },
  { key: "thu", label: "Thu", jsDay: 4 },
  { key: "fri", label: "Fri", jsDay: 5 },
  { key: "sat", label: "Sat", jsDay: 6 },
  { key: "sun", label: "Sun", jsDay: 0 },
];

const ACCENT = "oklch(0.55 0.13 250)";

const weekdayChartConfig: ChartConfig = {
  calls: { label: "Calls", color: ACCENT },
};

const hashtagChartConfig: ChartConfig = {
  calls: { label: "Calls", color: ACCENT },
};

const propertyChartConfig: ChartConfig = {
  calls: { label: "Calls" },
};

export function DailyStatsTool() {
  const { callHistory } = useWorkspace();

  const byProperty = useMemo(() => {
    const counts: Record<string, number> = { AR: 0, ER: 0, RI: 0 };
    for (const c of callHistory) counts[c.property] = (counts[c.property] ?? 0) + 1;
    return (["AR", "ER", "RI"] as const).map((code) => ({
      code,
      label: PROPERTY_STYLES[code].label,
      calls: counts[code] ?? 0,
      fill: PROPERTY_STYLES[code].hex,
    }));
  }, [callHistory]);

  const byWeekday = useMemo(() => {
    const counts = new Map<number, number>();
    for (const c of callHistory) {
      const day = new Date(c.savedAtISO).getDay();
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return WEEKDAYS.map((w) => ({ label: w.label, calls: counts.get(w.jsDay) ?? 0 }));
  }, [callHistory]);

  const byHashtag = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tag of CALL_HASHTAGS) counts[tag] = 0;
    for (const c of callHistory) for (const tag of c.hashtags) counts[tag] = (counts[tag] ?? 0) + 1;
    return CALL_HASHTAGS.map((tag) => ({ label: tag, calls: counts[tag] ?? 0 }));
  }, [callHistory]);

  const totalCalls = callHistory.length;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-2">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <PhoneCall className="size-[18px]" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-foreground">Daily Statistics</p>
          <p className="text-[12.5px] text-muted-foreground">
            {totalCalls} call{totalCalls === 1 ? "" : "s"} logged in total
          </p>
        </div>
      </div>

      {totalCalls === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-[13px] text-muted-foreground">
            No calls have been logged yet. Finished calls from the Notes tool will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-surface-2 p-4">
            <p className="label-xs mb-3">By property</p>
            <ChartContainer config={propertyChartConfig} className="aspect-auto h-52 w-full">
              <BarChart data={byProperty} margin={{ left: -12, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="code" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, _name, item) => (
                        <span className="text-foreground">
                          {item.payload.label} · {value as number}
                        </span>
                      )}
                    />
                  }
                />
                <Bar dataKey="calls" radius={[6, 6, 0, 0]}>
                  {byProperty.map((row) => (
                    <Cell key={row.code} fill={row.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <ul className="mt-3 flex flex-wrap gap-2">
              {byProperty.map((row) => (
                <li
                  key={row.code}
                  className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: `${row.fill}33`, color: row.fill }}
                >
                  {row.code} · {row.label} · {row.calls}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-surface-2 p-4">
            <p className="label-xs mb-3">By day of week</p>
            <ChartContainer config={weekdayChartConfig} className="aspect-auto h-52 w-full">
              <BarChart data={byWeekday} margin={{ left: -12, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="calls" fill={ACCENT} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </section>

          <section className="rounded-2xl border border-border bg-surface-2 p-4 lg:col-span-2">
            <p className="label-xs mb-3">By action hashtag</p>
            <ChartContainer config={hashtagChartConfig} className="aspect-auto h-52 w-full">
              <BarChart data={byHashtag} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid horizontal={false} strokeDasharray="4 4" />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="calls" fill={ACCENT} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartContainer>
          </section>
        </div>
      )}
    </div>
  );
}
