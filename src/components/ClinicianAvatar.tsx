import React, { useState, useEffect } from 'react';
import { getInitials } from '../utils/countryCodes';

interface ClinicianAvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  alt?: string;
}

/**
 * ClinicianAvatar: Bulletproof profile picture component.
 * - Displays user photo with zero latency when available.
 * - If the image fails to load, is broken, or is absent, seamlessly
 *   falls back to the user's initials (e.g. "FK" for Farhan Khalid).
 * - Completely prevents the browser from showing a broken image logo or icon.
 */
export function ClinicianAvatar({
  src,
  name,
  className = '',
  imgClassName = 'w-full h-full object-cover',
  fallbackClassName = 'font-black select-none leading-none',
  alt = 'Clinician Avatar',
}: ClinicianAvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Automatically reset error state whenever src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const initials = getInitials(name);
  const cleanSrc = (src || '').trim();

  if (!cleanSrc || hasError) {
    return (
      <span className={fallbackClassName}>
        {initials}
      </span>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      className={imgClassName}
      onError={() => setHasError(true)}
      loading="eager"
    />
  );
}

export default ClinicianAvatar;
