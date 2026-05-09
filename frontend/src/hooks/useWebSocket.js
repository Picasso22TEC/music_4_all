import { useState, useEffect, useRef } from 'react'

/**
 * Hook para manejar conexiones WebSocket
 */
export function useWebSocket(url) {
  const [data, setData] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const ws = useRef(null)

  useEffect(() => {
    const connect = () => {
      ws.current = new WebSocket(url)

      ws.current.onopen = () => {
        setIsConnected(true)
      }

      ws.current.onmessage = (event) => {
        setData(JSON.parse(event.data))
      }

      ws.current.onclose = () => {
        setIsConnected(false)
      }
    }

    connect()

    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [url])

  return { data, isConnected, send: (msg) => ws.current?.send(JSON.stringify(msg)) }
}
