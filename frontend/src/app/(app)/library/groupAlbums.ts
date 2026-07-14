import type { HistoryRecord } from '@/features/history'

// ─── Tipo de álbum agrupado ───────────────────────────────────────────────────
// El historial es una lista plana de tracks (un registro por track). El backend
// NO persiste el título del álbum — solo nombres de track — por eso la tarjeta
// de Library lidera con el artista.

export interface LibraryAlbum {
  /** Clave de agrupación (coverUrl || jobId || id del primer track) */
  key: string
  coverUrl: string | null
  artist: string
  trackCount: number
  /** Cadena libre de calidad que escribió el worker (p. ej. "96kHz / 24bit") */
  quality: string
  /** ISO 8601 del track más reciente del álbum */
  downloadedAt: string
}

// ─── Agrupación: historial (por track) → álbumes ──────────────────────────────
//
// El worker guarda un registro por track con `job_id` (agrupa el álbum) y
// `cover_url` (la carátula del álbum). En dos pasadas para cubrir ambos casos:
//   1. Agrupar por `jobId || coverUrl || id` — un job nunca se parte (aunque
//      alguna carátula venga nula) y los registros legacy sin job caen por
//      carátula, o por id como último recurso.
//   2. Fusionar grupos que comparten una misma carátula no-nula — deduplica
//      re-descargas del mismo álbum (dos jobs distintos, misma portada).

interface AlbumAcc {
  key: string
  coverUrl: string | null
  quality: string
  trackCount: number
  latest: string
  artistCounts: Map<string, number>
}

/** Funde `src` dentro de `dst` (mismo álbum llegado por otra clave de pasada 1). */
function absorb(dst: AlbumAcc, src: AlbumAcc): void {
  dst.trackCount += src.trackCount
  if (src.coverUrl && !dst.coverUrl) dst.coverUrl = src.coverUrl
  if (src.latest > dst.latest) dst.latest = src.latest
  for (const [name, count] of src.artistCounts) {
    dst.artistCounts.set(name, (dst.artistCounts.get(name) ?? 0) + count)
  }
}

export function groupIntoAlbums(records: HistoryRecord[]): LibraryAlbum[] {
  // ── Pasada 1: por jobId (estable) → coverUrl → id ──────────────────────────
  const byKey = new Map<string, AlbumAcc>()
  for (const r of records) {
    const key = r.jobId || r.coverUrl || r.id
    const acc = byKey.get(key)
    if (!acc) {
      byKey.set(key, {
        key,
        coverUrl: r.coverUrl,
        quality: r.quality,
        trackCount: 1,
        latest: r.downloadedAt,
        artistCounts: new Map([[r.artist, 1]]),
      })
    } else {
      absorb(acc, {
        key,
        coverUrl: r.coverUrl,
        quality: r.quality,
        trackCount: 1,
        latest: r.downloadedAt,
        artistCounts: new Map([[r.artist, 1]]),
      })
    }
  }

  // ── Pasada 2: fusionar por carátula compartida (dedup de re-descargas) ──────
  const finals: AlbumAcc[] = []
  const byCover = new Map<string, AlbumAcc>()
  for (const acc of byKey.values()) {
    if (acc.coverUrl) {
      const canonical = byCover.get(acc.coverUrl)
      if (canonical) {
        absorb(canonical, acc)
        continue
      }
      byCover.set(acc.coverUrl, acc)
    }
    finals.push(acc)
  }

  // ── Proyección a LibraryAlbum + orden por más reciente ─────────────────────
  const albums = finals.map<LibraryAlbum>((acc) => {
    // Artista dominante del álbum (los "feat." pueden variar por track)
    let artist = 'Unknown Artist'
    let max = -1
    for (const [name, count] of acc.artistCounts) {
      if (count > max && name) {
        max = count
        artist = name
      }
    }
    return {
      key: acc.key,
      coverUrl: acc.coverUrl,
      artist,
      trackCount: acc.trackCount,
      quality: acc.quality,
      downloadedAt: acc.latest,
    }
  })

  // ISO 8601 compara lexicográficamente
  albums.sort((a, b) => (a.downloadedAt < b.downloadedAt ? 1 : -1))
  return albums
}
