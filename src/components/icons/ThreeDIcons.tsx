import React from 'react';

interface Icon3DProps {
  className?: string;
  size?: number;
}

/**
 * Authentic 3D WhatsApp Icon with glossy bubble depth,
 * specular reflection, subtle bevel, and embossed handset.
 */
export const WhatsApp3DIcon: React.FC<Icon3DProps> = ({ className = '', size = 20 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 filter drop-shadow-[0_4px_6px_rgba(18,140,126,0.35)] transform transition-transform group-hover:scale-110 duration-200 ${className}`}
    >
      <defs>
        {/* 3D Body Gradient */}
        <radialGradient
          id="wa-3d-sphere"
          cx="32%"
          cy="28%"
          r="72%"
          fx="25%"
          fy="20%"
        >
          <stop offset="0%" stopColor="#4EFA8B" />
          <stop offset="28%" stopColor="#25D366" />
          <stop offset="70%" stopColor="#1EBE5D" />
          <stop offset="92%" stopColor="#128C7E" />
          <stop offset="100%" stopColor="#0B6358" />
        </radialGradient>

        {/* Specular Highlight on Top Dome */}
        <linearGradient id="wa-3d-specular" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Handset Drop Shadow */}
        <filter id="wa-inner-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#064038" floodOpacity="0.45" />
        </filter>

        {/* Outer Bevel Rim */}
        <linearGradient id="wa-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A7FCD1" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#25D366" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#064038" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Ambient Ground Shadow */}
      <ellipse cx="24" cy="44" rx="18" ry="3.5" fill="#000000" fillOpacity="0.25" filter="blur(2px)" />

      {/* 3D Bubble Base with Tail */}
      <path
        d="M24 3.5C12.7 3.5 3.5 12.7 3.5 24C3.5 27.8 4.6 31.4 6.6 34.5L4 44.5L14.3 41.9C17.2 43.6 20.5 44.5 24 44.5C35.3 44.5 44.5 35.3 44.5 24C44.5 12.7 35.3 3.5 24 3.5Z"
        fill="url(#wa-3d-sphere)"
      />

      {/* Bevel Rim Stroke */}
      <path
        d="M24 4.5C13.2 4.5 4.5 13.2 4.5 24C4.5 27.6 5.5 31 7.4 34L5.2 42.8L14.2 40.5C17.1 42.1 20.4 43.5 24 43.5C34.8 43.5 43.5 34.8 43.5 24C43.5 13.2 34.8 4.5 24 4.5Z"
        stroke="url(#wa-rim)"
        strokeWidth="1"
        fill="none"
      />

      {/* Glossy Upper Specular Crescent */}
      <path
        d="M24 5C14 5 5.8 12.8 5.1 22.5C7.2 16.5 14.5 11.5 24 11.5C33.5 11.5 40.8 16.5 42.9 22.5C42.2 12.8 34 5 24 5Z"
        fill="url(#wa-3d-specular)"
      />

      {/* Authentic WhatsApp Handset Silhouette with 3D Depth */}
      <path
        filter="url(#wa-inner-shadow)"
        d="M34.2 28.5C33.6 27.9 30.6 26.4 30.1 26.2C29.6 26 29.2 25.9 28.8 26.5C28.4 27.1 27.2 28.5 26.8 28.9C26.4 29.3 26 29.4 25.4 29.1C24.8 28.8 22.9 28.2 20.6 26.1C18.8 24.5 17.6 22.5 17.2 21.9C16.8 21.3 17.2 21 17.5 20.7C17.8 20.4 18.1 20 18.4 19.6C18.7 19.2 18.8 18.9 19 18.5C19.2 18.1 19.1 17.7 19 17.4C18.9 17.1 17.7 14.2 17.2 13C16.7 11.8 16.2 12 15.8 12C15.4 12 15 12 14.6 12C14.2 12 13.6 12.2 13.1 12.7C12.6 13.2 11.2 14.5 11.2 17.1C11.2 19.7 13.1 22.2 13.4 22.6C13.7 23 17.1 28.3 22.4 30.6C23.7 31.1 24.7 31.5 25.5 31.7C26.8 32.1 28 32.1 28.9 31.9C30 31.7 32.2 30.5 32.7 29.2C33.2 27.9 33.2 26.8 33 26.5C32.9 26.3 32.6 26.2 32 25.9L34.2 28.5Z"
        fill="#FFFFFF"
      />

      {/* Subtle Handset Specular Shine */}
      <path
        d="M14.6 12.5C14.2 12.5 13.8 12.6 13.4 13C13.1 13.3 12.5 14.2 12.2 15.8C12.8 14.2 14.5 13.3 15.8 13.2C15.9 13 15.3 12.5 14.6 12.5Z"
        fill="#FFFFFF"
        fillOpacity="0.8"
      />
    </svg>
  );
};

/**
 * 3D Shopping Cart / Bag with vibrant electric blue sphere and metallic shine
 */
export const Cart3DIcon: React.FC<Icon3DProps> = ({ className = '', size = 20 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 filter drop-shadow-[0_4px_6px_rgba(0,122,255,0.35)] transform transition-transform group-hover:scale-110 duration-200 ${className}`}
    >
      <defs>
        <radialGradient id="cart-3d-body" cx="30%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="40%" stopColor="#007AFF" />
          <stop offset="85%" stopColor="#0055D6" />
          <stop offset="100%" stopColor="#00358A" />
        </radialGradient>
        <linearGradient id="cart-specular" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Cart Container Base */}
      <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#cart-3d-body)" />
      {/* Glossy Top Curve */}
      <path d="M4 16C4 9.4 9.4 4 16 4H32C38.6 4 44 9.4 44 16C36 12 12 12 4 16Z" fill="url(#cart-specular)" />

      {/* Cart Basket Silhouette */}
      <path
        d="M13 13H16L18.5 27H33L36 17H19"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="33" r="2.5" fill="#FFFFFF" />
      <circle cx="31" cy="33" r="2.5" fill="#FFFFFF" />
      <path d="M22 21H31" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

/**
 * 3D Lightning Zap Icon with energetic golden-amber radiance and dimensional bevel
 */
export const Zap3DIcon: React.FC<Icon3DProps> = ({ className = '', size = 20 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 filter drop-shadow-[0_4px_8px_rgba(245,158,11,0.45)] transform transition-transform group-hover:scale-110 duration-200 ${className}`}
    >
      <defs>
        <radialGradient id="zap-3d-base" cx="30%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="35%" stopColor="#F59E0B" />
          <stop offset="75%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#B45309" />
        </radialGradient>
        <linearGradient id="zap-specular" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Outer Rounded Container */}
      <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#zap-3d-base)" />
      {/* Specular Top Shine */}
      <path d="M4 16C4 9.4 9.4 4 16 4H32C38.6 4 44 9.4 44 16C36 12 12 12 4 16Z" fill="url(#zap-specular)" />

      {/* 3D Lightning Shape */}
      <path
        d="M26 10L14 26H24L22 38L34 22H24L26 10Z"
        fill="#FFFFFF"
        filter="drop-shadow(0 2px 2px rgba(180,83,9,0.5))"
      />
    </svg>
  );
};

/**
 * 3D Orbit Icon with dimensional gyroscope rings and glowing focal sphere
 */
export const Orbit3DIcon: React.FC<Icon3DProps> = ({ className = '', size = 20 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 filter drop-shadow-[0_4px_6px_rgba(56,189,248,0.4)] transform transition-transform group-hover:scale-110 duration-200 ${className}`}
    >
      <defs>
        <radialGradient id="orbit-core" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="40%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </radialGradient>
      </defs>

      {/* Background Dim Pill */}
      <rect x="4" y="4" width="40" height="40" rx="12" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.5" />
      {/* Core Sphere */}
      <circle cx="24" cy="24" r="5" fill="url(#orbit-core)" filter="drop-shadow(0 0 4px #38BDF8)" />
      {/* Orbit Rings */}
      <ellipse cx="24" cy="24" rx="14" ry="6" stroke="#38BDF8" strokeWidth="1.8" transform="rotate(-30 24 24)" />
      <ellipse cx="24" cy="24" rx="14" ry="6" stroke="#60A5FA" strokeWidth="1.8" strokeDasharray="3 3" transform="rotate(30 24 24)" />
    </svg>
  );
};

/**
 * 3D Shield Warranty Icon with chrome-bevel edge and emerald gleam
 */
export const Shield3DIcon: React.FC<Icon3DProps> = ({ className = '', size = 20 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 filter drop-shadow-[0_4px_6px_rgba(16,185,129,0.35)] ${className}`}
    >
      <defs>
        <radialGradient id="shield-grad" cx="35%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="45%" stopColor="#10B981" />
          <stop offset="90%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064E3B" />
        </radialGradient>
      </defs>
      <path
        d="M24 4L8 10V22C8 32.5 14.8 41.8 24 44C33.2 41.8 40 32.5 40 22V10L24 4Z"
        fill="url(#shield-grad)"
        stroke="#A7F3D0"
        strokeWidth="1.5"
      />
      <path d="M17 23L22 28L31 18" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
