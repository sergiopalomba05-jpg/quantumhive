import { useState, useCallback, useRef } from 'react'

interface UseAvatarRendererReturn {
  currentFrame: string | null
  addFrame: (frame: string) => void
  clearFrames: () => void
}

export function useAvatarRenderer(): UseAvatarRendererReturn {
  const [currentFrame, setCurrentFrame] = useState<string | null>(null)
  const frameQueueRef = useRef<string[]>([])
  const isRenderingRef = useRef(false)

  const renderNextFrame = useCallback(() => {
    if (frameQueueRef.current.length === 0) {
      isRenderingRef.current = false
      return
    }

    isRenderingRef.current = true
    const frame = frameQueueRef.current.shift()!
    setCurrentFrame(frame)

    // Schedule next frame at 31fps (~32ms)
    setTimeout(renderNextFrame, 32)
  }, [])

  const addFrame = useCallback((frame: string) => {
    frameQueueRef.current.push(frame)

    // Start rendering if not already
    if (!isRenderingRef.current) {
      renderNextFrame()
    }
  }, [renderNextFrame])

  const clearFrames = useCallback(() => {
    frameQueueRef.current = []
    setCurrentFrame(null)
    isRenderingRef.current = false
  }, [])

  return {
    currentFrame,
    addFrame,
    clearFrames
  }
}
