'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface JellyBean {
  id: string;
  x: number;
  y: number;
  color: string;
  rotation: number;
}

const COLORS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f97316', // orange
];

export default function JellyBeanJar() {
  const [totalBeans, setTotalBeans] = useState(0);
  const [beans, setBeans] = useState<JellyBean[]>([]);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const loadCount = async () => {
      const statsRes = await fetch('/api/tasks/stats');
      const stats = await statsRes.json();
      const count = stats.completedCount || 0;

      // If count increased, show new bean animation
      if (count > totalBeans) {
        setShowNew(true);
        setTimeout(() => setShowNew(false), 1000);
      }

      setTotalBeans(count);
      generateBeans(count);
    };

    loadCount();

    // Poll for updates
    const interval = setInterval(loadCount, 2000);
    return () => clearInterval(interval);
  }, [totalBeans]);

  const generateBeans = (count: number) => {
    const newBeans: JellyBean[] = [];
    const maxDisplay = Math.min(count, 50); // Show max 50 beans visually

    for (let i = 0; i < maxDisplay; i++) {
      // Distribute beans in jar (bottom to top)
      const row = Math.floor(i / 6);
      const col = i % 6;

      newBeans.push({
        id: `bean-${i}`,
        x: 15 + col * 25 + (row % 2) * 12, // Offset alternate rows
        y: 220 - row * 20, // Stack from bottom
        color: COLORS[i % COLORS.length],
        rotation: Math.random() * 30 - 15
      });
    }

    setBeans(newBeans);
  };

  return (
    <div className="flex flex-col items-center p-6">
      {/* Jar SVG */}
      <div className="relative">
        <svg width="200" height="280" viewBox="0 0 200 280" className="drop-shadow-lg">
          {/* Jar body */}
          <defs>
            <linearGradient id="jarGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#4b5563', stopOpacity: 0.3 }} />
              <stop offset="50%" style={{ stopColor: '#6b7280', stopOpacity: 0.2 }} />
              <stop offset="100%" style={{ stopColor: '#4b5563', stopOpacity: 0.3 }} />
            </linearGradient>
          </defs>

          {/* Jar base */}
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
          <ellipse
            cx="100"
            cy="25"
            rx="35"
            ry="6"
            fill="#9ca3af"
          />

          {/* Jelly beans */}
          <g>
            <AnimatePresence>
              {beans.map((bean) => (
                <motion.ellipse
                  key={bean.id}
                  cx={bean.x}
                  cy={bean.y}
                  rx="8"
                  ry="12"
                  fill={bean.color}
                  transform={`rotate(${bean.rotation} ${bean.x} ${bean.y})`}
                  initial={{ scale: 0, y: 0 }}
                  animate={{ scale: 1, y: bean.y }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: Math.random() * 0.2
                  }}
                  style={{
                    filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))'
                  }}
                />
              ))}
            </AnimatePresence>
          </g>

          {/* Glass reflection effect */}
          <rect
            x="35"
            y="65"
            width="20"
            height="100"
            rx="10"
            fill="white"
            opacity="0.1"
          />
        </svg>

        {/* New bean notification */}
        <AnimatePresence>
          {showNew && (
            <motion.div
              className="absolute -top-4 -right-4 bg-green-500 text-black px-3 py-1 rounded-full text-xs font-mono font-bold"
              initial={{ scale: 0, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            >
              +1
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Counter */}
      <div className="mt-4 text-center font-mono">
        <div className="text-3xl font-bold text-green-400">
          {totalBeans}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {totalBeans === 1 ? 'jelly bean' : 'jelly beans'}
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {totalBeans * 15} minutes focused
        </div>
      </div>
    </div>
  );
}
