export function formatDuration(seconds: number): string {
  // Floor to whole seconds — callers may pass a fractional currentTime from the
  // <audio> element, and duration is NaN until its metadata loads.
  const total = Number.isFinite(seconds) ? Math.floor(seconds) : 0
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatEta(seconds: number): string {
  return formatDuration(seconds)
}

export function formatSpeed(mbps: number): string {
  return `${mbps.toFixed(1)} MB/s`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
