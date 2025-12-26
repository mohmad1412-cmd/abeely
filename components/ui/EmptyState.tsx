import React from 'react';
import { Inbox, Search, FileText, Sparkles, ShoppingBag, MessageSquare } from 'lucide-react';
import { Button } from './Button';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon?: 'inbox' | 'search' | 'file' | 'sparkles' | 'shop' | 'chat';
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const iconMap = {
  inbox: Inbox,
  search: Search,
  file: FileText,
  sparkles: Sparkles,
  shop: ShoppingBag,
  chat: MessageSquare,
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  const IconComponent = iconMap[icon];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex flex-col items-center justify-center text-center p-8 ${className}`}
    >
      {/* Animated Brand Character */}
      <motion.div 
        className="relative mb-6"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Background glow */}
        <motion.div 
          className="absolute inset-0 bg-gradient-brand rounded-full blur-2xl scale-150 opacity-20"
          animate={{ scale: [1.3, 1.5, 1.3], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        {/* Brand Character Circle */}
        <motion.div 
          className="relative w-24 h-24 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-2xl"
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 3, -3, 0]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Brand Character "أ" */}
          <span className="text-4xl font-black text-white drop-shadow-lg">أ</span>
        </motion.div>

        {/* Decorative floating dots */}
        <motion.div 
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary/50"
          animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0 }}
        />
        <motion.div 
          className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-accent/50"
          animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
        />
        <motion.div 
          className="absolute top-1/2 -right-4 w-2 h-2 rounded-full bg-primary/40"
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
        />
      </motion.div>

      {/* Title */}
      <motion.h3 
        className="text-xl font-bold text-foreground mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p 
          className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {description}
        </motion.p>
      )}

      {/* Action Button */}
      {actionLabel && onAction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAction}
            className="px-6 py-3 rounded-xl bg-gradient-brand text-white font-bold shadow-lg flex items-center gap-2 transition-shadow hover:shadow-xl"
          >
            <Sparkles size={18} />
            {actionLabel}
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
};

// Preset empty states
export const NoRequestsEmpty: React.FC<{ onCreateRequest?: () => void }> = ({ onCreateRequest }) => (
  <EmptyState
    icon="inbox"
    title="لا توجد طلبات"
    description="ابدأ بإنشاء طلبك الأول واحصل على عروض من مقدمي خدمات محترفين"
    actionLabel="إنشاء طلب جديد"
    onAction={onCreateRequest}
  />
);

export const NoOffersEmpty: React.FC = () => (
  <EmptyState
    icon="shop"
    title="لا توجد عروض بعد"
    description="انتظر قليلاً، سيصلك إشعار فور وصول عروض جديدة ✨"
  />
);

export const NoSearchResultsEmpty: React.FC = () => (
  <EmptyState
    icon="search"
    title="لا توجد نتائج"
    description="جرب البحث بكلمات مختلفة أو قم بتغيير الفلاتر"
  />
);

export const NoMessagesEmpty: React.FC = () => (
  <EmptyState
    icon="chat"
    title="ابدأ المحادثة"
    description="هات طلبك، سواء بالكتابة، أو بالتسجيل الصوتي، وراح أصيغ لك طلبك بسرعة تراجعه وتعتمده"
  />
);
