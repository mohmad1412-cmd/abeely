import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RippleItem {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Ripple color - defaults to primary teal */
  rippleColor?: string;
  /** Disable ripple effect */
  noRipple?: boolean;
  /** Enable haptic feedback vibration */
  haptic?: boolean;
  /** Use light ripple for dark backgrounds */
  lightRipple?: boolean;
}

export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  className = '',
  onClick,
  disabled,
  noRipple = false,
  haptic = true,
  lightRipple = false,
  rippleColor,
  ...props
}) => {
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const rippleIdRef = useRef(0);

  const createRipple = useCallback(
    (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
      if (noRipple || disabled) return;

      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();

      // Get position from mouse or touch
      let x: number, y: number;
      if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
      } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }

      // Calculate ripple size based on button dimensions
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
      }, 600);
    },
    [noRipple, disabled, haptic]
  );

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e);

    if (onClick && !disabled) {
      onClick(e);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    createRipple(e);
  };

  // Determine ripple color
  const getRippleBackground = () => {
    if (rippleColor) {
      return `radial-gradient(circle, ${rippleColor} 0%, transparent 70%)`;
    }
    if (lightRipple) {
      return 'radial-gradient(circle, rgba(255, 255, 255, 0.35) 0%, transparent 70%)';
    }
    return 'radial-gradient(circle, rgba(30, 150, 140, 0.25) 0%, transparent 70%)';
  };

  return (
    <button
      className={`relative overflow-hidden touch-manipulation select-none ${className}`}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      disabled={disabled}
      {...props}
    >
      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x - ripple.size / 2,
              top: ripple.y - ripple.size / 2,
              width: ripple.size,
              height: ripple.size,
              background: getRippleBackground(),
            }}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          />
        ))}
      </AnimatePresence>

      {/* Button content */}
      {children}
    </button>
  );
};

export default RippleButton;






