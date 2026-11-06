import React, { useEffect, useRef, useState } from 'react';

interface ReactBitsBackgroundProps {
  variant?: 'dots' | 'squares' | 'aurora' | 'combined';
  className?: string;
  children?: React.ReactNode;
}

export const ReactBitsBackground: React.FC<ReactBitsBackgroundProps> = ({
  variant = 'combined',
  className = '',
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Only track if cursor is reasonably near or inside container
      if (
        x >= -100 &&
        x <= rect.width + 100 &&
        y >= -100 &&
        y <= rect.height + 100
      ) {
        setMousePos({ x, y });
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden ${className}`}
    >
      {/* 1. React Bits Interactive Spotlight */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500 ease-out"
        style={{
          opacity: isHovered ? 1 : 0.35,
          background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 122, 255, 0.08), transparent 70%)`,
        }}
        aria-hidden="true"
      />

      {/* 2. React Bits Ambient Aurora Orbs */}
      {(variant === 'aurora' || variant === 'combined') && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          {/* Top-Right Cyan/Blue Orb */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-[#007AFF]/12 via-[#38BDF8]/8 to-transparent blur-[120px] animate-pulse duration-1000" />
          {/* Bottom-Left Violet/Indigo Orb */}
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr from-[#6366F1]/10 via-[#007AFF]/6 to-transparent blur-[140px]" />
          {/* Center Floating Accent */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-[#007AFF]/4 dark:bg-[#38BDF8]/6 blur-[160px] pointer-events-none" />
        </div>
      )}

      {/* 3. React Bits Subtle Grid / Squares Matrix */}
      {(variant === 'squares' || variant === 'combined') && (
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.035] dark:opacity-[0.06]"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, #000 60%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, #000 60%, transparent 100%)',
          }}
          aria-hidden="true"
        />
      )}

      {/* Foreground Content */}
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
};
