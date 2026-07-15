import { useState, useCallback, useRef } from 'react'

interface UseAudioCaptureProps {
  onAudioChunk: (base64: string) => void
  enabled?: boolean
}

interface UseAudioCaptureReturn {
  isListening: boolean
  startListening: () => Promise<void>
  stopListening: () => void
}

export function useAudioCapture({ onAudioChunk, enabled = true }: UseAudioCaptureProps): UseAudioCaptureReturn {
  const [isListening, setIsListening] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)

  const float32ToBase64 = useCallback((float32Array: Float32Array): string => {
    const int16 = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    const bytes = new Uint8Array(int16.buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }, [])

  const startListening = useCallback(async () => {
    if (!enabled) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })

      streamRef.current = stream

      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      source.connect(processor)
      processor.connect(audioContext.destination)

      processor.onaudioprocess = (event) => {
        const audioData = event.inputBuffer.getChannelData(0)
        const base64 = float32ToBase64(audioData)
        onAudioChunk(base64)
      }

      setIsListening(true)
      console.log('[Audio] Listening at 16kHz mono')
    } catch (error) {
      console.error('[Audio] Capture error:', error)
      throw error
    }
  }, [enabled, onAudioChunk, float32ToBase64])

  const stopListening = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    setIsListening(false)
    console.log('[Audio] Stopped')
  }, [])

  return {
    isListening,
    startListening,
    stopListening
  }
}
