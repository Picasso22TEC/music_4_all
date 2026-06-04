import type { DownloadJob } from './download-job.types'

export function isJobActive(job: DownloadJob): boolean {
  return job.status === 'active'
}

export function isJobTerminal(job: DownloadJob): boolean {
  return job.status === 'completed' || job.status === 'error'
}
