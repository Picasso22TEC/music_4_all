'use client'

import { motion } from 'framer-motion'

interface ProgressBarProps {
  progress: number
  animated?: boolean
}

export function ProgressBar({ progress, animated = true }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress))

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-dark-border">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full bg-neon-cyan shadow-neon-cyan"
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: animated ? 0.4 : 0, ease: 'easeOut' }}
        />
        {animated && clamped < 100 && (
          <motion.div
            className="absolute top-0 h-full w-8 rounded-full bg-white/20"
            animate={{ left: [`${clamped - 10}%`, `${clamped}%`] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>
      <span className="w-10 text-right font-mono text-xs text-neon-cyan">{clamped}%</span>
    </div>
  )
}
