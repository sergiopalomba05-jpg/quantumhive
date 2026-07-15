import { useState, useCallback, useRef } from 'react'
import { Send } from 'lucide-react'
import { CompanionState } from '../App'

interface ChatInputProps {
  state: CompanionState
  onSendMessage: (text: string) => void
  isListening: boolean
}

export default function ChatInput({
  state,
  onSendMessage,
  isListening,
}: ChatInputProps) {
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
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2"
      style={{ animation: 'fadeIn 0.3s ease' }}
    >
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribi tu mensaje..."
        className="w-72 px-4 py-3 rounded-full text-sm outline-none transition-all"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(212,175,55,0.15)',
          color: '#fff',
        }}
      />
      <button
        onClick={handleSend}
        disabled={!inputValue.trim()}
        className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
        style={{
          background: inputValue.trim()
            ? 'linear-gradient(135deg, #d4af37, #a67c00)'
            : 'rgba(255,255,255,0.06)',
          cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
        }}
      >
        <Send size={16} className={inputValue.trim() ? 'text-black' : 'text-white/30'} />
      </button>
    </div>
  )
}
