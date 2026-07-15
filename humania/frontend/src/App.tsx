import { useState, useEffect, useCallback, useRef } from 'react'
import AvatarCanvas from './components/AvatarCanvas'
import TranslationPanel from './components/TranslationPanel'
import ControlsBar from './components/ControlsBar'
import SettingsDrawer from './components/SettingsDrawer'
import { useWebSocket } from './hooks/useWebSocket'
import { useWebRTC } from './hooks/useWebRTC'
import { useAudioCapture } from './hooks/useAudioCapture'
import { useAudioPlayback } from './hooks/useAudioPlayback'
import { useAvatarRenderer } from './hooks/useAvatarRenderer'
import {
  Avatar,
  SpeechStyle,
  SubtitleItem,
  DOMINUS_AVATARS,
  SPEECH_STYLES,
  DEFAULT_CONFIG,
} from './types'

export type CompanionState = 'idle' | 'listening' | 'thinking' | 'speaking'

export default function App() {
  const [state, setState] = useState<CompanionState>('idle')
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([])
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar>(DOMINUS_AVATARS[0])
  const [selectedStyle, setSelectedStyle] = useState<SpeechStyle>(SPEECH_STYLES[0])
  const [targetLanguage, setTargetLanguage] = useState(DEFAULT_CONFIG.targetLanguage)
  const [translationEnabled, setTranslationEnabled] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [useWebRTCMode, setUseWebRTCMode] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const transcriptRef = useRef('')

  const {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendAudio,
    sendText,
    lastMessage,
  } = useWebSocket()

  const {
    isConnected: webrtcConnected,
    isConnecting: webrtcConnecting,
    connect: connectWebRTC,
    disconnect: disconnectWebRTC,
    addFrame: addFrameWebRTC,
  } = useWebRTC()

  const { currentFrame, addFrame, clearFrames } = useAvatarRenderer()
  const { playGeminiAudio, stopAll: stopAudio } = useAudioPlayback()

  const handleAudioChunk = useCallback((base64: string) => {
    if (!isMuted && isConnected) {
      sendAudio(base64)
    }
  }, [isMuted, isConnected, sendAudio])

  const {
    isListening,
    startListening,
    stopListening,
  } = useAudioCapture({
    onAudioChunk: handleAudioChunk,
    enabled: isConnected,
  })

  // Handle incoming messages from server
  useEffect(() => {
    if (!lastMessage) return

    const msg = lastMessage

    if (msg.connected) {
      console.log('[Pipeline] Connected')
      setSessionId(msg.session_id)
    }

    if (msg.audio) {
      setState('speaking')
      playGeminiAudio(msg.audio)
    }

    if (msg.frame) {
      if (useWebRTCMode && webrtcConnected) {
        // Send frame via WebRTC
        addFrameWebRTC(msg.frame)
      } else {
        // Use WebSocket frame rendering
        addFrame(msg.frame)
      }
    }

    if (msg.text) {
      transcriptRef.current += msg.text
      setSubtitles((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.sender === 'ai') {
          return [...prev.slice(0, -1), { ...last, text: last.text + msg.text }]
        }
        return [...prev, {
          id: crypto.randomUUID(),
          sender: 'ai',
          text: msg.text,
          timestamp: Date.now(),
        }]
      })
    }

    if (msg.turnComplete) {
      transcriptRef.current = ''
      setTimeout(() => setState('idle'), 500)
    }
  }, [lastMessage, addFrame, addFrameWebRTC, playGeminiAudio, useWebRTCMode, webrtcConnected])

  const handleStartCall = useCallback(async () => {
    clearFrames()
    await connect()
    setState('listening')
    startListening()

    // Set source image for WebRTC
    if (useWebRTCMode && sessionId) {
      try {
        const response = await fetch('/avatar/dominus_medio_cuerpo_neutro_v01.png')
        const blob = await response.blob()
        const reader = new FileReader()
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1]
          await fetch(`/api/webrtc/source-image/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 }),
          })
        }
        reader.readAsDataURL(blob)
      } catch (error) {
        console.error('[WebRTC] Error setting source image:', error)
      }
    }
  }, [connect, startListening, clearFrames, useWebRTCMode, sessionId])

  const handleEndCall = useCallback(() => {
    stopListening()
    disconnect()
    disconnectWebRTC()
    stopAudio()
    clearFrames()
    setState('idle')
    setSubtitles([])
    setSessionId(null)
    transcriptRef.current = ''
  }, [stopListening, disconnect, disconnectWebRTC, stopAudio, clearFrames])

  const handleSendMessage = useCallback((text: string) => {
    setSubtitles((prev) => [...prev, {
      id: crypto.randomUUID(),
      sender: 'user',
      text,
      timestamp: Date.now(),
    }])
    sendText(text)
    setState('thinking')
  }, [sendText])

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#050505' }}>
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none bg-microchip"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.03) 0%, transparent 60%)',
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
            style={{
              background: `linear-gradient(135deg, ${selectedAvatar.color}44, ${selectedAvatar.color}22)`,
              color: selectedAvatar.color,
              border: `1px solid ${selectedAvatar.color}33`,
            }}
          >
            {selectedAvatar.iconLabel}
          </div>
          <div>
            <h1 className="text-sm font-medium text-white/90">{selectedAvatar.name}</h1>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">{selectedAvatar.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isConnected && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-white/40 font-mono">
                {useWebRTCMode ? 'WEBRTC' : 'LIVE'}
              </span>
            </div>
          )}

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-col items-center justify-center" style={{ height: 'calc(100vh - 160px)' }}>
        <AvatarCanvas
          frame={currentFrame}
          isSpeaking={state === 'speaking'}
          useWebRTC={useWebRTCMode}
        />

        <div className="mt-6 mb-2">
          <p className="text-[11px] text-white/25 uppercase tracking-[4px] font-display">
            {state === 'idle' && (isConnected ? 'En linea' : 'Listo para conversar')}
            {state === 'listening' && 'Escuchando...'}
            {state === 'thinking' && 'Procesando...'}
            {state === 'speaking' && 'Transmitiendo...'}
          </p>
        </div>

        <TranslationPanel
          subtitles={subtitles}
          translationEnabled={translationEnabled}
        />

        {state === 'idle' && !isConnected && (
          <div className="flex gap-2 mt-4">
            {['CONVERSAR', 'CONSEJO', 'DIVERSION', 'REFLEXIONAR'].map((label) => (
              <button
                key={label}
                onClick={() => handleSendMessage(
                  label === 'CONVERSAR' ? 'Hola, como estas?' : label
                )}
                className="px-4 py-2 rounded-full text-[10px] uppercase tracking-wider transition-all hover:scale-105"
                style={{
                  background: 'rgba(212,175,55,0.06)',
                  border: '1px solid rgba(212,175,55,0.12)',
                  color: 'rgba(212,175,55,0.5)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </main>

      <ControlsBar
        state={state}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        translationEnabled={translationEnabled}
        onToggleMute={() => setIsMuted(!isMuted)}
        onToggleVideo={() => setIsVideoOff(!isVideoOff)}
        onToggleTranslation={() => setTranslationEnabled(!translationEnabled)}
        onClearSubtitles={() => setSubtitles([])}
        onStartCall={handleStartCall}
        onEndCall={handleEndCall}
      />

      <SettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        selectedAvatar={selectedAvatar}
        onSelectAvatar={setSelectedAvatar}
        selectedStyle={selectedStyle}
        onSelectStyle={setSelectedStyle}
        targetLanguage={targetLanguage}
        onSelectLanguage={setTargetLanguage}
        translationEnabled={translationEnabled}
        onToggleTranslation={() => setTranslationEnabled(!translationEnabled)}
      />
    </div>
  )
}
