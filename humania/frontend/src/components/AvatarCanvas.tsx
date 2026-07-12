import { useRef, useEffect } from 'react'

interface AvatarCanvasProps {
  frame: string | null  // base64 JPEG
  isSpeaking: boolean
}

export default function AvatarCanvas({ frame, isSpeaking }: AvatarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!frame || !canvasRef.current) return

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 512, 512)
    }
    img.src = `data:image/jpeg;base64,${frame}`
  }, [frame])

  return (
    <div style={{
      position: 'relative',
      width: '320px',
      height: '320px',
      borderRadius: '50%',
      overflow: 'hidden',
      border: isSpeaking
        ? '4px solid rgba(99, 102, 241, 0.8)'
        : '4px solid rgba(255,255,255,0.2)',
      boxShadow: isSpeaking
        ? '0 0 40px rgba(99, 102, 241, 0.4)'
        : '0 0 20px rgba(0,0,0,0.3)',
      transition: 'all 0.3s ease',
      animation: isSpeaking ? 'pulse 2s infinite' : 'none'
    }}>
      <canvas
        ref={canvasRef}
        width={512}
        height={512}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />

      {/* Idle state - show placeholder */}
      {!frame && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          fontSize: '80px'
        }}>
          👋
        </div>
      )}
    </div>
  )
}
