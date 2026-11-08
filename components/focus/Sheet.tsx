"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Bottom sheet on phones, centred dialog on larger screens.
export default function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full sm:max-w-md max-h-[85dvh] flex flex-col bg-bg border-t sm:border border-line rounded-t-2xl sm:rounded-2xl pb-[env(safe-area-inset-bottom)]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
          >
            <div className="sm:hidden mx-auto mt-2 h-1 w-10 rounded-full bg-line" aria-hidden />
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="text-sm text-muted">{title}</h2>
              <button
                onClick={onClose}
                className="text-sm text-muted hover:text-ink transition-colors py-1"
              >
                Close
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
