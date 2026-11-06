import React, { useRef, useState } from 'react';
import { calculate3DTilt, calculateSpotlightPosition } from '../../utils/animationHelpers';

interface ReactBitsPictureProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // max tilt degrees (default: 8)
  scaleOnHover?: number; // scale factor (default: 1.025)
  showSpotlight?: boolean;
  showSheen?: boolean;
}

export const ReactBitsPicture: React.FC<ReactBitsPictureProps> = ({
  children,
  className = '',
  maxTilt = 8,
  scaleOnHover = 1.025,
  showSpotlight = true,
  showSheen = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ rotateX: number; rotateY: number }>({ rotateX: 0, rotateY: 0 });
  const [spotlight, setSpotlight] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const tiltResult = calculate3DTilt(mouseX, mouseY, rect.width, rect.height, maxTilt);
    const spotResult = calculateSpotlightPosition(mouseX, mouseY, rect.width, rect.height);

    setTilt({ rotateX: tiltResult.rotateX, rotateY: tiltResult.rotateY });
    setSpotlight({ x: spotResult.x, y: spotResult.y, opacity: 1 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0 });
    setSpotlight((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative will-change-transform transition-transform duration-200 ease-out [transform-style:preserve-3d] ${className}`}
      style={{
        transform: isHovered
          ? `perspective(850px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(${scaleOnHover}, ${scaleOnHover}, 1)`
          : 'perspective(850px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      }}
    >
      {/* Underlying Picture Content */}
      <div className="relative w-full h-full [transform:translateZ(10px)]">{children}</div>

      {/* Interactive Radial Spotlight Overlay */}
      {showSpotlight && (
        <div
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: spotlight.opacity,
            background: `radial-gradient(180px circle at ${spotlight.x}px ${spotlight.y}px, rgba(255, 255, 255, 0.22), transparent 70%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Dynamic Specular Sheen Effect */}
      {showSheen && isHovered && (
        <div
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] overflow-hidden opacity-30 mix-blend-overlay"
          aria-hidden="true"
        >
          <div className="w-[200%] h-full bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full animate-[shimmer_1.4s_infinite]" />
        </div>
      )}
    </div>
  );
};
