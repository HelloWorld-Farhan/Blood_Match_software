import React, { useRef, useEffect } from 'react';

interface AmbientBackgroundVideoProps {
  videoSrc?: string;
  posterSrc?: string;
  overlayClassName?: string;
  opacity?: number;
}

export const AmbientBackgroundVideo: React.FC<AmbientBackgroundVideoProps> = ({
  videoSrc = "/3995-176277710.mp4?v=3",
  posterSrc = "/3995-176277710_poster.jpg",
  overlayClassName = "bg-[#F5F1EF]/60",
  opacity = 1
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Optimized hardware-accelerated autoplay & loop
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;

    video.addEventListener('canplay', () => video.play().catch(() => {}));

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
  }, [videoSrc]);

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      style={{
        transform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden',
        willChange: 'transform',
        opacity
      }}
    >
      <video
        ref={videoRef}
        key={videoSrc}
        src={videoSrc}
        poster={posterSrc}
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

      {/* Customizable Clinical Palette Overlay */}
      <div 
        className={`absolute inset-0 pointer-events-none ${overlayClassName}`}
      />
      
      {/* Subtle Arterial Crimson Depth Gradient */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 15% 25%, rgba(215, 38, 56, 0.10) 0%, transparent 60%), radial-gradient(circle at 85% 75%, rgba(122, 12, 23, 0.08) 0%, transparent 60%)'
        }}
      />
    </div>
  );
};
