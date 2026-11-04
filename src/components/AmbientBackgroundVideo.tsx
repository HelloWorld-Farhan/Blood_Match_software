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
      {/* Ambient Red Fluid / Cell Video Layer */}
      <video
        ref={videoRef}
        src="/ambient_bg.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-cover object-center filter brightness-100 contrast-110 saturate-125 transition-opacity duration-1000"
      />

      {/* Soft Light Alabaster & Crimson Translucent Veil:
          Allows video to be clearly visible while harmonizing with White & Red palette
          #FFFFFF, #F5F1EF, #D72638, #7A0C17, #D9C7C2 */}
      <div 
        className="absolute inset-0 bg-[#F5F1EF]/70 backdrop-blur-[1px]"
      />
      
      {/* Subtle Arterial Crimson Accent Glow */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 20% 30%, rgba(215, 38, 56, 0.15) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(122, 12, 23, 0.12) 0%, transparent 60%)'
        }}
      />
    </div>
  );
};

