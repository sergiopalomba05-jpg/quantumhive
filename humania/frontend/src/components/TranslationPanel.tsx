import { useEffect, useRef } from 'react'
import { SubtitleItem } from '../types'

interface TranslationPanelProps {
  subtitles: SubtitleItem[]
  translationEnabled: boolean
}

export default function TranslationPanel({ subtitles, translationEnabled }: TranslationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [subtitles])

  if (subtitles.length === 0) return null

  return (
    <div
      ref={scrollRef}
      className="w-full max-w-lg mx-auto overflow-y-auto px-4"
      style={{ maxHeight: '180px' }}
    >
      <div className="flex flex-col gap-2">
        {subtitles.slice(-4).map((sub) => (
          <div
            key={sub.id}
            className="flex flex-col gap-1"
            style={{
              alignItems: sub.sender === 'user' ? 'flex-end' : 'flex-start',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            <div
              className="px-4 py-2 rounded-2xl max-w-[85%] text-sm leading-relaxed"
              style={{
                background: sub.sender === 'ai'
                  ? 'rgba(212, 175, 55, 0.12)'
                  : 'rgba(99, 102, 241, 0.2)',
                borderBottomRightRadius: sub.sender === 'user' ? '4px' : '16px',
                borderBottomLeftRadius: sub.sender === 'ai' ? '4px' : '16px',
              }}
            >
              {sub.text}
            </div>
            {translationEnabled && sub.translation && (
              <div
                className="px-4 py-1 text-xs italic"
                style={{ color: 'rgba(212, 175, 55, 0.7)' }}
              >
                {sub.translation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
