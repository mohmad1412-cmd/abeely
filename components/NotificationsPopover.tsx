import React from 'react';
import { Notification } from '../types';
import { Bell, Check, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';

interface NotificationsPopoverProps {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onNotificationClick?: (notification: Notification) => void; // Callback للتنقل عند النقر على الإشعار
}

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30
    }
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: { duration: 0.2 }
  }
};

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  notifications,
  isOpen,
  onClose,
  onMarkAsRead,
  onClearAll,
  onNotificationClick
}) => {
  const unreadCount = (notifications || []).filter(n => !n.isRead).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[199]" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-16 left-4 z-[200] w-80 md:w-96 bg-card/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl overflow-hidden"
          >
          {/* Header */}
          <div className="p-4 border-b border-border flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent">
            <h3 className="font-bold flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Bell size={18} className="text-primary" />
              </motion.div>
              <span>الإشعارات</span>
              {unreadCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full"
                >
                  {unreadCount}
                </motion.span>
              )}
            </h3>
            {notifications.length > 0 && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClearAll} 
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                مسح الكل
              </motion.button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 text-center text-muted-foreground"
              >
                {/* Empty State with Brand Character */}
                <motion.div
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-brand flex items-center justify-center"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="text-2xl font-black text-white">أ</span>
                </motion.div>
                <p className="font-medium">لا توجد إشعارات</p>
                <p className="text-xs mt-1 text-muted-foreground/70">سنخبرك عند وصول عروض جديدة ✨</p>
              </motion.div>
            ) : (
              <motion.ul 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="divide-y divide-border"
              >
                <AnimatePresence>
                  {notifications.map((notification, index) => (
                    <motion.li 
                      key={notification.id}
                      variants={itemVariants}
                      layout
                      whileHover={{ backgroundColor: "rgba(var(--primary-rgb), 0.05)" }}
                      className={`p-4 cursor-pointer transition-colors ${!notification.isRead ? 'bg-primary/5' : ''}`}
                      onClick={() => {
                        onMarkAsRead(notification.id);
                        // إذا كان هناك callback للنقر على الإشعار، استخدمه
                        if (onNotificationClick) {
                          onNotificationClick(notification);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {/* Notification Type Icon */}
                            <span className="text-lg">
                              {notification.type === 'offer' && '💰'}
                              {notification.type === 'message' && '💬'}
                              {notification.type === 'status' && '📋'}
                              {notification.type === 'system' && '🔔'}
                            </span>
                            <h4 className={`text-sm font-semibold ${!notification.isRead ? 'text-primary' : ''}`}>
                              {notification.title}
                            </h4>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 pr-6">
                            {notification.message}
                          </p>
                          <span className="text-xs text-muted-foreground/70 mt-2 block">
                            {format(notification.timestamp, 'p - d MMM', { locale: ar })}
                          </span>
                        </div>
                        {!notification.isRead && (
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-1 shadow-lg shadow-red-500/50"
                          />
                        )}
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 3 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 border-t border-border bg-secondary/20 text-center"
            >
              <button className="text-xs text-primary hover:underline font-medium">
                عرض كل الإشعارات
              </button>
            </motion.div>
          )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
