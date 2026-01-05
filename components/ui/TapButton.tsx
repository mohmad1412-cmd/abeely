import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hapticService } from '../../services/hapticService';

interface RippleItem {
  id: number;
  x: number;
  y: number;
  size: number;
}

type TapButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success' | 'icon';

interface TapButtonProps {
  children?: React.ReactNode;
  /** Button style variant */
  variant?: TapButtonVariant;
  /** Size of the button */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Is the button circular (for icon buttons) */
  circular?: boolean;
  /** Disable ripple effect */
  noRipple?: boolean;
  /** Enable haptic feedback vibration (default: true) */
  haptic?: boolean;
  /** Custom ripple color */
  rippleColor?: string;
  /** CSS class name */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Click handler */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Title attribute */
  title?: string;
  /** Aria label */
  'aria-label'?: string;
}

/**
 * TapButton - A modern touch-sensitive button with ripple effects
 * 
 * Perfect for:
 * - Icon buttons
 * - Action buttons (save, cancel, etc.)
 * - Filter/toggle buttons
 * - Any button needing premium touch feedback
 */
export const TapButton: React.FC<TapButtonProps> = ({
  children,
  variant = 'ghost',
  size = 'md',
  circular = false,
  noRipple = false,
  haptic = true,
  rippleColor,
  className = '',
  disabled,
  onClick,
  type = 'button',
  title,
  'aria-label': ariaLabel,
}) => {
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const [isPressed, setIsPressed] = useState(false);
  const rippleIdRef = useRef(0);

  const createRipple = useCallback((e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    if (noRipple || disabled) return;

    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    
    let x: number, y: number;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    const size = Math.max(rect.width, rect.height) * 2.5;
    
    const newRipple: RippleItem = {
      id: rippleIdRef.current++,
      x,
      y,
      size,
    };

    setRipples(prev => [...prev, newRipple]);

    if (haptic) {
      hapticService.tap();
    }

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 500);
  }, [noRipple, disabled, haptic]);

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsPressed(true);
    createRipple(e);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    setIsPressed(true);
    createRipple(e);
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick && !disabled) {
      onClick(e);
    }
  };

  // Variant styles
  const variantStyles: Record<TapButtonVariant, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'bg-transparent hover:bg-secondary/60',
    outline: 'bg-transparent border border-border hover:border-primary/50 hover:bg-primary/5',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    success: 'bg-primary text-white hover:bg-primary/90',
    icon: 'bg-transparent hover:bg-secondary/60',
  };

  // Size styles
  const sizeStyles = {
    xs: circular ? 'w-7 h-7' : 'h-7 px-2 text-xs',
    sm: circular ? 'w-9 h-9' : 'h-9 px-3 text-sm',
    md: circular ? 'w-10 h-10' : 'h-10 px-4 text-sm',
    lg: circular ? 'w-12 h-12' : 'h-12 px-5 text-base',
  };

  // Ripple color based on variant
  const getRippleColor = () => {
    if (rippleColor) return rippleColor;
    if (variant === 'primary' || variant === 'danger' || variant === 'success') {
      return 'rgba(255, 255, 255, 0.35)';
    }
    return 'rgba(30, 150, 140, 0.25)';
  };

  return (
    <motion.button
      className={`
        relative inline-flex items-center justify-center gap-2
        ${circular ? 'rounded-full' : 'rounded-xl'}
        font-medium
        transition-colors duration-150
        disabled:pointer-events-none disabled:opacity-50
        overflow-hidden
        select-none
        touch-manipulation
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      animate={{
        scale: isPressed ? 0.94 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      disabled={disabled}
      type={type}
      title={title}
      aria-label={ariaLabel}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
    >
      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x - ripple.size / 2,
              top: ripple.y - ripple.size / 2,
              width: ripple.size,
              height: ripple.size,
              background: `radial-gradient(circle, ${getRippleColor()} 0%, transparent 70%)`,
            }}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          />
        ))}
      </AnimatePresence>

      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
};

// Quick presets for common use cases
export const IconButton: React.FC<Omit<TapButtonProps, 'circular' | 'variant'> & { variant?: 'ghost' | 'outline' | 'primary' }> = (props) => (
  <TapButton {...props} circular variant={props.variant || 'ghost'} />
);

export const ActionButton: React.FC<Omit<TapButtonProps, 'variant'> & { variant?: 'primary' | 'secondary' | 'success' | 'danger' }> = (props) => (
  <TapButton {...props} variant={props.variant || 'primary'} />
);

export const ChipButton: React.FC<Omit<TapButtonProps, 'circular'>> = ({ className = '', ...props }) => (
  <TapButton {...props} className={`rounded-full ${className}`} />
);

export default TapButton;

