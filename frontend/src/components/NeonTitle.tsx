'use client'

import { motion } from 'framer-motion'

export function NeonTitle() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="text-center"
    >
      <h1 className="animate-pulse-neon font-mono text-4xl font-bold tracking-widest text-neon-green drop-shadow-[0_0_20px_#00ff00]">
        MUSIC 4 ALL
      </h1>
      <p className="mt-1 font-mono text-sm tracking-[0.3em] text-neon-cyan">
        ∴ Neón Audio Store ∴
      </p>
    </motion.div>
  )
}
