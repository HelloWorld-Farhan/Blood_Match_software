import React, { useRef, useEffect } from 'react';

export const AmbientBackgroundVideo: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure seamless autoplay & loop
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback for strict browser autoplay policies
        video.muted = true;
        video.play();
      });
    }

    // Smooth loop listener to eliminate any micro-stutter
    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* 4K UHD Ambient Video Layer */}
      <video
        ref={videoRef}
        src="/ambient_bg.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-cover object-center filter brightness-[0.4] contrast-125 saturate-150 transition-opacity duration-1000"
      />

      {/* Atmospheric Brand Color Gradient Overlays matching user palette:
          #0E0E10 (Obsidian), #6A040F (Burgundy), #D00000 (Crimson) */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 20%, rgba(106, 4, 15, 0.45) 0%, rgba(14, 14, 16, 0.85) 60%, #0E0E10 100%)',
          mixBlendMode: 'multiply'
        }}
      />
      
      {/* Arterial Crimson Light Bleed Accent */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 15% 50%, rgba(208, 0, 0, 0.25) 0%, transparent 50%), radial-gradient(circle at 85% 60%, rgba(106, 4, 15, 0.3) 0%, transparent 50%)'
        }}
      />
    </div>
  );
};

