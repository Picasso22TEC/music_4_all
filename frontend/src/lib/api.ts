import axios from 'axios'

// Base URL /api → next.config.mjs la reescribe a http://backend:8000
const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string
  title: string
  artist: string
  url: string
  cover_url?: string
  type: 'album' | 'track' | 'playlist'
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
}

export interface DownloadJob {
  job_id: string
  title: string
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  progress: number
  error?: string | null
}

export interface DownloadRecord {
  id: string
  title: string
  artist: string
  quality: string
  coverUrl?: string
  downloadedAt: string
}

export interface AuthStatusResponse {
  authenticated: boolean
  message?: string
}

export interface DeviceAuthResponse {
  verification_uri_complete: string
  user_code: string
  expires_in: number
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function getAuthStatus(): Promise<AuthStatusResponse> {
  const { data } = await client.get<AuthStatusResponse>('/auth/status')
  return data
}

export async function startDeviceAuth(): Promise<DeviceAuthResponse> {
  const { data } = await client.post<DeviceAuthResponse>('/auth/device')
  return data
}

export async function logout(): Promise<void> {
  await client.post('/auth/logout')
}

// ─── Metadata / Search ────────────────────────────────────────────────────────

export async function searchApi(query: string, limit = 10): Promise<SearchResult[]> {
  const { data } = await client.get<SearchResponse>('/metadata/search', {
    params: { q: query, limit },
  })
  return data.results
}

// ─── Download ─────────────────────────────────────────────────────────────────

export async function startDownload(url: string): Promise<DownloadJob> {
  const { data } = await client.post<DownloadJob>('/download/start', { url })
  return data
}

export async function getDownloadStatus(jobId: string): Promise<DownloadJob> {
  const { data } = await client.get<DownloadJob>(`/download/status/${jobId}`)
  return data
}

export function getFileUrl(jobId: string): string {
  return `/api/download/file/${jobId}`
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function historyApi(): Promise<DownloadRecord[]> {
  const { data } = await client.get<DownloadRecord[]>('/history')
  return data
}

export default client
