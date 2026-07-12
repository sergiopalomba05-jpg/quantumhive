import React, { useEffect, useRef, useState } from "react";

const SOL_VIDEO = "/sol_video.mp4";

export default function SolScene({
  audioRef,
  waitressState,
}: {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  waitressState: "idle" | "listening" | "thinking" | "speaking";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  // Play/pause video based on speaking state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (waitressState === "speaking") {
      v.play().catch(() => {});
    } else {
      v.pause();
      // Reset to first frame when idle
      v.currentTime = 0;
    }
  }, [waitressState]);

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
      ? "0 0 20px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.15)"
      : waitressState === "thinking"
      ? "0 0 20px rgba(201, 168, 106, 0.4), 0 0 40px rgba(201, 168, 106, 0.15)"
      : waitressState === "listening"
      ? "0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.15)"
      : "0 2px 15px rgba(0,0,0,0.4)";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        overflow: "hidden",
        position: "relative",
        background: "radial-gradient(circle at 50% 35%, #1a1410 0%, #0a0806 100%)",
      }}
    >
      {/* Outer glow ring */}
      <div
        style={{
          position: "absolute",
          inset: "-4px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor}, transparent 70%)`,
          transition: "background 0.5s ease",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {/* Video avatar */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          overflow: "hidden",
          position: "relative",
          boxShadow: borderGlow,
          transition: "box-shadow 0.4s ease",
          zIndex: 1,
        }}
      >
        <video
          ref={videoRef}
          src={SOL_VIDEO}
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
            filter:
              waitressState === "speaking"
                ? "brightness(1.1) contrast(1.05)"
                : waitressState === "thinking"
                ? "brightness(0.95) saturate(0.8)"
                : "brightness(1)",
            transition: "filter 0.4s ease",
            mixBlendMode: "normal",
          }}
        />

        {/* Dark vignette overlay to blend edges */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "radial-gradient(circle at 50% 40%, transparent 40%, rgba(10,8,6,0.7) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
