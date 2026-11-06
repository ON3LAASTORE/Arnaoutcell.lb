import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { calculateScrollProgress, calculateBeamPosition } from '../../utils/animationHelpers';

interface GsapScrollLinesProps {
  showTopIndicator?: boolean;
  showVerticalGuideLines?: boolean;
}

export const GsapScrollLines: React.FC<GsapScrollLinesProps> = ({
  showTopIndicator = true,
  showVerticalGuideLines = true,
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const glowHeadRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const [scrollPercent, setScrollPercent] = useState<number>(0);
  const [beams, setBeams] = useState<Array<{ yPercent: number; opacity: number }>>([
    { yPercent: 0, opacity: 0 },
    { yPercent: 20, opacity: 0.5 },
    { yPercent: 40, opacity: 0.8 },
    { yPercent: 60, opacity: 0.5 },
  ]);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const doc = document.documentElement;
          const scrollTop = window.pageYOffset || doc.scrollTop;
          const scrollHeight = doc.scrollHeight;
          const clientHeight = doc.clientHeight;

          const progress = calculateScrollProgress(scrollTop, scrollHeight, clientHeight);
          const percent = Math.round(progress * 100);
          setScrollPercent(percent);

          // Animate progress bar with GSAP for buttery smooth easing
          if (progressBarRef.current) {
            gsap.to(progressBarRef.current, {
              scaleX: progress,
              duration: 0.15,
              ease: 'power1.out',
              overwrite: 'auto',
            });
          }

          if (glowHeadRef.current) {
            gsap.to(glowHeadRef.current, {
              left: `${progress * 100}%`,
              duration: 0.15,
              ease: 'power1.out',
              overwrite: 'auto',
            });
          }

          // Calculate vertical architectural line beams
          setBeams([
            calculateBeamPosition(progress, 0, 1.2),
            calculateBeamPosition(progress, 1, 1.5),
            calculateBeamPosition(progress, 2, 1.1),
            calculateBeamPosition(progress, 3, 1.4),
          ]);

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      {/* Top GSAP Scroll Progress Line */}
      {showTopIndicator && (
        <div
          className="fixed top-0 left-0 right-0 h-[3px] z-[999] pointer-events-none bg-slate-200/20 dark:bg-slate-800/20 backdrop-blur-[1px]"
          aria-hidden="true"
        >
          {/* Animated line fill */}
          <div
            ref={progressBarRef}
            className="h-full w-full origin-left bg-gradient-to-r from-[#007AFF] via-[#38BDF8] to-[#00D26A] shadow-[0_0_12px_rgba(0,122,255,0.8)]"
            style={{ transform: 'scaleX(0)' }}
          />

          {/* Glowing head pulse */}
          <div
            ref={glowHeadRef}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#38BDF8,0_0_20px_#007AFF] transition-opacity duration-200"
            style={{ opacity: scrollPercent > 0 ? 1 : 0 }}
          />

          {/* Small percentage badge on top right */}
          <div
            ref={badgeRef}
            className={`fixed top-2.5 right-3 z-[999] px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider backdrop-blur-md border transition-all duration-300 pointer-events-none hidden sm:flex items-center gap-1.5 ${
              scrollPercent > 2
                ? 'opacity-85 translate-y-0 bg-white/80 dark:bg-[#0E1726]/80 text-[#007AFF] dark:text-[#38BDF8] border-[#007AFF]/20 shadow-sm'
                : 'opacity-0 -translate-y-2'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] animate-ping" />
            <span>{scrollPercent}%</span>
          </div>
        </div>
      )}

      {/* Architectural Vertical Scroll Lines with Animated Energy Beams */}
      {showVerticalGuideLines && (
        <div
          className="fixed inset-0 pointer-events-none z-[1] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hidden md:block opacity-40 dark:opacity-25"
          aria-hidden="true"
        >
          <div className="relative w-full h-full flex justify-between">
            {/* Guide Line 1 (Far Left) */}
            <div className="relative w-[1px] h-full bg-gradient-to-b from-transparent via-[#007AFF]/15 to-transparent">
              <div
                className="absolute w-[2px] -left-[0.5px] h-28 rounded-full bg-gradient-to-b from-transparent via-[#007AFF] to-transparent shadow-[0_0_8px_#007AFF] transition-all duration-200 ease-out"
                style={{
                  top: `${beams[0]?.yPercent || 0}%`,
                  opacity: beams[0]?.opacity || 0,
                }}
              />
            </div>

            {/* Guide Line 2 (One-third) */}
            <div className="relative w-[1px] h-full bg-gradient-to-b from-transparent via-slate-300/10 dark:via-slate-700/10 to-transparent">
              <div
                className="absolute w-[2px] -left-[0.5px] h-20 rounded-full bg-gradient-to-b from-transparent via-[#38BDF8] to-transparent shadow-[0_0_8px_#38BDF8] transition-all duration-200 ease-out"
                style={{
                  top: `${beams[1]?.yPercent || 20}%`,
                  opacity: beams[1]?.opacity || 0,
                }}
              />
            </div>

            {/* Guide Line 3 (Two-thirds) */}
            <div className="relative w-[1px] h-full bg-gradient-to-b from-transparent via-slate-300/10 dark:via-slate-700/10 to-transparent">
              <div
                className="absolute w-[2px] -left-[0.5px] h-24 rounded-full bg-gradient-to-b from-transparent via-[#00D26A] to-transparent shadow-[0_0_8px_#00D26A] transition-all duration-200 ease-out"
                style={{
                  top: `${beams[2]?.yPercent || 40}%`,
                  opacity: beams[2]?.opacity || 0,
                }}
              />
            </div>

            {/* Guide Line 4 (Far Right) */}
            <div className="relative w-[1px] h-full bg-gradient-to-b from-transparent via-[#007AFF]/15 to-transparent">
              <div
                className="absolute w-[2px] -left-[0.5px] h-32 rounded-full bg-gradient-to-b from-transparent via-[#007AFF] to-transparent shadow-[0_0_8px_#007AFF] transition-all duration-200 ease-out"
                style={{
                  top: `${beams[3]?.yPercent || 60}%`,
                  opacity: beams[3]?.opacity || 0,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
