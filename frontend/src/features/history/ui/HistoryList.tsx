import { HistoryItem } from './HistoryItem'
import type { HistoryRecord } from '../model/history.types'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface HistoryListProps {
  items: HistoryRecord[]
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Ordered list of HistoryItem rows.
 * Presentational — receives items via props.
 */
export function HistoryList({ items }: HistoryListProps) {
  return (
    <ul
      role="list"
      aria-label={`${items.length} download${items.length !== 1 ? 's' : ''} in history`}
      className="space-y-2"
    >
      {items.map((record) => (
        <HistoryItem key={record.id} record={record} />
      ))}
    </ul>
  )
}
