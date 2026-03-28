"use client";

import { useState, useEffect } from "react";

type Period = "daily" | "weekly" | "monthly";
type Metric = "count" | "minutes";

interface StatEntry {
  date: string;
  label: string;
  count: number;
  minutes: number;
}

interface StatsPanelProps {
  refreshKey: number;
}

export default function StatsPanel({ refreshKey }: StatsPanelProps) {
  const [period, setPeriod] = useState<Period>("daily");
  const [metric, setMetric] = useState<Metric>("count");
  const [data, setData] = useState<StatEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetch(`/api/tasks/stats/timeline?period=${period}`);
      const json = await res.json();
      setData(json.data ?? []);
      setLoading(false);
    };
    load();
  }, [period, refreshKey]);

  // Daily: show last 7 days; weekly/monthly: show all
  const displayData = period === "daily" ? data.slice(-7) : data;
  const maxValue = Math.max(...displayData.map((d) => d[metric]), 1);

  const totalTasks = displayData.reduce((a, d) => a + d.count, 0);
  const totalMinutes = displayData.reduce((a, d) => a + d.minutes, 0);

  return (
    <div className="p-3 font-mono flex flex-col h-full">
      {/* Period tabs */}
      <div className="flex gap-1 mb-3">
        {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 text-xs py-1 rounded transition-colors ${
              period === p
                ? "bg-green-500 text-black font-bold"
                : "text-gray-500 hover:text-green-400 border border-gray-700"
            }`}
          >
            {p[0].toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Metric toggle */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setMetric("count")}
          className={`text-xs px-2 py-0.5 rounded border transition-colors ${
            metric === "count"
              ? "text-green-400 border-green-500"
              : "text-gray-600 border-gray-800 hover:text-gray-400"
          }`}
        >
          Tasks
        </button>
        <button
          onClick={() => setMetric("minutes")}
          className={`text-xs px-2 py-0.5 rounded border transition-colors ${
            metric === "minutes"
              ? "text-green-400 border-green-500"
              : "text-gray-600 border-gray-800 hover:text-gray-400"
          }`}
        >
          Minutes
        </button>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-xs">
          loading...
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 flex-1">
          {displayData.map((entry) => {
            const value = entry[metric];
            const pct = (value / maxValue) * 100;
            return (
              <div key={entry.date} className="flex items-center gap-2">
                <div className="text-gray-600 text-xs w-9 shrink-0 text-right leading-none">
                  {entry.label}
                </div>
                <div className="flex-1 h-3.5 bg-gray-900 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-sm transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-gray-500 text-xs w-7 shrink-0 text-right leading-none">
                  {value > 0 ? value : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {!loading && (
        <div className="mt-3 pt-2 border-t border-gray-800 flex justify-between text-xs text-gray-600">
          <span>{totalTasks} tasks</span>
          <span>{totalMinutes} min</span>
        </div>
      )}
    </div>
  );
}
