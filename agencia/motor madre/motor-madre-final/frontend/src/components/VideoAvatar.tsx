import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const SOL_VIDEO = "/sol_video.mp4";

export function VideoAvatar({
  waitressState,
  onClick,
  currentSubtitle,
  videoSrc = "/sol_video.mp4",
  analyserNode
}: {
  waitressState: "idle" | "listening" | "thinking" | "speaking";
  onClick?: () => void;
  currentSubtitle?: string;
  videoSrc?: string;
  analyserNode?: AnalyserNode | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  // Play/pause video based on speaking state and audio volume
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    let animationFrameId: number;
    let dataArray: Uint8Array;

    if (waitressState === "speaking") {
      if (analyserNode) {
        dataArray = new Uint8Array(analyserNode.frequencyBinCount);
        let isVideoPlaying = false;
        // initial play just in case to start interaction
        v.play().catch(() => {});
        isVideoPlaying = true;

        const loop = () => {
          analyserNode.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const average = sum / dataArray.length;
          
          // Threshold to detect silence vs speaking
          if (average > 5) {
            if (!isVideoPlaying) {
              v.play().catch(() => {});
              isVideoPlaying = true;
            }
          } else {
            if (isVideoPlaying) {
              v.pause();
              isVideoPlaying = false;
            }
          }
          animationFrameId = requestAnimationFrame(loop);
        };
        loop();
      } else {
        // Fallback without analyser
        v.play().catch(() => {});
      }
    } else {
      v.pause();
      // Reset to first frame when idle
      v.currentTime = 0;
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [waitressState, analyserNode]);

  const glowColor =
    waitressState === "listening"
      ? "rgba(239, 68, 68, 0.5)"
      : waitressState === "thinking"
      ? "rgba(201, 168, 106, 0.5)"
      : waitressState === "speaking"
      ? "rgba(16, 185, 129, 0.4)"
      : "rgba(201, 168, 106, 0.15)";

  const borderGlow =
    waitressState === "speaking"
      ? "0 0 25px rgba(16, 185, 129, 0.6)"
      : waitressState === "thinking"
      ? "0 0 25px rgba(201, 168, 106, 0.6)"
      : waitressState === "listening"
      ? "0 0 25px rgba(239, 68, 68, 0.6)"
      : "0 10px 25px rgba(0, 0, 0, 0.6)";

  return (
    <div className="relative pointer-events-auto flex flex-col items-center justify-end z-50">
      
      {/* Subtitles Bubble */}
      <AnimatePresence>
        {currentSubtitle && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-full mb-4 px-4 py-2 bg-[#1a1410]/90 backdrop-blur-md border border-gold/30 rounded-2xl max-w-[280px] shadow-lg"
          >
            <p className="text-sm text-bone font-medium text-center">
              {currentSubtitle}
            </p>
            {/* Tail */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#1a1410]/90 border-r border-b border-gold/30 transform rotate-45 backdrop-blur-md" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="w-28 h-28 sm:w-32 sm:h-32 rounded-full relative z-10 flex items-center justify-center cursor-pointer overflow-hidden border border-gold/40 bg-[#181210]"
        style={{
          boxShadow: waitressState === "speaking" ? "0 0 20px rgba(16, 185, 129, 0.4)" : "0 8px 24px rgba(0, 0, 0, 0.5)",
          transition: "box-shadow 0.3s ease"
        }}
      >
        {/* Outer glow ring (subtle aura behind Sol) */}
        <div
          className="absolute inset-[-4px] rounded-full pointer-events-none z-0"
          style={{
            background: `radial-gradient(circle, ${glowColor}, transparent 70%)`,
            transition: "background 0.5s ease",
          }}
        />

        <div className="absolute inset-0 z-10 w-full h-full rounded-full overflow-hidden">
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            loop
            playsInline
            preload="auto"
            onLoadedData={() => setVideoReady(true)}
            className="w-[160%] h-[160%] object-cover absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 opacity-100"
            style={{
              objectPosition: "center top",
              filter:
                waitressState === "speaking"
                  ? "brightness(1.05) contrast(1.02)"
                  : waitressState === "thinking"
                  ? "brightness(0.95) saturate(0.8)"
                  : "brightness(1)",
              transition: "filter 0.4s ease",
              pointerEvents: "none",
            }}
          />
        </div>
      </motion.button>
    </div>
  );
}
