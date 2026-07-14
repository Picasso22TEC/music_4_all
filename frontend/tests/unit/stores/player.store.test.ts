import { beforeEach, describe, expect, it } from 'vitest'

import {
  usePlayerStore,
  selectHasNext,
  selectHasPrevious,
  type PlayerTrack,
} from '@/features/player'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function track(id: string): PlayerTrack {
  return { id, title: `Track ${id}`, artist: 'Artist', src: `/api/download/stream/${id}` }
}

const QUEUE = [track('a'), track('b'), track('c')]

function reset() {
  usePlayerStore.setState({
    queue: [],
    order: [],
    orderPos: -1,
    current: null,
    isPlaying: false,
    progressSeconds: 0,
    durationSeconds: 0,
    volume: 0.8,
    shuffle: false,
    repeat: 'off',
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('player.store', () => {
  beforeEach(reset)

  it('play() loads a single-track queue and starts playing', () => {
    usePlayerStore.getState().play(track('x'))
    const s = usePlayerStore.getState()
    expect(s.queue).toHaveLength(1)
    expect(s.current?.id).toBe('x')
    expect(s.isPlaying).toBe(true)
  })

  it('playQueue() starts at the given index', () => {
    usePlayerStore.getState().playQueue(QUEUE, 1)
    expect(usePlayerStore.getState().current?.id).toBe('b')
  })

  it('next() advances through the queue and stops at the end (repeat off)', () => {
    usePlayerStore.getState().playQueue(QUEUE, 0)
    usePlayerStore.getState().next()
    expect(usePlayerStore.getState().current?.id).toBe('b')
    usePlayerStore.getState().next()
    expect(usePlayerStore.getState().current?.id).toBe('c')
    usePlayerStore.getState().next() // past the end
    const s = usePlayerStore.getState()
    expect(s.current?.id).toBe('c') // stays on last
    expect(s.isPlaying).toBe(false) // stopped advancing
  })

  it('next() wraps to the first track when repeat = all', () => {
    usePlayerStore.getState().playQueue(QUEUE, 2)
    usePlayerStore.setState({ repeat: 'all' })
    usePlayerStore.getState().next()
    expect(usePlayerStore.getState().current?.id).toBe('a')
  })

  it('previous() restarts the current track when past 3s, else steps back', () => {
    usePlayerStore.getState().playQueue(QUEUE, 1)
    // Past 3s → restart current (b)
    usePlayerStore.setState({ progressSeconds: 10 })
    usePlayerStore.getState().previous()
    let s = usePlayerStore.getState()
    expect(s.current?.id).toBe('b')
    expect(s.progressSeconds).toBe(0)
    // Under 3s → step back to a
    usePlayerStore.getState().previous()
    expect(usePlayerStore.getState().current?.id).toBe('a')
  })

  it('toggleShuffle() keeps the current track and reorders the rest', () => {
    usePlayerStore.getState().playQueue(QUEUE, 1) // current = b
    usePlayerStore.getState().toggleShuffle()
    const s = usePlayerStore.getState()
    expect(s.shuffle).toBe(true)
    expect(s.current?.id).toBe('b') // current unchanged
    expect(s.order[s.orderPos]).toBe(1) // still points at b
    expect([...s.order].sort()).toEqual([0, 1, 2]) // a valid permutation
  })

  it('cycleRepeat() cycles off → all → one → off', () => {
    const { cycleRepeat } = usePlayerStore.getState()
    expect(usePlayerStore.getState().repeat).toBe('off')
    cycleRepeat()
    expect(usePlayerStore.getState().repeat).toBe('all')
    cycleRepeat()
    expect(usePlayerStore.getState().repeat).toBe('one')
    cycleRepeat()
    expect(usePlayerStore.getState().repeat).toBe('off')
  })

  it('selectHasNext / selectHasPrevious reflect queue position and repeat', () => {
    usePlayerStore.getState().playQueue(QUEUE, 0)
    expect(selectHasPrevious(usePlayerStore.getState())).toBe(false)
    expect(selectHasNext(usePlayerStore.getState())).toBe(true)
    usePlayerStore.getState().playAt(2)
    expect(selectHasNext(usePlayerStore.getState())).toBe(false)
    expect(selectHasPrevious(usePlayerStore.getState())).toBe(true)
    // repeat = all → both always available
    usePlayerStore.setState({ repeat: 'all' })
    expect(selectHasNext(usePlayerStore.getState())).toBe(true)
    expect(selectHasPrevious(usePlayerStore.getState())).toBe(true)
  })

  it('stop() clears the queue and current track', () => {
    usePlayerStore.getState().playQueue(QUEUE, 0)
    usePlayerStore.getState().stop()
    const s = usePlayerStore.getState()
    expect(s.queue).toHaveLength(0)
    expect(s.current).toBeNull()
    expect(s.isPlaying).toBe(false)
  })
})
