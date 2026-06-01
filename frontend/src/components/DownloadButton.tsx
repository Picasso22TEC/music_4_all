'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface DownloadButtonProps {
  onClick: () => Promise<void>
  disabled?: boolean
  label?: string
}

export function DownloadButton({ onClick, disabled = false, label }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await onClick()
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      disabled={disabled || loading}
      className="rounded border border-neon-green px-8 py-3 font-mono font-bold text-neon-green shadow-neon-green transition-all hover:bg-neon-green/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? '⟳ Descargando...' : `⬇ ${label ?? 'Descargar'}`}
    </motion.button>
  )
}
