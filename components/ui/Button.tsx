import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient' | 'glow' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
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
  ...props 
}) => {
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Ripple effect
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setTimeout(() => setRipple(null), 500);

    if (onClick && !disabled && !isLoading) {
      onClick(e);
    }
  };

  const baseStyles = `
    relative inline-flex items-center justify-center gap-2
    rounded-xl font-semibold
    transition-all duration-200 ease-out
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
    disabled:pointer-events-none disabled:opacity-50
    overflow-hidden
    active:scale-[0.98]
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
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Ripple effect */}
      {ripple && (
        <span
          className="absolute rounded-full bg-white/30 animate-[ping_0.5s_ease-out]"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
          }}
        />
      )}

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
        <span className="shrink-0">{leftIcon}</span>
      )}

      {/* Content */}
      {!isLoading && children}

      {/* Right icon */}
      {!isLoading && rightIcon && (
        <span className="shrink-0">{rightIcon}</span>
      )}
    </button>
  );
};