import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff, Languages, Trash2, MessageSquare } from 'lucide-react'
import { CompanionState } from '../App'

interface ControlsBarProps {
  state: CompanionState
  isMuted: boolean
  isVideoOff: boolean
  translationEnabled: boolean
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleTranslation: () => void
  onClearSubtitles: () => void
  onStartCall: () => void
  onEndCall: () => void
}

export default function ControlsBar({
  state,
  isMuted,
  isVideoOff,
  translationEnabled,
  onToggleMute,
  onToggleVideo,
  onToggleTranslation,
  onClearSubtitles,
  onStartCall,
  onEndCall,
}: ControlsBarProps) {
  const isActive = state !== 'idle'

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-full glass-panel"
      style={{
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {!isActive ? (
        <>
          <button
            onClick={onStartCall}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #d4af37 0%, #a67c00 100%)',
              color: '#000',
            }}
          >
            <Phone size={18} />
            Iniciar Sesion
          </button>
        </>
      ) : (
        <>
          <ControlButton
            icon={isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            active={!isMuted}
            danger={isMuted}
            onClick={onToggleMute}
            title={isMuted ? 'Activar mic' : 'Silenciar'}
          />
          <ControlButton
            icon={isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
            active={!isVideoOff}
            onClick={onToggleVideo}
            title={isVideoOff ? 'Activar cam' : 'Apagar cam'}
          />
          <ControlButton
            icon={<Languages size={18} />}
            active={translationEnabled}
            onClick={onToggleTranslation}
            title="Traduccion"
          />
          <ControlButton
            icon={<Trash2 size={16} />}
            onClick={onClearSubtitles}
            title="Limpiar"
          />

          <div className="w-px h-6 bg-white/10 mx-1" />

          <button
            onClick={onEndCall}
            className="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300"
            style={{
              background: '#ef4444',
              boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
            }}
            title="Colgar"
          >
            <PhoneOff size={20} className="text-white" />
          </button>
        </>
      )}
    </div>
  )
}

function ControlButton({
  icon,
  active = false,
  danger = false,
  onClick,
  title,
}: {
  icon: React.ReactNode
  active?: boolean
  danger?: boolean
  onClick: () => void
  title: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200"
      style={{
        background: danger
          ? 'rgba(239, 68, 68, 0.2)'
          : active
            ? 'rgba(212, 175, 55, 0.15)'
            : 'rgba(255,255,255,0.06)',
        color: danger
          ? '#ef4444'
          : active
            ? '#d4af37'
            : 'rgba(255,255,255,0.6)',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.3)' : active ? 'rgba(212,175,55,0.3)' : 'transparent'}`,
      }}
      title={title}
    >
      {icon}
    </button>
  )
}
