export function isValidTidalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname.includes('tidal.com') && parsed.pathname.length > 1
  } catch {
    return false
  }
}

export function getTidalUrlType(url: string): 'album' | 'track' | 'playlist' | null {
  try {
    const { pathname } = new URL(url)
    if (pathname.includes('/album/')) return 'album'
    if (pathname.includes('/track/')) return 'track'
    if (pathname.includes('/playlist/')) return 'playlist'
    return null
  } catch {
    return null
  }
}
