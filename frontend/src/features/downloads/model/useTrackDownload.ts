'use client'

import { useCallback } from 'react'

import type { AudioQuality, Track } from '@/entities'

import { useDownloadsStore } from './downloads.store'
import { useStartDownloadMutation } from './downloads.queries'
import { useDownloadErrorToast } from './useDownloadErrorToast'

/**
 * Encola la descarga de **una canción suelta** (POST /downloads {trackId}).
 *
 * El backend ya aceptaba descargas por track; esto solo lo pone al alcance de
 * cualquier lista de canciones (top tracks del artista, álbum, búsqueda). Cada
 * lista maqueta su propio botón: lo que se comparte es la decisión de qué
 * encolar y cómo avisar del rechazo (p.ej. el 429 de cuota).
 *
 * Todo `Track` lleva su contexto de álbum (`mapTrackDTO`), así que la tarjeta de
 * la cola sale con su carátula sin pedir nada extra.
 */
export function useTrackDownload(quality: AudioQuality) {
  const mutation = useStartDownloadMutation()
  const onError = useDownloadErrorToast()

  const downloadTrack = useCallback(
    (track: Track, options?: { onError?: (error: unknown) => void }) => {
      // `options.onError` existe para encolar varias canciones de una vez: quien
      // lanza el lote puede avisar una sola vez en vez de un toast por canción.
      mutation.mutate(
        { trackId: track.id, quality },
        {
          onError: options?.onError ?? onError,
          onSuccess: (result) => {
            useDownloadsStore.getState().enqueue({
              backendJobId: result.jobId,
              albumId: track.albumId,
              // La cola muestra este título: para una canción suelta interesa el
              // nombre de la canción, no el del álbum al que pertenece.
              albumTitle: track.title,
              artistName: track.artist.name,
              totalTracks: 1,
              qualityOverride: quality,
            })
          },
        },
      )
    },
    [mutation, onError, quality],
  )

  return downloadTrack
}
