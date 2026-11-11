import React from 'react';
import { motion } from 'framer-motion';

interface DrippingBloodBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Pure, clean top-to-bottom falling blood drop animation with vertical motion blur.
 * Features zero distracting bowls/bars: strictly a liquid blood drop falling from top
 * to down, fading, and seamlessly dropping again in an infinite loop.
 */
export const DrippingBloodBadge: React.FC<DrippingBloodBadgeProps> = ({
  className = '',
  size = 'md',
}) => {
  const containerSizeClasses = {
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-12 h-12 rounded-2xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-20 h-20 rounded-3xl',
  }[size];

  // Unique ID prefix to avoid SVG filter collisions across multiple badges
  const filterId = React.useId().replace(/:/g, '');

  return (
    <div
      className={`relative flex items-center justify-center bg-[#7A0C17]/10 border border-[#D72638]/25 text-[#D72638] shadow-inner overflow-hidden select-none ${containerSizeClasses} ${className}`}
      title="BloodMatch Reserve Stream"
      aria-label="Falling Blood Droplet"
    >
      {/* Subtle ambient red background breathing glow */}
      <motion.div
        className="absolute inset-0 bg-radial from-[#D72638]/15 via-transparent to-transparent pointer-events-none"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full p-2 overflow-hidden pointer-events-none"
      >
        <defs>
          {/* Dynamic vertical motion blur filter */}
          <filter id={`motionBlur-${filterId}`} x="-30%" y="-50%" width="160%" height="200%">
            <feGaussianBlur stdDeviation="0 1.2" />
          </filter>

          {/* Glowing blood drop gradient */}
          <linearGradient id={`bloodGrad-${filterId}`} x1="16" y1="2" x2="16" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF4D5E" />
            <stop offset="40%" stopColor="#D72638" />
            <stop offset="100%" stopColor="#8A0B17" />
          </linearGradient>

          {/* Specular sheen */}
          <linearGradient id={`sheenGrad-${filterId}`} x1="14" y1="8" x2="17" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ==============================================================
            CLEAN FALLING BLOOD DROP (TOP TO DOWN WITH BLUR)
           ============================================================== */}
        <motion.g
          filter={`url(#motionBlur-${filterId})`}
          animate={{
            y: [-18, -4, 14, 26],
            scaleY: [1.1, 1.35, 1.25, 0.9],
            scaleX: [0.9, 0.75, 0.85, 1.1],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 1.35,
            repeat: Infinity,
            times: [0, 0.25, 0.75, 1],
            ease: [0.4, 0, 0.6, 1],
          }}
          style={{ originX: '16px', originY: '16px' }}
        >
          {/* Authentic smooth liquid teardrop */}
          <path
            d="M 16 6 C 16 6 10 14.5 10 19 C 10 22.3 12.7 25 16 25 C 19.3 25 22 22.3 22 19 C 22 14.5 16 6 16 6 Z"
            fill={`url(#bloodGrad-${filterId})`}
          />
          {/* Soft inner fluid highlight */}
          <path
            d="M 13.8 15 C 12.8 17 13 19.5 14.2 21 C 13.5 20.2 13.3 18.5 14 16.5 C 14.4 15.3 15.2 14.2 15.6 13.5 C 14.8 13.8 14.1 14.3 13.8 15 Z"
            fill={`url(#sheenGrad-${filterId})`}
          />
        </motion.g>

        {/* Secondary softer ghost drop trailing slightly behind for liquid blur depth */}
        <motion.g
          animate={{
            y: [-22, -8, 10, 22],
            scaleY: [1.3, 1.4, 1.3, 0.9],
            scaleX: [0.7, 0.65, 0.75, 0.9],
            opacity: [0, 0.35, 0.35, 0],
          }}
          transition={{
            duration: 1.35,
            repeat: Infinity,
            delay: 0.06,
            times: [0, 0.25, 0.75, 1],
            ease: [0.4, 0, 0.6, 1],
          }}
          style={{ originX: '16px', originY: '16px' }}
        >
          <path
            d="M 16 6 C 16 6 10 14.5 10 19 C 10 22.3 12.7 25 16 25 C 19.3 25 22 22.3 22 19 C 22 14.5 16 6 16 6 Z"
            fill="#FF4D5E"
          />
        </motion.g>
      </svg>
    </div>
  );
};

export default DrippingBloodBadge;
