'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface CompletionAnimationProps {
  show: boolean;
  onComplete?: () => void;
}

export default function CompletionAnimation({ show, onComplete }: CompletionAnimationProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);

  useEffect(() => {
    if (show) {
      // Generate particles
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50,
        color: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)]
      }));
      setParticles(newParticles);

      // Clear after animation
      const timeout = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 pointer-events-none flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Main celebration text */}
          <motion.div
            className="text-6xl font-bold font-mono"
            initial={{ scale: 0, rotate: -180 }}
            animate={{
              scale: [0, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{
              duration: 0.6,
              times: [0, 0.6, 1],
              ease: 'easeOut'
            }}
          >
            <span className="text-green-400">🎉</span>
            <span className="text-green-400 ml-4">DONE!</span>
            <span className="text-green-400 ml-4">🎉</span>
          </motion.div>

          {/* Particles */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-3 h-3 rounded-full"
              style={{ backgroundColor: particle.color }}
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                opacity: 1
              }}
              animate={{
                x: particle.x * 8,
                y: particle.y * 8,
                scale: [0, 1, 0],
                opacity: [1, 1, 0]
              }}
              transition={{
                duration: 1.5,
                ease: 'easeOut'
              }}
            />
          ))}

          {/* Ripple effect */}
          <motion.div
            className="absolute border-4 border-green-400 rounded-full"
            initial={{ width: 0, height: 0, opacity: 0.8 }}
            animate={{
              width: 300,
              height: 300,
              opacity: 0
            }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />

          {/* Secondary ripple */}
          <motion.div
            className="absolute border-4 border-green-500 rounded-full"
            initial={{ width: 0, height: 0, opacity: 0.6 }}
            animate={{
              width: 400,
              height: 400,
              opacity: 0
            }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
          />

          {/* Jelly bean message */}
          <motion.div
            className="absolute bottom-1/3 text-2xl font-mono text-green-400 font-bold"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            +1 Jelly Bean!
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
