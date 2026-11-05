import React, { useRef, useEffect } from 'react';

export const AmbientBackgroundVideo: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Optimized hardware-accelerated autoplay & loop
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    }

    // Auto pause video when tab is hidden to save 100% CPU/GPU and battery
    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      style={{
        transform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden',
        willChange: 'transform'
      }}
    >
      {/* Hardware-Decoded Ambient Red Fluid / Cell Video Layer (Zero CSS Filters for 60fps Native Playback) */}
      <video
        ref={videoRef}
        src="/ambient_bg.mp4"
        poster="/ambient_poster.jpg"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-cover object-center pointer-events-none"
        style={{
          transform: 'translateZ(0)',
          willChange: 'transform'
        }}
      />

      {/* Pure GPU-Composited Translucent Alabaster Veil (No expensive backdrop-blur for zero lag) */}
      <div 
        className="absolute inset-0 bg-[#F5F1EF]/75 pointer-events-none"
      />
      
      {/* Subtle Arterial Crimson Depth Gradient */}
      <div 
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 20% 30%, rgba(215, 38, 56, 0.12) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(122, 12, 23, 0.10) 0%, transparent 60%)'
        }}
      />
    </div>
  );
};
