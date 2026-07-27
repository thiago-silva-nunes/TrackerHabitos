import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-surface flex flex-col items-center justify-center gap-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center gap-4"
      >
        {/* Logo mark */}
        <div className="w-14 h-14 rounded-2xl bg-habits flex items-center justify-center shadow-xl shadow-habits/30">
          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
            <path
              d="M5 12.5l4.5 4.5 9.5-9.5"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="text-foreground/40 text-sm tracking-wide">Carregando…</span>
      </motion.div>

      {/* Pulse ring */}
      <motion.div
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-14 h-14 rounded-2xl bg-habits/30"
      />
    </div>
  );
}
