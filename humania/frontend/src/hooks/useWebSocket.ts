import { useState, useEffect, useRef, useCallback } from 'react'

interface UseWebSocketReturn {
  isConnected: boolean
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  sendMessage: (data: any) => void
  lastMessage: any | null
}

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastMessage, setLastMessage] = useState<any | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setIsConnecting(true)

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws/companion`

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setIsConnected(true)
        setIsConnecting(false)
        console.log('[WS] Connected')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)
        } catch (e) {
          console.error('[WS] Error parsing message:', e)
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        setIsConnecting(false)
        console.log('[WS] Disconnected')

        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) {
            console.log('[WS] Attempting reconnect...')
            connect()
          }
        }, 3000)
      }

      ws.onerror = (error) => {
        console.error('[WS] Error:', error)
        setIsConnecting(false)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('[WS] Connection error:', error)
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendMessage,
    lastMessage
  }
}
