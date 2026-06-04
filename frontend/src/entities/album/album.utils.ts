import type { AudioQuality, AudioMode } from './album.types'

export function getAudioQualityLabel(quality: AudioQuality): string {
  const labels: Record<AudioQuality, string> = {
    MASTER: 'Master',
    HIRES: 'Hi-Res',
    HIGH: 'High',
    NORMAL: 'Normal',
  }
  return labels[quality]
}

export function getAudioModeLabel(mode: AudioMode): string {
  const labels: Record<AudioMode, string> = {
    MQA: 'MQA',
    SONY_360RA: '360RA',
    DOLBY_ATMOS: 'Atmos',
    STEREO: 'Stereo',
  }
  return labels[mode]
}
