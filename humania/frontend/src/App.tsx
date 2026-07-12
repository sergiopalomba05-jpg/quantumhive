import { useState, useEffect, useRef, useCallback } from 'react'
import AvatarCanvas from './components/AvatarCanvas'
import ChatInput from './components/ChatInput'
import ConnectionStatus from './components/ConnectionStatus'
import { useWebSocket } from './hooks/useWebSocket'
import { useAudioCapture } from './hooks/useAudioCapture'
import { useAvatarRenderer } from './hooks/useAvatarRenderer'

export type CompanionState = 'idle' | 'listening' | 'thinking' | 'speaking'

export default function App() {
  const [state, setState] = useState<CompanionState>('idle')
  const [transcript, setTranscript] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'companion'; text: string }>>([])

  const {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendMessage,
    lastMessage
  } = useWebSocket()

  const {
    isListening,
    startListening,
    stopListening
  } = useAudioCapture()

  const {
    currentFrame,
    addFrame
  } = useAvatarRenderer()

  // Handle incoming messages from server
  useEffect(() => {
    if (!lastMessage) return

    const msg = lastMessage

    if (msg.connected) {
      console.log('Connected to Humania server')
    }

    if (msg.audio) {
      setState('speaking')
      // TODO: Play audio chunk
    }

    if (msg.text) {
      setTranscript(prev => prev + msg.text)
    }

    if (msg.frame) {
      addFrame(msg.frame)
    }

    if (msg.turnComplete) {
      // Save final message
      if (transcript) {
        setMessages(prev => [...prev, { role: 'companion', text: transcript }])
        setTranscript('')
      }
      setState('idle')
    }
  }, [lastMessage, transcript, addFrame])

  // Handle audio capture
  useEffect(() => {
    if (isListening) {
      // Send audio chunks to server
      // TODO: Implement audio chunk sending
    }
  }, [isListening])

  const handleStartCall = useCallback(async () => {
    await connect()
    setState('listening')
    startListening()
  }, [connect, startListening])

  const handleEndCall = useCallback(() => {
    stopListening()
    disconnect()
    setState('idle')
    setTranscript('')
  }, [stopListening, disconnect])

  const handleSendMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, { role: 'user', text }])
    sendMessage({ text })
    setState('thinking')
  }, [sendMessage])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)',
      padding: '20px'
    }}>
      {/* Avatar */}
      <AvatarCanvas
        frame={currentFrame}
        isSpeaking={state === 'speaking'}
      />

      {/* Status */}
      <ConnectionStatus
        isConnected={isConnected}
        isConnecting={isConnecting}
        state={state}
      />

      {/* Transcript */}
      {transcript && (
        <div style={{
          marginTop: '20px',
          padding: '12px 20px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          maxWidth: '500px',
          textAlign: 'center',
          animation: 'fadeIn 0.3s ease'
        }}>
          {transcript}
        </div>
      )}

      {/* Messages */}
      <div style={{
        position: 'absolute',
        bottom: '120px',
        left: '20px',
        right: '20px',
        maxHeight: '200px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {messages.slice(-5).map((msg, i) => (
          <div key={i} style={{
            padding: '8px 16px',
            borderRadius: '12px',
            background: msg.role === 'user'
              ? 'rgba(99, 102, 241, 0.3)'
              : 'rgba(255,255,255,0.1)',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            fontSize: '14px',
            animation: 'fadeIn 0.3s ease'
          }}>
            {msg.text}
          </div>
        ))}
      </div>

      {/* Controls */}
      <ChatInput
        state={state}
        onStartCall={handleStartCall}
        onEndCall={handleEndCall}
        onSendMessage={handleSendMessage}
        isListening={isListening}
      />
    </div>
  )
}
