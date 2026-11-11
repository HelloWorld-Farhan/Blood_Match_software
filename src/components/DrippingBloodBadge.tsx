import React from 'react';
import { motion } from 'framer-motion';

interface DrippingBloodBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showRipple?: boolean;
}

/**
 * High-performance, organic dripping liquid blood droplet animation.
 * Simulates fluid surface tension, droplet accumulation, elongation,
 * gravity drop, and impact ripple with continuous infinite looping.
 */
export const DrippingBloodBadge: React.FC<DrippingBloodBadgeProps> = ({
  className = '',
  size = 'md',
  showRipple = true,
}) => {
  // Dimensions calibrated for container
  const containerSizeClasses = {
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-12 h-12 rounded-2xl',
    lg: 'w-14 h-14 rounded-2xl',
  }[size];

  // Total animation cycle duration in seconds
  const DURATION = 2.4;

  return (
    <div
      className={`relative flex items-center justify-center bg-[#7A0C17]/10 border border-[#D72638]/25 text-[#D72638] shadow-inner overflow-hidden select-none ${containerSizeClasses} ${className}`}
      title="BloodMatch Live Reserve Network"
      aria-label="Liquid Blood Droplet Animation"
    >
      {/* Ambient background glow pulse synced with drop cycle */}
      <motion.div
        className="absolute inset-0 bg-radial from-[#D72638]/20 via-transparent to-transparent pointer-events-none"
        animate={{
          opacity: [0.2, 0.45, 0.2, 0.6, 0.2],
          scale: [0.9, 1.05, 0.95, 1.1, 0.9],
        }}
        transition={{
          duration: DURATION,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <svg
        viewBox="0 0 36 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full p-1.5 overflow-visible"
      >
        <defs>
          {/* Rich blood gradient for 3D fluid volume */}
          <linearGradient id="bloodLiquidGrad" x1="18" y1="2" x2="18" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF4D5E" />
            <stop offset="35%" stopColor="#D72638" />
            <stop offset="85%" stopColor="#960E1B" />
            <stop offset="100%" stopColor="#5E0911" />
          </linearGradient>

          {/* Droplet specular highlight */}
          <linearGradient id="bloodHighlight" x1="15" y1="12" x2="19" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="dropletGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#7A0C17" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* ==============================================================
            1. TOP MENISCUS (Liquid accumulation source at ceiling)
           ============================================================== */}
        <motion.path
          d="M 6 0 C 12 3 24 3 30 0 L 30 2 C 24 6 12 6 6 2 Z"
          fill="url(#bloodLiquidGrad)"
          animate={{
            d: [
              "M 6 0 C 12 2 24 2 30 0 L 30 2 C 24 5 12 5 6 2 Z",
              "M 6 0 C 12 5 24 5 30 0 L 30 2 C 24 9 12 9 6 2 Z", // Gathers weight
              "M 6 0 C 12 7 24 7 30 0 L 30 2 C 24 11 12 11 6 2 Z", // Stretching
              "M 6 0 C 12 2 24 2 30 0 L 30 2 C 24 4 12 4 6 2 Z", // Snaps back after release
              "M 6 0 C 12 2 24 2 30 0 L 30 2 C 24 5 12 5 6 2 Z",
            ],
          }}
          transition={{
            duration: DURATION,
            repeat: Infinity,
            times: [0, 0.35, 0.48, 0.55, 1],
            ease: "easeInOut",
          }}
        />

        {/* ==============================================================
            2. PRIMARY FALLING LIQUID BLOOD DROPLET
           ============================================================== */}
        <motion.g
          filter="url(#dropletGlow)"
          animate={{
            y: [-6, -2, 2, 25, 26, -6],
            scaleX: [0.4, 0.85, 0.7, 0.65, 1.45, 0.4],
            scaleY: [0.4, 0.95, 1.35, 1.4, 0.45, 0.4],
            opacity: [0, 1, 1, 1, 0, 0],
          }}
          transition={{
            duration: DURATION,
            repeat: Infinity,
            times: [0, 0.28, 0.46, 0.62, 0.68, 0.72],
            ease: [
              "easeOut",     // 0 -> 0.28: Growth at ceiling
              "easeInOut",   // 0.28 -> 0.46: Stretching
              [0.45, 0, 0.8, 0.3], // 0.46 -> 0.62: Gravity free fall acceleration
              "easeOut",     // 0.62 -> 0.68: Splat on impact
              "linear",
            ],
          }}
          style={{ originX: '18px', originY: '12px' }}
        >
          {/* Teardrop geometry */}
          <path
            d="M 18 6 C 18 6 11 15 11 20 C 11 24.2 14.1 27.5 18 27.5 C 21.9 27.5 25 24.2 25 20 C 25 15 18 6 18 6 Z"
            fill="url(#bloodLiquidGrad)"
          />
          {/* Specular curve highlight for glossy medical fluid finish */}
          <path
            d="M 15 15 C 13.5 18 13.5 21 14.8 23 C 14.2 22 14 20 14.8 17.5 C 15.3 16 16.2 14.8 16.8 14 C 16.2 14.2 15.4 14.6 15 15 Z"
            fill="url(#bloodHighlight)"
          />
        </motion.g>

        {/* ==============================================================
            3. SPLASH BEADS (Tiny droplets ejecting on impact)
           ============================================================== */}
        {showRipple && (
          <>
            {/* Left micro-splash bead */}
            <motion.circle
              cx="13"
              cy="34"
              r="1.2"
              fill="url(#bloodLiquidGrad)"
              animate={{
                cx: [18, 13, 11, 18],
                cy: [35, 29, 36, 35],
                opacity: [0, 0.9, 0, 0],
                scale: [0.5, 1, 0.4, 0.5],
              }}
              transition={{
                duration: DURATION,
                repeat: Infinity,
                times: [0.62, 0.67, 0.76, 1],
                ease: "easeOut",
              }}
            />

            {/* Right micro-splash bead */}
            <motion.circle
              cx="23"
              cy="34"
              r="1.1"
              fill="url(#bloodLiquidGrad)"
              animate={{
                cx: [18, 23, 25, 18],
                cy: [35, 30, 36, 35],
                opacity: [0, 0.85, 0, 0],
                scale: [0.5, 1, 0.3, 0.5],
              }}
              transition={{
                duration: DURATION,
                repeat: Infinity,
                times: [0.63, 0.68, 0.77, 1],
                ease: "easeOut",
              }}
            />
          </>
        )}

        {/* ==============================================================
            4. IMPACT RIPPLE EXPANSION (Liquid surface wave)
           ============================================================== */}
        {showRipple && (
          <>
            {/* Primary expanding wave */}
            <motion.ellipse
              cx="18"
              cy="37"
              rx="7"
              ry="2.2"
              fill="none"
              stroke="#D72638"
              strokeWidth="1.2"
              animate={{
                rx: [1, 2.5, 10, 14],
                ry: [0.4, 0.9, 2.8, 3.8],
                opacity: [0, 0.9, 0.35, 0],
              }}
              transition={{
                duration: DURATION,
                repeat: Infinity,
                times: [0.62, 0.65, 0.82, 0.96],
                ease: "easeOut",
              }}
            />

            {/* Secondary delayed echo wave */}
            <motion.ellipse
              cx="18"
              cy="37"
              rx="5"
              ry="1.6"
              fill="none"
              stroke="#FF4D5E"
              strokeWidth="0.8"
              animate={{
                rx: [0.8, 1.8, 7.5, 11],
                ry: [0.3, 0.6, 2.2, 3],
                opacity: [0, 0.75, 0.25, 0],
              }}
              transition={{
                duration: DURATION,
                repeat: Infinity,
                times: [0.66, 0.7, 0.86, 1],
                ease: "easeOut",
              }}
            />
          </>
        )}

        {/* ==============================================================
            5. BASE RESERVOIR (Liquid pool at bottom that absorbs drops)
           ============================================================== */}
        <motion.path
          d="M 4 39 C 10 37.5 26 37.5 32 39 L 32 44 L 4 44 Z"
          fill="url(#bloodLiquidGrad)"
          animate={{
            d: [
              "M 4 39 C 10 37.5 26 37.5 32 39 L 32 44 L 4 44 Z",
              "M 4 39 C 10 37.5 26 37.5 32 39 L 32 44 L 4 44 Z",
              "M 4 38.5 C 10 39.5 26 39.5 32 38.5 L 32 44 L 4 44 Z", // Rebounds on impact
              "M 4 39 C 10 37.5 26 37.5 32 39 L 32 44 L 4 44 Z",
            ],
          }}
          transition={{
            duration: DURATION,
            repeat: Infinity,
            times: [0, 0.62, 0.7, 1],
            ease: "easeInOut",
          }}
        />

        {/* Subtle meniscus gleam at liquid surface */}
        <line
          x1="6"
          y1="38"
          x2="30"
          y2="38"
          stroke="#FF808F"
          strokeWidth="0.75"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    </div>
  );
};

export default DrippingBloodBadge;
