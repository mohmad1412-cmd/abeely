import React from "react";
import ReactDOM from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { CreateRequestV2 } from "./CreateRequestV2.tsx";
import { AppNotification, Request } from "../types.ts";
import { VoiceProcessingStatus } from "./GlobalFloatingOrb.tsx";

interface AIMessage {
  id: string;
  text: string;
  timestamp: Date;
}

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  // CreateRequestV2 props
  onPublish: (
    request: Partial<Request>,
    isEditing?: boolean,
    requestId?: string,
  ) => Promise<string | null>;
  onGoToRequest?: (requestId: string) => void;
  onGoToMarketplace?: () => void;
  onRequireAuth?: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  onOpenLanguagePopup?: () => void;
  requestToEdit?: Request | null;
  onClearRequestToEdit?: () => void;
  mode: "requests" | "offers";
  toggleMode: () => void;
  isModeSwitching: boolean;
  unreadCount: number;
  user: any;
  titleKey: number;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onNotificationClick?: (notification: AppNotification) => void;
  onClearAll: () => void;
  onSignOut: () => void;
  isGuest?: boolean;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  aiInput: string;
  setAiInput: (value: string) => void;
  aiMessages: AIMessage[];
  setAiMessages: React.Dispatch<React.SetStateAction<AIMessage[]>>;
  isAiLoading: boolean;
  setIsAiLoading: (loading: boolean) => void;
  aiSendHandlerRef?: React.MutableRefObject<
    ((audioBlob?: Blob) => Promise<void>) | null
  >;
  voiceSendHandlerRef?: React.MutableRefObject<
    ((audioBlob: Blob) => Promise<void>) | null
  >;
  setVoiceProcessingStatus?: (status: VoiceProcessingStatus) => void;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  isOpen,
  onClose,
  ...props
}) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
          />

          {/* Modal - Bottom Sheet Style */}
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{
              type: "spring",
              damping: 35,
              stiffness: 400,
              mass: 0.8,
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              const velocityThreshold = 800;
              const offsetThreshold = 150;
              const shouldClose = info.offset.y > offsetThreshold ||
                info.velocity.y > velocityThreshold;

              if (shouldClose) {
                onClose();
              }
            }}
            // Reduced bottom padding (pb-2 instead of full inset) and adjusted height logic
            className="fixed inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full max-w-4xl mx-auto bg-background border-t sm:border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl z-[10000] h-[95vh] sm:h-[90vh] flex flex-col pb-2 sm:pb-0"
          >
            {/* Drag Handle - Mobile Only */}
            <div className="sm:hidden flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none shrink-0 z-10 bg-background rounded-t-3xl">
              <div className="w-20 h-1 bg-muted-foreground/40 dark:bg-muted-foreground/50 rounded-full" />
            </div>

            {/* Content Container - Relative to allow absolute positioning inside */}
            <div className="flex-1 overflow-hidden relative rounded-t-3xl sm:rounded-2xl">
              {/* Close Button - Desktop Only (Overlay) */}
              <button
                type="button"
                onClick={onClose}
                className="hidden sm:flex absolute top-4 right-4 z-50 p-2 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 rounded-full transition-colors backdrop-blur-md"
              >
                <X size={20} />
              </button>

              <div className="h-full overflow-y-auto custom-scrollbar">
                <CreateRequestV2
                  {...props}
                  onBack={onClose} // Override local back to close modal
                  isModal
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};
