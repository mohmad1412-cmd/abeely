import { useState, useCallback, useRef, CSSProperties } from 'react';

interface RippleItem {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface UseRippleOptions {
  disabled?: boolean;
  color?: string;
  duration?: number;
  haptic?: boolean;
}

export const useRipple = (options: UseRippleOptions = {}) => {
  const {
    disabled = false,
    color = 'rgba(30, 150, 140, 0.25)',
    duration = 600,
    haptic = true,
  } = options;

  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const rippleIdRef = useRef(0);

  const createRipple = useCallback(
    (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
      if (disabled) return;

      const element = e.currentTarget;
      const rect = element.getBoundingClientRect();

      // Get position from mouse or touch
      let x: number, y: number;
      if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
      } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }

      // Calculate ripple size based on element dimensions
      const size = Math.max(rect.width, rect.height) * 2.5;

      const newRipple: RippleItem = {
        id: rippleIdRef.current++,
        x,
        y,
        size,
      };

      setRipples((prev) => [...prev, newRipple]);

      // Haptic feedback
      if (haptic && navigator.vibrate) {
        navigator.vibrate(8);
      }

      // Clean up ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, duration);
    },
    [disabled, duration, haptic]
  );

  const getRippleStyle = (ripple: RippleItem): CSSProperties => ({
    position: 'absolute',
    left: ripple.x - ripple.size / 2,
    top: ripple.y - ripple.size / 2,
    width: ripple.size,
    height: ripple.size,
    borderRadius: '50%',
    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
    transform: 'scale(0)',
    opacity: 0.8,
    animation: `ripple-animation ${duration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
    pointerEvents: 'none' as const,
  });

  return {
    ripples,
    createRipple,
    getRippleStyle,
    handlers: {
      onClick: createRipple,
      onTouchStart: createRipple,
    },
  };
};

// CSS keyframes for ripple animation (add to globals.css)
export const rippleKeyframes = `
@keyframes ripple-animation {
  0% {
    transform: scale(0);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}
`;

