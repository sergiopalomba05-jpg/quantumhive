import { useState, useCallback, useRef } from 'react'

interface UseAudioCaptureReturn {
  isListening: boolean
  startListening: () => Promise<void>
  stopListening: () => void
}

export function useAudioCapture(): UseAudioCaptureReturn {
  const [isListening, setIsListening] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
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
        // TODO: Send audio chunks to WebSocket
        // Convert Float32Array to base64 and send
      }

      setIsListening(true)
      console.log('[Audio] Listening started')
    } catch (error) {
      console.error('[Audio] Error starting capture:', error)
      throw error
    }
  }, [])

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
    console.log('[Audio] Listening stopped')
  }, [])

  return {
    isListening,
    startListening,
    stopListening
  }
}
