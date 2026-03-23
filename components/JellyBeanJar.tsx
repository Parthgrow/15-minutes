"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface JellyBean {
  id: string;
  x: number;
  y: number;
  color: string;
  rotation: number;
}

const COLORS = [
  "#ef4444", // red
  "#f59e0b", // amber
  "#10b981", // green
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f97316", // orange
];

function generateBeans(count: number): JellyBean[] {
  const beans: JellyBean[] = [];
  const maxDisplay = Math.min(count, 100);

  for (let i = 0; i < maxDisplay; i++) {
    const row = Math.floor(i / 6);
    const col = i % 6;

    // Organic jitter: break the rigid grid with seeded pseudo-random offsets
    const xJitter = ((i * 7 + 3) % 11) - 5;
    const yJitter = ((i * 13) % 7) - 3;

    beans.push({
      id: `bean-${i}`,
      x: 40 + col * 24 + (row % 2) * 12 + xJitter,
      y: 226 - row * 9 + yJitter,
      color: COLORS[(i * 3 + Math.floor(i / 7)) % COLORS.length],
      rotation: 0,
    });
  }
  return beans;
}

interface JellyBeanJarProps {
  completedCount: number;
  totalMinutes: number;
}

export default function JellyBeanJar({ completedCount, totalMinutes }: JellyBeanJarProps) {
  const [showNew, setShowNew] = useState(false);
  const beanCount = Math.floor(totalMinutes / 15);
  const prevCountRef = useRef(beanCount);

  const beans = useMemo(() => generateBeans(beanCount), [beanCount]);

  useEffect(() => {
    if (beanCount > prevCountRef.current) {
      prevCountRef.current = beanCount;
      const id = setTimeout(() => setShowNew(true), 0);
      const id2 = setTimeout(() => setShowNew(false), 1000);
      return () => {
        clearTimeout(id);
        clearTimeout(id2);
      };
    }
    prevCountRef.current = beanCount;
  }, [beanCount]);

  return (
    <div className="flex flex-col items-center p-6">
      {/* Jar SVG */}
      <div className="relative">
        <svg
          width="200"
          height="280"
          viewBox="0 0 200 280"
          className="drop-shadow-lg"
        >
          <defs>
            {/* Glass border gradient */}
            <linearGradient id="jarGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   style={{ stopColor: "#4b5563", stopOpacity: 0.5 }} />
              <stop offset="50%"  style={{ stopColor: "#6b7280", stopOpacity: 0.25 }} />
              <stop offset="100%" style={{ stopColor: "#4b5563", stopOpacity: 0.5 }} />
            </linearGradient>

            {/* Jar interior — dark but visible, not pure black */}
            <radialGradient id="jarInterior" cx="50%" cy="80%" r="60%">
              <stop offset="0%"   stopColor="#1a2a1a" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#0d0d0d" stopOpacity="0.97" />
            </radialGradient>

            {/* Clip beans to jar body */}
            <clipPath id="jarClip">
              <rect x="32" y="62" width="136" height="176" rx="8" />
            </clipPath>
          </defs>

          {/* Jar interior fill — renders before beans so they sit on top */}
          <rect
            x="32"
            y="62"
            width="136"
            height="176"
            rx="8"
            fill="url(#jarInterior)"
          />

          {/* Jelly beans — clipped inside jar */}
          <g clipPath="url(#jarClip)">
            <AnimatePresence>
              {beans.map((bean, index) => (
                <g key={bean.id}>
                  {/* Bean body — circular */}
                  <motion.circle
                    cx={bean.x}
                    cy={bean.y}
                    r="9"
                    fill={bean.color}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                      delay: (index % 5) * 0.05,
                    }}
                    style={{
                      filter: "drop-shadow(1px 2px 3px rgba(0,0,0,0.5))",
                    }}
                  />
                  {/* Glossy highlight */}
                  <motion.circle
                    cx={bean.x - 3}
                    cy={bean.y - 3}
                    r="3"
                    fill="white"
                    opacity="0.35"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.35 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                      delay: (index % 5) * 0.05,
                    }}
                  />
                </g>
              ))}
            </AnimatePresence>
          </g>

          {/* Jar body border — rendered after beans so glass is on top */}
          <rect
            x="30"
            y="60"
            width="140"
            height="180"
            rx="10"
            fill="url(#jarGlass)"
            stroke="#9ca3af"
            strokeWidth="2"
          />

          {/* Jar neck */}
          <rect
            x="60"
            y="30"
            width="80"
            height="35"
            rx="5"
            fill="url(#jarGlass)"
            stroke="#9ca3af"
            strokeWidth="2"
          />

          {/* Jar lid */}
          <ellipse
            cx="100"
            cy="30"
            rx="45"
            ry="8"
            fill="#6b7280"
            stroke="#9ca3af"
            strokeWidth="2"
          />

          {/* Lid top */}
          <ellipse cx="100" cy="25" rx="35" ry="6" fill="#9ca3af" />

        </svg>

        {/* New bean notification */}
        <AnimatePresence>
          {showNew && (
            <motion.div
              className="absolute -top-4 -right-4 bg-green-500 text-black px-3 py-1 rounded-full text-xs font-mono font-bold"
              initial={{ scale: 0, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              +1
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Counter */}
      <div className="mt-4 text-center font-mono">
        <div className="text-3xl font-bold text-green-400">
          {beanCount}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {beanCount === 1 ? "jelly bean" : "jelly beans"}
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {totalMinutes} minutes focused
        </div>
      </div>
    </div>
  );
}
