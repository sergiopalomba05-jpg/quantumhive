import { useEffect, useRef, useCallback } from 'react'

interface UseAudioPlaybackReturn {
  playGeminiAudio: (base64Pcm: string) => void
  stopAll: () => void
}

export function useAudioPlayback(): UseAudioPlaybackReturn {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const pendingRef = useRef<Array<{ data: ArrayBuffer; order: number }>>([])
  const playingRef = useRef(false)
  const orderRef = useRef(0)

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext({ sampleRate: 24000 })
    }
    return audioCtxRef.current
  }, [])

  const playNext = useCallback(async () => {
    if (playingRef.current || pendingRef.current.length === 0) return
    playingRef.current = true

    const ctx = getCtx()
    if (ctx.state === 'suspended') await ctx.resume()

    const item = pendingRef.current.shift()!
    const int16 = new Int16Array(item.data)
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0
    }

    const buffer = ctx.createBuffer(1, float32.length, 24000)
    buffer.getChannelData(0).set(float32)

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)

    source.onended = () => {
      playingRef.current = false
      if (pendingRef.current.length > 0) {
        playNext()
      }
    }

    source.start()
  }, [getCtx])

  const playGeminiAudio = useCallback((base64Pcm: string) => {
    const raw = atob(base64Pcm)
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) {
      bytes[i] = raw.charCodeAt(i)
    }

    pendingRef.current.push({ data: bytes.buffer, order: orderRef.current++ })
    playNext()
  }, [playNext])

  const stopAll = useCallback(() => {
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {})
    }
    audioCtxRef.current = null
    pendingRef.current = []
    playingRef.current = false
    orderRef.current = 0
  }, [])

  return { playGeminiAudio, stopAll }
}
