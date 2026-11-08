"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TimelineEntry } from "@/lib/api";

const MIN_CELL = 11;
const MAX_CELL = 16;
const GAP = 3;
const WEEKS = 53;
const LABEL_COLUMN = 32;

const LEVEL_CLASSES = ["bg-line", "bg-accent/25", "bg-accent/45", "bg-accent/70", "bg-accent"];

// Blocks are 15 minutes each; shade by how many were done that day
function level(minutes: number) {
  const blocks = Math.floor(minutes / 15);
  if (blocks === 0) return 0;
  if (blocks === 1) return 1;
  if (blocks <= 3) return 2;
  if (blocks <= 5) return 3;
  return 4;
}

// Dates from the API are UTC calendar days
const parse = (date: string) => new Date(`${date}T00:00:00Z`);

function describe(entry: TimelineEntry) {
  const blocks = Math.floor(entry.minutes / 15);
  const day = parse(entry.date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (blocks === 0) return `No blocks on ${day}`;
  return `${blocks} ${blocks === 1 ? "block" : "blocks"} · ${entry.minutes} min on ${day}`;
}

// GitHub-style grid: one column per week (Sunday first), latest week on the right.
export default function ContributionGraph({ days }: { days: TimelineEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<TimelineEntry | null>(null);
  const [cell, setCell] = useState(MIN_CELL);

  // Grow cells to fill wide cards; narrow screens scroll horizontally instead
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fit = () => {
      const available = el.clientWidth - LABEL_COLUMN;
      const size = Math.floor((available + GAP) / WEEKS - GAP);
      setCell(Math.max(MIN_CELL, Math.min(MAX_CELL, size)));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { weeks, months } = useMemo(() => {
    if (days.length === 0) return { weeks: [], months: [] };
    const todayDow = parse(days[days.length - 1].date).getUTCDay();
    const start = Math.max(0, days.length - ((WEEKS - 1) * 7 + todayDow + 1));
    const weeks: (TimelineEntry | null)[][] = [];
    for (let i = start; i < days.length; i += 7) {
      const week: (TimelineEntry | null)[] = days.slice(i, i + 7);
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }

    // Label a column when its first day starts a new month
    const months: { col: number; label: string }[] = [];
    let prevMonth = -1;
    weeks.forEach((week, col) => {
      const month = parse(week[0]!.date).getUTCMonth();
      if (month !== prevMonth) {
        months.push({
          col,
          label: parse(week[0]!.date).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
        });
        prevMonth = month;
      }
    });
    // Drop a leading label that would collide with the next one
    if (months.length > 1 && months[1].col - months[0].col < 3) months.shift();

    return { weeks, months };
  }, [days]);

  // Start scrolled to the most recent weeks on narrow screens
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks.length, cell]);

  const totalBlocks = days.reduce((sum, d) => sum + Math.floor(d.minutes / 15), 0);
  const width = weeks.length * (cell + GAP) - GAP;

  return (
    <div>
      <div ref={scrollRef} className="overflow-x-auto pb-2">
        <div className="flex w-max">
          {/* Weekday labels, pinned while the grid scrolls */}
          <div
            className="sticky left-0 z-10 grid shrink-0 text-[10px] text-faint pt-5 bg-bg"
            style={{ gridTemplateRows: `repeat(7, ${cell}px)`, rowGap: GAP, width: LABEL_COLUMN }}
            aria-hidden
          >
            {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
              <span key={i} className="flex items-center">
                {d}
              </span>
            ))}
          </div>

          <div>
            {/* Month labels */}
            <div className="relative h-5 text-[10px] text-faint" style={{ width }} aria-hidden>
              {months.map((m) => (
                <span key={m.col} className="absolute top-0" style={{ left: m.col * (cell + GAP) }}>
                  {m.label}
                </span>
              ))}
            </div>

            {/* Cells */}
            <div
              className="grid grid-flow-col"
              style={{
                gridTemplateRows: `repeat(7, ${cell}px)`,
                gridAutoColumns: `${cell}px`,
                gap: GAP,
              }}
              role="grid"
              aria-label={`${totalBlocks} blocks in the last year`}
              onMouseLeave={() => setSelected(null)}
            >
              {weeks.flat().map((entry, i) =>
                entry ? (
                  <button
                    key={entry.date}
                    type="button"
                    title={describe(entry)}
                    aria-label={describe(entry)}
                    onMouseEnter={() => setSelected(entry)}
                    onClick={() => setSelected(entry)}
                    className={`rounded-[2px] ${LEVEL_CLASSES[level(entry.minutes)]} ${
                      selected?.date === entry.date ? "ring-1 ring-ink" : ""
                    }`}
                  />
                ) : (
                  <span key={`empty-${i}`} />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted">
        <span className="tabular min-h-4">
          {selected ? describe(selected) : `${totalBlocks} blocks in the last year`}
        </span>
        <span className="flex items-center gap-1 text-faint" aria-hidden>
          Less
          {LEVEL_CLASSES.map((c) => (
            <span key={c} className={`w-[11px] h-[11px] rounded-[2px] ${c}`} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
