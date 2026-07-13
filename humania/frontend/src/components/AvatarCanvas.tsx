import { useRef, useEffect, useState } from 'react'

interface AvatarCanvasProps {
  frame: string | null
  isSpeaking: boolean
}

export default function AvatarCanvas({ frame, isSpeaking }: AvatarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [idleImage, setIdleImage] = useState<HTMLImageElement | null>(null)
  const [breathPhase, setBreathPhase] = useState(0)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setIdleImage(img)
    img.src = '/avatar/dominus_medio_cuerpo_neutro_v01.png'
  }, [])

  // Breathing animation for idle state
  useEffect(() => {
    if (isSpeaking) return
    let frame: number
    let start = Date.now()
    const animate = () => {
      const elapsed = (Date.now() - start) / 1000
      setBreathPhase(Math.sin(elapsed * 1.2) * 0.5 + 0.5)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [isSpeaking])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, 512, 512)

    if (frame) {
      // Show lip-synced frame from LatentSync
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 512, 512)
      }
      img.src = `data:image/jpeg;base64,${frame}`
    } else if (idleImage) {
      // Idle: show Dominus with subtle breathing scale
      const scale = 1 + breathPhase * 0.015
      const offsetX = (512 - 512 * scale) / 2
      const offsetY = (512 - 512 * scale) / 2
      ctx.save()
      ctx.translate(256, 256)
      ctx.scale(scale, scale)
      ctx.translate(-256, -256)
      ctx.drawImage(idleImage, 0, 0, 512, 512)
      ctx.restore()
    }
  }, [frame, idleImage, breathPhase])

  return (
    <div className="relative">
      {/* Outer glow */}
      <div
        className="absolute -inset-4 rounded-full transition-all duration-700"
        style={{
          background: isSpeaking
            ? 'radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Avatar circle */}
      <div
        className="relative w-80 h-80 rounded-full overflow-hidden"
        style={{
          border: `2px solid ${isSpeaking ? 'rgba(212,175,55,0.7)' : 'rgba(212,175,55,0.15)'}`,
          boxShadow: isSpeaking
            ? '0 0 80px rgba(212,175,55,0.25), inset 0 0 40px rgba(0,0,0,0.4)'
            : '0 0 40px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.2)',
          transition: 'all 0.4s ease',
        }}
      >
        <canvas
          ref={canvasRef}
          width={512}
          height={512}
          className="w-full h-full object-cover"
        />

        {/* Scanline effect when speaking */}
        {isSpeaking && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute w-full h-px opacity-30"
              style={{
                background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
                animation: 'scanner-line 3s linear infinite',
              }}
            />
          </div>
        )}
      </div>

      {/* Audio wave dots when speaking */}
      {isSpeaking && (
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1.5 rounded-full bg-quantum-gold"
              style={{
                height: `${8 + Math.sin(Date.now() / 200 + i) * 8}px`,
                animation: `orb-pulse-gold 0.8s ease-in-out ${i * 0.15}s infinite`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
