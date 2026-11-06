/**
 * Pure calculation helpers for GSAP and React Bits animations:
 * - Scroll progress and beam line math
 * - 3D Tilt perspective and spotlight coordinates
 * - Staggered column delays and offsets
 */

export interface TiltResult {
  rotateX: number; // in degrees
  rotateY: number; // in degrees
  percentX: number; // 0 to 100%
  percentY: number; // 0 to 100%
}

export interface SpotlightResult {
  x: number; // in px
  y: number; // in px
  percentX: number; // 0 to 100%
  percentY: number; // 0 to 100%
}

/**
 * Calculates scroll percentage safely clamped between 0 and 1 (or 0% to 100%).
 */
export function calculateScrollProgress(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): number {
  const maxScroll = scrollHeight - clientHeight;
  if (maxScroll <= 0) return 0;
  const progress = scrollTop / maxScroll;
  return Math.min(Math.max(progress, 0), 1);
}

/**
 * Computes 3D tilt rotation angles from a mouse cursor position over an element.
 * Moving mouse to the top tilts element back (negative rotateX).
 * Moving mouse to the right tilts element right (positive rotateY).
 */
export function calculate3DTilt(
  mouseX: number,
  mouseY: number,
  width: number,
  height: number,
  maxTiltDeg = 12
): TiltResult {
  if (width <= 0 || height <= 0) {
    return { rotateX: 0, rotateY: 0, percentX: 50, percentY: 50 };
  }

  // Normalize cursor position from -1 (left/top) to +1 (right/bottom)
  const normX = Math.min(Math.max((mouseX / width) * 2 - 1, -1), 1);
  const normY = Math.min(Math.max((mouseY / height) * 2 - 1, -1), 1);

  // In 3D space:
  // Tilting up (negative normY) -> positive rotateX tilts top toward user,
  // or standard perspective: top away = -rotateX
  const rotateX = -normY * maxTiltDeg;
  const rotateY = normX * maxTiltDeg;

  const percentX = Math.round(((normX + 1) / 2) * 100);
  const percentY = Math.round(((normY + 1) / 2) * 100);

  return {
    rotateX: Number(rotateX.toFixed(2)),
    rotateY: Number(rotateY.toFixed(2)),
    percentX,
    percentY,
  };
}

/**
 * Computes spotlight radial gradient center coordinates from relative cursor offset.
 */
export function calculateSpotlightPosition(
  mouseX: number,
  mouseY: number,
  width: number,
  height: number
): SpotlightResult {
  if (width <= 0 || height <= 0) {
    return { x: 0, y: 0, percentX: 50, percentY: 50 };
  }

  const clampedX = Math.min(Math.max(mouseX, 0), width);
  const clampedY = Math.min(Math.max(mouseY, 0), height);

  const percentX = Math.round((clampedX / width) * 100);
  const percentY = Math.round((clampedY / height) * 100);

  return {
    x: Math.round(clampedX),
    y: Math.round(clampedY),
    percentX,
    percentY,
  };
}

/**
 * Computes staggered delay in seconds for columns or grid cards.
 */
export function calculateStaggerDelay(
  index: number,
  baseDelay = 0.05,
  staggerInterval = 0.08
): number {
  if (index < 0) return baseDelay;
  return Number((baseDelay + index * staggerInterval).toFixed(3));
}

/**
 * Computes light beam vertical position along architectural scroll lines.
 * Offset each line slightly so pulses don't move in rigid lockstep.
 */
export function calculateBeamPosition(
  progress: number,
  lineIndex = 0,
  speedMultiplier = 1
): { yPercent: number; opacity: number } {
  const safeProgress = Math.min(Math.max(progress, 0), 1);
  // Stagger each vertical line's beam phase
  const phaseOffset = (lineIndex * 0.22) % 1;
  const rawPosition = (safeProgress * speedMultiplier + phaseOffset) % 1;
  
  // Fade in at top, fade out near bottom
  const opacity =
    rawPosition < 0.1
      ? rawPosition / 0.1
      : rawPosition > 0.85
      ? (1 - rawPosition) / 0.15
      : 1;

  return {
    yPercent: Number((rawPosition * 100).toFixed(2)),
    opacity: Number(Math.max(0, Math.min(opacity, 1)).toFixed(2)),
  };
}
