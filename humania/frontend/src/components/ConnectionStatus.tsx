import { CompanionState } from '../App'

interface ConnectionStatusProps {
  isConnected: boolean
  isConnecting: boolean
  state: CompanionState
}

export default function ConnectionStatus({
  isConnected,
  isConnecting,
  state,
}: ConnectionStatusProps) {
  const getStatusColor = () => {
    if (isConnecting) return '#f59e0b'
    if (isConnected) return '#22c55e'
    return '#ef4444'
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2 h-2 rounded-full"
        style={{
          background: getStatusColor(),
          boxShadow: `0 0 8px ${getStatusColor()}`,
        }}
      />
      <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">
        {isConnecting ? 'Conectando...' : isConnected ? 'Conectado' : 'Offline'}
      </span>
    </div>
  )
}
