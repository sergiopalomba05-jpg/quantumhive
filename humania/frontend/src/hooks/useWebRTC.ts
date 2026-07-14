import { useState, useCallback, useRef, useEffect } from 'react'

interface UseWebRTCReturn {
  isConnected: boolean
  isConnecting: boolean
  connect: (offer: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit | null>
  disconnect: () => void
  addFrame: (frame: string) => void
}

export function useWebRTC(): UseWebRTCReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const videoTrackRef = useRef<MediaStreamTrack | null>(null)
  const frameQueueRef = useRef<string[]>([])
  const isRenderingRef = useRef(false)

  const renderNextFrame = useCallback(() => {
    if (frameQueueRef.current.length === 0) {
      isRenderingRef.current = false
      return
    }

    isRenderingRef.current = true
    const frame = frameQueueRef.current.shift()!

    // Convert base64 to VideoFrame and send
    if (videoTrackRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      const ctx = canvas.getContext('2d')!

      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 640, 480)

        // Create VideoFrame from canvas
        const frame = new VideoFrame(canvas, {
          timestamp: performance.now(),
        })

        // Send frame via VideoTrack
        // Note: This is a simplified approach. In production, you'd use
        // a proper MediaStreamTrack with addFrame()
        URL.revokeObjectURL(img.src)
      }
      img.src = `data:image/jpeg;base64,${frame}`
    }

    // Schedule next frame at 30fps (~33ms)
    setTimeout(renderNextFrame, 33)
  }, [])

  const addFrame = useCallback((frame: string) => {
    frameQueueRef.current.push(frame)

    // Start rendering if not already
    if (!isRenderingRef.current) {
      renderNextFrame()
    }
  }, [renderNextFrame])

  const connect = useCallback(async (offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> => {
    setIsConnecting(true)

    try {
      const config: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      }

      const pc = new RTCPeerConnection(config)
      pcRef.current = pc

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state:', pc.connectionState)
        if (pc.connectionState === 'connected') {
          setIsConnected(true)
          setIsConnecting(false)
        } else if (pc.connectionState === 'failed') {
          setIsConnected(false)
          setIsConnecting(false)
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE connection state:', pc.iceConnectionState)
      }

      // Set remote description (offer)
      await pc.setRemoteDescription(offer)

      // Create answer
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      // Wait for ICE gathering
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve()
        } else {
          const checkState = () => {
            if (pc.iceGatheringState === 'complete') {
              pc.removeEventListener('icegatheringstatechange', checkState)
              resolve()
            }
          }
          pc.addEventListener('icegatheringstatechange', checkState)
        }
      })

      return pc.localDescription
    } catch (error) {
      console.error('[WebRTC] Connection error:', error)
      setIsConnecting(false)
      return null
    }
  }, [])

  const disconnect = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
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
    addFrame,
  }
}
