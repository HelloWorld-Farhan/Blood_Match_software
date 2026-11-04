import React from 'react';

export default function BackgroundVideo() {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
      {/* Background Video Stream */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover scale-105 filter brightness-40 contrast-125 saturate-120"
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>

      {/* Atmospheric Glass Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/70 to-slate-950/95 backdrop-blur-[2px]" />

      {/* Subtle Blood Red Glow Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blood-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blood-900/20 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
