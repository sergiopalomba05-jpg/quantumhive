import { useState, useEffect, useRef, useCallback } from 'react'
import { DEFAULT_CONFIG } from '../types'

interface UseWebSocketReturn {
  isConnected: boolean
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  sendAudio: (base64Audio: string) => void
  sendText: (text: string) => void
  lastMessage: any | null
}

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastMessage, setLastMessage] = useState<any | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttempts = useRef(0)

  const getWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/ws/companion`
  }, [])

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setIsConnecting(true)

    try {
      const ws = new WebSocket(getWsUrl())

      ws.onopen = () => {
        setIsConnected(true)
        setIsConnecting(false)
        reconnectAttempts.current = 0
        console.log('[WS] Connected')

        ws.send(JSON.stringify({
          type: 'config',
          config: {
            language: DEFAULT_CONFIG.targetLanguage,
            avatarId: DEFAULT_CONFIG.avatarId,
          }
        }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)
        } catch (e) {
          console.error('[WS] Parse error:', e)
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        setIsConnecting(false)
        console.log('[WS] Disconnected')

        const delay = Math.min(3000 * Math.pow(2, reconnectAttempts.current), 30000)
        reconnectAttempts.current++

        reconnectTimeoutRef.current = setTimeout(() => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) {
            console.log(`[WS] Reconnecting in ${delay}ms...`)
            connect()
          }
        }, delay)
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
  }, [getWsUrl])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    reconnectAttempts.current = 0
  }, [])

  const sendAudio = useCallback((base64Audio: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ audio: base64Audio }))
    }
  }, [])

  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text }))
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
    sendAudio,
    sendText,
    lastMessage
  }
}
