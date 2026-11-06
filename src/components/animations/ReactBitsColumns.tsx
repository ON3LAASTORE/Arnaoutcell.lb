import React, { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { calculateStaggerDelay } from '../../utils/animationHelpers';

interface ReactBitsColumnsProps {
  children: React.ReactNode[];
  className?: string;
  columns?: 1 | 2 | 3 | 4;
  showDividers?: boolean;
  staggerInterval?: number;
}

export const ReactBitsColumns: React.FC<ReactBitsColumnsProps> = ({
  children,
  className = '',
  columns = 3,
  showDividers = false,
  staggerInterval = 0.08,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-40px' });

  const gridColsClass =
    columns === 1
      ? 'grid-cols-1'
      : columns === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : columns === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div
      ref={containerRef}
      className={`grid gap-5 md:gap-6 relative ${gridColsClass} ${className}`}
    >
      {React.Children.map(children, (child, index) => {
        const delay = calculateStaggerDelay(index, 0.04, staggerInterval);

        return (
          <div key={index} className="relative flex flex-col h-full group">
            {/* Animated Column Item */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{
                duration: 0.35,
                delay,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex-1 flex flex-col transition-transform duration-300 group-hover:-translate-y-1"
            >
              {child}
            </motion.div>

            {/* Optional Architectural Column Divider (hidden on last item) */}
            {showDividers && index < children.length - 1 && (
              <div
                className="hidden lg:block absolute -right-3 top-4 bottom-4 w-[1px] bg-gradient-to-b from-transparent via-[#DCE5F0] dark:via-[#1E293B] to-transparent pointer-events-none transition-opacity duration-300 group-hover:via-[#007AFF]/40"
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
