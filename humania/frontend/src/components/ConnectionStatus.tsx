import { CompanionState } from '../App'

interface ConnectionStatusProps {
  isConnected: boolean
  isConnecting: boolean
  state: CompanionState
}

export default function ConnectionStatus({
  isConnected,
  isConnecting,
  state
}: ConnectionStatusProps) {
  const getStatusColor = () => {
    if (isConnecting) return '#f59e0b'
    if (isConnected) return '#22c55e'
    return '#ef4444'
  }

  const getStatusText = () => {
    if (isConnecting) return 'Conectando...'
    if (isConnected) return 'Conectado'
    return 'Desconectado'
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '24px'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: getStatusColor(),
        boxShadow: `0 0 8px ${getStatusColor()}`
      }} />
      <span style={{
        fontSize: '12px',
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        {getStatusText()}
      </span>
    </div>
  )
}
