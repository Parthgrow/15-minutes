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
          <div className="absolute inset-0 bg-bg/85 backdrop-blur-sm" />

          {/* Main celebration text */}
          <motion.div
            className="relative text-5xl sm:text-6xl font-light tracking-tight text-ink"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1.08, 1], opacity: 1 }}
            transition={{ duration: 0.5, times: [0, 0.6, 1], ease: 'easeOut' }}
          >
            Shipped.
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
            className="absolute border-2 border-accent rounded-full"
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
            className="absolute border border-accent/60 rounded-full"
            initial={{ width: 0, height: 0, opacity: 0.6 }}
            animate={{
              width: 400,
              height: 400,
              opacity: 0
            }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
