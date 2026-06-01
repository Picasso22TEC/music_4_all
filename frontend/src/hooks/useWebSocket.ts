import { useEffect, useRef, useState } from 'react'

export interface WebSocketMessage {
  job_id: string
  title?: string
  progress: number
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  error?: string | null
}

interface UseWebSocketReturn {
  data: WebSocketMessage | null
  isConnected: boolean
  send: (msg: unknown) => void
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const [data, setData] = useState<WebSocketMessage | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const ws = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!url) return

    ws.current = new WebSocket(url)
    ws.current.onopen = () => setIsConnected(true)
    ws.current.onmessage = (event: MessageEvent) => {
      try {
        setData(JSON.parse(event.data as string) as WebSocketMessage)
      } catch {
        // ignore malformed messages
      }
    }
    ws.current.onclose = () => setIsConnected(false)
    ws.current.onerror = () => setIsConnected(false)

    return () => {
      ws.current?.close()
    }
  }, [url])

  function send(msg: unknown) {
    ws.current?.send(JSON.stringify(msg))
  }

  return { data, isConnected, send }
}
