import { useState } from 'react'
import { X, User, Globe, Sliders, Terminal } from 'lucide-react'
import { Avatar, SpeechStyle, DOMINUS_AVATARS, SPEECH_STYLES, SUPPORTED_LANGUAGES } from '../types'

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  selectedAvatar: Avatar
  onSelectAvatar: (avatar: Avatar) => void
  selectedStyle: SpeechStyle
  onSelectStyle: (style: SpeechStyle) => void
  targetLanguage: string
  onSelectLanguage: (code: string) => void
  translationEnabled: boolean
  onToggleTranslation: () => void
}

export default function SettingsDrawer({
  isOpen,
  onClose,
  selectedAvatar,
  onSelectAvatar,
  selectedStyle,
  onSelectStyle,
  targetLanguage,
  onSelectLanguage,
  translationEnabled,
  onToggleTranslation,
}: SettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'companion' | 'language' | 'advanced'>('companion')

  if (!isOpen) return null

  const tabs = [
    { id: 'companion' as const, label: 'Acompanante', icon: <User size={16} /> },
    { id: 'language' as const, label: 'Idioma', icon: <Globe size={16} /> },
    { id: 'advanced' as const, label: 'Avanzado', icon: <Sliders size={16} /> },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-80 glass-panel overflow-y-auto"
        style={{
          borderLeft: '1px solid rgba(212,175,55,0.15)',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-sm font-medium text-quantum-gold font-display tracking-wider">
            CONFIGURACION
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={18} className="text-white/50" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors"
              style={{
                color: activeTab === tab.id ? '#d4af37' : 'rgba(255,255,255,0.4)',
                borderBottom: activeTab === tab.id ? '2px solid #d4af37' : '2px solid transparent',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'companion' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                  Avatar
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DOMINUS_AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => onSelectAvatar(avatar)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                      style={{
                        background: selectedAvatar.id === avatar.id
                          ? 'rgba(212,175,55,0.1)'
                          : 'rgba(255,255,255,0.03)',
                        border: selectedAvatar.id === avatar.id
                          ? '1px solid rgba(212,175,55,0.4)'
                          : '1px solid transparent',
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                        style={{
                          background: `linear-gradient(135deg, ${avatar.color}33, ${avatar.color}11)`,
                          color: avatar.color,
                        }}
                      >
                        {avatar.iconLabel}
                      </div>
                      <span className="text-xs text-white/60">{avatar.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Personality card */}
              <div
                className="p-3 rounded-xl"
                style={{
                  background: 'rgba(212,175,55,0.05)',
                  border: '1px solid rgba(212,175,55,0.1)',
                }}
              >
                <p className="text-xs text-quantum-gold font-medium mb-1">{selectedAvatar.name}</p>
                <p className="text-xs text-white/50 leading-relaxed">{selectedAvatar.personality}</p>
              </div>

              {/* Speech style */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                  Estilo de voz
                </label>
                <div className="flex flex-col gap-1.5">
                  {SPEECH_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => onSelectStyle(style)}
                      className="flex items-center gap-3 p-2.5 rounded-lg text-left transition-all"
                      style={{
                        background: selectedStyle.id === style.id
                          ? 'rgba(212,175,55,0.08)'
                          : 'transparent',
                      }}
                    >
                      <div
                        className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                        style={{
                          borderColor: selectedStyle.id === style.id ? '#d4af37' : 'rgba(255,255,255,0.2)',
                          background: selectedStyle.id === style.id ? '#d4af37' : 'transparent',
                        }}
                      />
                      <div>
                        <p className="text-xs text-white/70">{style.name}</p>
                        <p className="text-[10px] text-white/30">{style.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'language' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                  Idioma del asistente
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => onSelectLanguage(lang.code)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
                      style={{
                        background: targetLanguage === lang.code
                          ? 'rgba(212,175,55,0.1)'
                          : 'rgba(255,255,255,0.03)',
                        border: targetLanguage === lang.code
                          ? '1px solid rgba(212,175,55,0.4)'
                          : '1px solid transparent',
                      }}
                    >
                      <span className="text-xl">{lang.flag === 'AR' ? '🇦🇷' : lang.flag === 'US' ? '🇺🇸' : '🇧🇷'}</span>
                      <span className="text-[10px] text-white/60">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/3">
                <div>
                  <p className="text-xs text-white/70">Traduccion en tiempo real</p>
                  <p className="text-[10px] text-white/30">Traduce tu voz al idioma del asistente</p>
                </div>
                <button
                  onClick={onToggleTranslation}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{
                    background: translationEnabled ? '#d4af37' : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{
                      transform: translationEnabled ? 'translateX(22px)' : 'translateX(2px)',
                    }}
                  />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="flex flex-col gap-4">
              <div
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                }}
              >
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-green-400">Canal cifrado SRTP-AES256</span>
              </div>

              <div className="p-3 rounded-xl bg-white/3">
                <p className="text-xs text-white/40 mb-2">Backend</p>
                <p className="text-xs text-white/60 font-mono">ws://localhost:8080/ws/companion</p>
              </div>

              <div className="p-3 rounded-xl bg-white/3">
                <p className="text-xs text-white/40 mb-2">Motor de IA</p>
                <p className="text-xs text-white/60">Gemini Live API + LatentSync 1.6</p>
              </div>

              <div className="p-3 rounded-xl bg-white/3">
                <p className="text-xs text-white/40 mb-2">Lip-Sync</p>
                <p className="text-xs text-white/60">Whisper Tiny + UNet 1.3B (GPU L4)</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
