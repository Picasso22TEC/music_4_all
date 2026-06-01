'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { SearchResult } from '@/lib/api'

interface VinylCardProps {
  album: SearchResult
  selected?: boolean
  onSelect: (album: SearchResult) => void
}

export function VinylCard({ album, selected = false, onSelect }: VinylCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(album)}
      className={`cursor-pointer rounded-lg border bg-dark-surface p-4 transition-all ${
        selected
          ? 'border-neon-green shadow-neon-green'
          : 'border-dark-border hover:border-neon-cyan hover:shadow-neon-cyan'
      }`}
    >
      <div className="mb-3 aspect-square w-full overflow-hidden rounded">
        {album.cover_url ? (
          <Image
            src={album.cover_url}
            alt={album.title}
            width={200}
            height={200}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-dark-border text-4xl">
            ♪
          </div>
        )}
      </div>
      <h3 className="truncate font-bold text-white">{album.title}</h3>
      <p className="truncate text-sm text-gray-400">{album.artist}</p>
      {album.type && (
        <span className="mt-1 inline-block text-xs font-bold uppercase text-neon-magenta">
          {album.type}
        </span>
      )}
    </motion.div>
  )
}
