import { useState, useCallback, useRef } from 'react'
import { Mic, MicOff, Phone, PhoneOff, Send, Square } from 'lucide-react'
import { CompanionState } from '../App'

interface ChatInputProps {
  state: CompanionState
  onStartCall: () => void
  onEndCall: () => void
  onSendMessage: (text: string) => void
  isListening: boolean
}

export default function ChatInput({
  state,
  onStartCall,
  onEndCall,
  onSendMessage,
  isListening
}: ChatInputProps) {
  const [textMode, setTextMode] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = useCallback(() => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim())
      setInputValue('')
    }
  }, [inputValue, onSendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px'
    }}>
      {/* Text input (when in text mode) */}
      {textMode && (
        <div style={{
          display: 'flex',
          gap: '8px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribí tu mensaje..."
            style={{
              width: '280px',
              padding: '12px 16px',
              borderRadius: '24px',
              border: 'none',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '16px',
              outline: 'none'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              background: inputValue.trim() ? '#6366f1' : '#333',
              color: '#fff',
              cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Send size={20} />
          </button>
        </div>
      )}

      {/* Main controls */}
      <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center'
      }}>
        {/* Text/Voice toggle */}
        <button
          onClick={() => setTextMode(!textMode)}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.1)',
            color: textMode ? '#6366f1' : '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={textMode ? 'Modo voz' : 'Modo texto'}
        >
          {textMode ? <Mic size={20} /> : <Send size={20} />}
        </button>

        {/* Main action button */}
        {state === 'idle' ? (
          <button
            onClick={onStartCall}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: 'none',
              background: '#22c55e',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)'
            }}
            title="Iniciar llamada"
          >
            <Phone size={28} />
          </button>
        ) : (
          <button
            onClick={onEndCall}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: 'none',
              background: '#ef4444',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
              animation: state === 'listening' ? 'pulse 1s infinite' : 'none'
            }}
            title="Finalizar llamada"
          >
            <PhoneOff size={28} />
          </button>
        )}

        {/* Stop button (when speaking) */}
        {state === 'speaking' && (
          <button
            onClick={() => {/* TODO: interrupt */}}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeIn 0.3s ease'
            }}
            title="Interrumpir"
          >
            <Square size={20} />
          </button>
        )}
      </div>

      {/* State indicator */}
      <div style={{
        fontSize: '12px',
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        {state === 'idle' && 'Listo para charlar'}
        {state === 'listening' && 'Escuchando...'}
        {state === 'thinking' && 'Pensando...'}
        {state === 'speaking' && 'Hablando...'}
      </div>
    </div>
  )
}
