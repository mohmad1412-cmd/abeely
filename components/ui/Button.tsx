import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RippleItem {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient' | 'glow' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Disable ripple effect */
  noRipple?: boolean;
  /** Enable haptic feedback vibration */
  haptic?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '', 
  disabled,
  onClick,
  noRipple = false,
  haptic = true,
  ...props 
}) => {
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const rippleIdRef = useRef(0);

  const createRipple = useCallback((e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    if (noRipple || disabled || isLoading) return;

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

    setRipples(prev => [...prev, newRipple]);

    // Haptic feedback
    if (haptic && navigator.vibrate) {
      navigator.vibrate(8);
    }

    // Clean up ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
  }, [noRipple, disabled, isLoading, haptic]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e);

    if (onClick && !disabled && !isLoading) {
      onClick(e);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    createRipple(e);
  };

  const baseStyles = `
    relative inline-flex items-center justify-center gap-2
    rounded-xl font-semibold
    transition-all duration-150 ease-out
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
    disabled:pointer-events-none disabled:opacity-50
    overflow-hidden
    active:scale-[0.96]
    select-none
    touch-manipulation
  `;
  
  const variants = {
    primary: `
      bg-primary text-primary-foreground
      hover:bg-primary/90 hover:shadow-md hover:-translate-y-0.5
      shadow-sm
    `,
    secondary: `
      bg-secondary text-secondary-foreground
      hover:bg-secondary/80 hover:shadow-sm
    `,
    outline: `
      border border-input bg-transparent
      hover:bg-secondary hover:border-primary/30
    `,
    ghost: `
      bg-transparent
      hover:bg-secondary hover:text-secondary-foreground
    `,
    danger: `
      bg-destructive text-destructive-foreground
      hover:bg-destructive/90 hover:shadow-md
      shadow-sm
    `,
    gradient: `
      bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%]
      text-white font-bold
      hover:bg-[position:100%_0] hover:shadow-xl hover:-translate-y-0.5
      shadow-md
      transition-[background-position,transform,box-shadow] duration-500
    `,
    glow: `
      bg-primary text-primary-foreground
      shadow-lg hover:shadow-2xl hover:-translate-y-1
      transition-all duration-300
    `,
    success: `
      bg-green-600 text-white
      hover:bg-green-700 hover:shadow-md hover:-translate-y-0.5
      shadow-sm
    `,
  };

  const sizes = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-11 px-5 text-sm',
    lg: 'h-13 px-8 text-base',
    icon: 'h-10 w-10 p-0',
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Modern ripple effects */}
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
              background: variant === 'outline' || variant === 'ghost' || variant === 'secondary'
                ? 'radial-gradient(circle, rgba(30, 150, 140, 0.25) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(255, 255, 255, 0.35) 0%, transparent 70%)',
            }}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          />
        ))}
      </AnimatePresence>

      {/* Loading spinner */}
      {isLoading && (
        <motion.div
          className="h-5 w-5 border-2 border-current border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Left icon */}
      {!isLoading && leftIcon && (
        <motion.span 
          className="shrink-0"
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.1 }}
        >
          {leftIcon}
        </motion.span>
      )}

      {/* Content */}
      {!isLoading && children}

      {/* Right icon */}
      {!isLoading && rightIcon && (
        <motion.span 
          className="shrink-0"
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.1 }}
        >
          {rightIcon}
        </motion.span>
      )}
    </button>
  );
};