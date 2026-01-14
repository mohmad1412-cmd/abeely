import React from "react";
import ReactDOM from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Messages } from "./Messages.tsx";
import { AppNotification } from "../types.ts";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  otherUserId: string;
  requestId?: string;
  offerId?: string;
  conversationId?: string; // If we already know it
  // Props needed for Messages component
  mode: "requests" | "offers";
  toggleMode: () => void;
  isModeSwitching: boolean;
  unreadCount: number;
  hasUnreadMessages: boolean;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  setView: (view: any) => void;
  setPreviousView: (view: any) => void;
  titleKey: number;
  user?: any;
  isGuest?: boolean;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  otherUserId, // Destructure to remove from messagesProps
  requestId, // Destructure to remove from messagesProps
  offerId, // Destructure to remove from messagesProps
  // Pass-through props
  ...messagesProps
}) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{
              y: "100%",
              opacity: 0,
              scale: 0.95,
            }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
            }}
            exit={{
              y: "100%",
              opacity: 0,
              scale: 0.95,
            }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full h-[90vh] md:h-[80vh] md:max-w-2xl md:rounded-2xl bg-background overflow-hidden shadow-2xl flex flex-col pointer-events-auto mt-auto md:mt-0"
          >
            <Messages
              {...messagesProps}
              initialConversationId={conversationId}
              isPopup={true}
              onClose={onClose}
              onBack={onClose} // Just in case
              // We don't want navigation inside the popup to affect the main app view
              onNavigateToProfile={() => {}}
              onNavigateToSettings={() => {}}
              onSelectConversation={() => {}}
              onNotificationClick={() => {}}
              onSignOut={() => {}}
              onOpenLanguagePopup={() => {}}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
