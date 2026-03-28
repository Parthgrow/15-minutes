"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { minutesToTasks } from "@/lib/utils";

type Period = "daily" | "weekly" | "monthly";

interface StatEntry {
  date: string;
  label: string;
  count: number;
  minutes: number;
}

interface GlobalStats {
  completedCount: number;
  pendingCount: number;
  totalMinutes: number;
}

function BarChart({
  data,
  metric,
}: {
  data: StatEntry[];
  metric: "count" | "minutes";
}) {
  const maxValue = Math.max(...data.map((d) => d[metric]), 1);

  return (
    <div className="flex items-end gap-1.5 h-36 w-full">
      {data.map((entry) => {
        const value = entry[metric];
        const heightPct = (value / maxValue) * 100;
        const isToday =
          entry.date === new Date().toISOString().split("T")[0];

        return (
          <div
            key={entry.date}
            className="flex-1 flex flex-col items-center gap-1 group"
          >
            {/* Tooltip on hover */}
            <div className="relative flex flex-col items-center w-full">
              {value > 0 && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {value}
                </div>
              )}
              <div className="w-full flex items-end justify-center h-32">
                <div
                  className={`w-full rounded-t transition-all duration-500 ${
                    isToday ? "bg-green-400" : value > 0 ? "bg-green-600" : "bg-gray-800"
                  }`}
                  style={{ height: `${Math.max(heightPct, value > 0 ? 4 : 2)}%` }}
                />
              </div>
            </div>
            <div
              className={`text-xs truncate w-full text-center ${
                isToday ? "text-green-400" : "text-gray-600"
              }`}
            >
              {entry.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-[#111111] border border-gray-800 rounded-xl p-5 flex flex-col gap-1">
      <div className="text-gray-500 text-sm">{label}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {sub && <div className="text-gray-600 text-xs">{sub}</div>}
    </div>
  );
}

function ChartCard({
  title,
  period,
  metric,
  onMetricChange,
  data,
  loading,
}: {
  title: string;
  period: Period;
  metric: "count" | "minutes";
  onMetricChange: (m: "count" | "minutes") => void;
  data: StatEntry[];
  loading: boolean;
}) {
  const total = data.reduce((a, d) => a + d[metric], 0);

  return (
    <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-semibold text-lg">{title}</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {total} {metric === "count" ? "tasks" : "minutes"} total
          </p>
        </div>
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => onMetricChange("count")}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              metric === "count"
                ? "bg-gray-700 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => onMetricChange("minutes")}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              metric === "minutes"
                ? "bg-gray-700 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Minutes
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-36 flex items-center justify-center text-gray-700 text-sm">
          Loading...
        </div>
      ) : (
        <BarChart data={data} metric={metric} />
      )}
    </div>
  );
}

export default function StatsPage() {
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [dailyData, setDailyData] = useState<StatEntry[]>([]);
  const [weeklyData, setWeeklyData] = useState<StatEntry[]>([]);
  const [monthlyData, setMonthlyData] = useState<StatEntry[]>([]);
  const [loading, setLoading] = useState({
    global: true,
    daily: true,
    weekly: true,
    monthly: true,
  });
  const [metrics, setMetrics] = useState<Record<Period, "count" | "minutes">>({
    daily: "count",
    weekly: "count",
    monthly: "count",
  });

  useEffect(() => {
    document.body.style.overflow = "auto";
    return () => { document.body.style.overflow = "hidden"; };
  }, []);

  useEffect(() => {
    fetch("/api/tasks/stats")
      .then((r) => r.json())
      .then((data) => {
        setGlobalStats(data);
        setLoading((l) => ({ ...l, global: false }));
      });

    const fetchPeriod = async (period: Period) => {
      const res = await fetch(`/api/tasks/stats/timeline?period=${period}`);
      const json = await res.json();
      if (period === "daily") setDailyData(json.data?.slice(-7) ?? []);
      if (period === "weekly") setWeeklyData(json.data ?? []);
      if (period === "monthly") setMonthlyData(json.data ?? []);
      setLoading((l) => ({ ...l, [period]: false }));
    };

    fetchPeriod("daily");
    fetchPeriod("weekly");
    fetchPeriod("monthly");
  }, []);

  const hours = globalStats
    ? Math.floor(globalStats.totalMinutes / 60)
    : 0;
  const remainingMin = globalStats
    ? globalStats.totalMinutes % 60
    : 0;

  // Today's count from daily data
  const todayStr = new Date().toISOString().split("T")[0];
  const todayEntry = dailyData.find((d) => d.date === todayStr);

  // This week's count from weekly data
  const thisWeekEntry = weeklyData[weeklyData.length - 1];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-gray-500 hover:text-white transition-colors text-sm flex items-center gap-1.5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </Link>
          <div className="w-px h-4 bg-gray-800" />
          <h1 className="text-white font-semibold">Stats</h1>
        </div>
        <div className="text-green-400 font-mono font-bold text-sm">
          15 MINUTES
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total tasks done"
            value={loading.global ? "—" : minutesToTasks(globalStats?.totalMinutes ?? 0)}
            sub="all time"
          />
          <StatCard
            label="Time focused"
            value={loading.global ? "—" : `${hours}h ${remainingMin}m`}
            sub="all time"
          />
          <StatCard
            label="Today"
            value={loading.daily ? "—" : (todayEntry?.count ?? 0)}
            sub={`${todayEntry?.minutes ?? 0} min`}
          />
          <StatCard
            label="This week"
            value={loading.weekly ? "—" : (thisWeekEntry?.count ?? 0)}
            sub={`${thisWeekEntry?.minutes ?? 0} min`}
          />
        </div>

        {/* Charts */}
        <ChartCard
          title="Daily"
          period="daily"
          metric={metrics.daily}
          onMetricChange={(m) => setMetrics((prev) => ({ ...prev, daily: m }))}
          data={dailyData}
          loading={loading.daily}
        />
        <ChartCard
          title="Weekly"
          period="weekly"
          metric={metrics.weekly}
          onMetricChange={(m) => setMetrics((prev) => ({ ...prev, weekly: m }))}
          data={weeklyData}
          loading={loading.weekly}
        />
        <ChartCard
          title="Monthly"
          period="monthly"
          metric={metrics.monthly}
          onMetricChange={(m) =>
            setMetrics((prev) => ({ ...prev, monthly: m }))
          }
          data={monthlyData}
          loading={loading.monthly}
        />
      </div>
    </div>
  );
}
