import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'error' | 'info' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  pulse = false,
  className = '' 
}) => {
  const baseStyles = `
    inline-flex items-center justify-center gap-1.5
    rounded-full font-semibold
    transition-all duration-200
    whitespace-nowrap
  `;
  
  const variants = {
    default: `
      bg-primary text-primary-foreground
      shadow-sm
    `,
    secondary: `
      bg-secondary text-secondary-foreground
      border border-border
    `,
    outline: `
      bg-secondary/30 text-foreground
      border border-border
      hover:bg-secondary/50
      !rounded-lg
    `,
    success: `
      bg-emerald-500/15 text-emerald-700 dark:text-emerald-400
      border border-emerald-500/20
    `,
    warning: `
      bg-amber-500/15 text-amber-700 dark:text-amber-400
      border border-amber-500/20
    `,
    error: `
      bg-red-500/15 text-red-700 dark:text-red-400
      border border-red-500/20
    `,
    info: `
      bg-blue-500/15 text-blue-700 dark:text-blue-400
      border border-blue-500/20
    `,
    gradient: `
      bg-gradient-to-r from-primary to-accent text-white
      shadow-sm
    `,
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span className={`
      ${baseStyles} 
      ${variants[variant]} 
      ${sizes[size]} 
      ${pulse ? 'animate-pulse-soft' : ''} 
      ${className}
    `}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {children}
    </span>
  );
};

// Status badge presets
export const StatusBadge: React.FC<{ status: 'active' | 'pending' | 'completed' | 'rejected' }> = ({ status }) => {
  const config = {
    active: { variant: 'success' as const, label: 'نشط', pulse: true },
    pending: { variant: 'warning' as const, label: 'في الانتظار', pulse: false },
    completed: { variant: 'info' as const, label: 'مكتمل', pulse: false },
    rejected: { variant: 'error' as const, label: 'مرفوض', pulse: false },
  };

  const { variant, label, pulse } = config[status];
  return <Badge variant={variant} pulse={pulse}>{label}</Badge>;
};