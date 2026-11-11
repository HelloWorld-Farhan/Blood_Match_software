import React, { useRef, useEffect, useState } from 'react';

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
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;

    const isPreloaderDone = 
      typeof window !== 'undefined' && 
      (sessionStorage.getItem('bloodmatch_preloader_done') === 'true' || 
       !document.getElementById('preloader'));

    const startPlayback = () => {
      const v = videoRef.current;
      if (!v) return;
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.loop = true;

      const playPromise = v.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsVideoPlaying(true))
          .catch(() => {
            v.muted = true;
            v.play()
              .then(() => setIsVideoPlaying(true))
              .catch(() => {});
          });
      }
    };

    const handlePlaying = () => setIsVideoPlaying(true);
    const handleTimeUpdate = () => {
      if (video.currentTime > 0.05) setIsVideoPlaying(true);
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('timeupdate', handleTimeUpdate);

    // Auto pause video when tab is hidden to save 100% CPU/GPU and battery
    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
      } else {
        startPlayback();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start buffering and playback immediately on mount so video is decoded & ready
    startPlayback();

    const onReady = () => startPlayback();
    window.addEventListener('bloodmatch_preloader_opening', onReady);
    window.addEventListener('bloodmatch_preloader_complete', onReady);

    return () => {
      window.removeEventListener('bloodmatch_preloader_opening', onReady);
      window.removeEventListener('bloodmatch_preloader_complete', onReady);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoSrc]);

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#F5F1EF]"
      style={{
        transform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden',
        willChange: 'transform',
        opacity
      }}
    >
      {/* Background Poster Image (Never flashes white; seamless backdrop) */}
      {posterSrc && (
        <img
          src={posterSrc}
          alt="Ambient Background"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
      )}

      {/* Synchronized Ambient Video (Muted autoplay hardware-accelerated) */}
      <video
        ref={videoRef}
        key={videoSrc}
        src={videoSrc}
        poster={posterSrc}
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
