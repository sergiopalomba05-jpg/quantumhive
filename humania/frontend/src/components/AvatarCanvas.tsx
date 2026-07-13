import { useRef, useEffect, useState } from 'react'

interface AvatarCanvasProps {
  frame: string | null
  isSpeaking: boolean
}

export default function AvatarCanvas({ frame, isSpeaking }: AvatarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [idleImage, setIdleImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setIdleImage(img)
    img.src = '/avatar/dominus_medio_cuerpo_neutro_v01.png'
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, 512, 512)

    if (frame) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 512, 512)
      }
      img.src = `data:image/jpeg;base64,${frame}`
    } else if (idleImage) {
      ctx.drawImage(idleImage, 0, 0, 512, 512)
    }
  }, [frame, idleImage])

  return (
    <div className="relative">
      {/* Outer glow ring */}
      <div
        className="absolute -inset-3 rounded-full opacity-30"
        style={{
          background: `radial-gradient(circle, ${isSpeaking ? 'rgba(212,175,55,0.4)' : 'rgba(212,175,55,0.1)'} 0%, transparent 70%)`,
          transition: 'all 0.5s ease',
        }}
      />

      {/* Avatar container */}
      <div
        className="relative w-80 h-80 rounded-full overflow-hidden"
        style={{
          border: `3px solid ${isSpeaking ? 'rgba(212,175,55,0.8)' : 'rgba(212,175,55,0.2)'}`,
          boxShadow: isSpeaking
            ? '0 0 60px rgba(212,175,55,0.3), inset 0 0 30px rgba(0,0,0,0.5)'
            : '0 0 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease',
          animation: isSpeaking ? 'active-pulse-gold 2s ease-in-out infinite' : 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          width={512}
          height={512}
          className="w-full h-full object-cover"
        />

        {/* Scanline overlay */}
        {isSpeaking && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(transparent 50%, rgba(212,175,55,0.02) 50%)',
              backgroundSize: '100% 4px',
            }}
          />
        )}
      </div>

      {/* Activity indicator dots */}
      {isSpeaking && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-quantum-gold"
              style={{
                animation: `orb-pulse-gold 1s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
