import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  ArrowRight, 
  Send, 
  Loader2,
  User,
  ChevronLeft,
  CheckCheck
} from 'lucide-react';
import { 
  getConversations, 
  getMessages, 
  sendMessage,
  markMessagesAsRead,
  getOrCreateConversation,
  subscribeToMessages,
  subscribeToConversations,
  Conversation,
  Message
} from '../services/messagesService';
import { getCurrentUser } from '../services/authService';
import { ListItemSkeleton, ChatMessageSkeleton } from './ui/LoadingSkeleton';
import { UnifiedHeader } from './ui/UnifiedHeader';

interface MessagesProps {
  onBack: () => void;
  onSelectConversation?: (conversationId: string) => void;
  initialConversationId?: string;
  // Unified Header Props
  mode: 'requests' | 'offers';
  toggleMode: () => void;
  isModeSwitching: boolean;
  unreadCount: number;
  hasUnreadMessages: boolean;
  setView: (view: any) => void;
  setPreviousView: (view: any) => void;
  titleKey: number;
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  onNotificationClick?: (notification: any) => void;
  onClearAll: () => void;
  onSignOut: () => void;
  isGuest?: boolean;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
}

export const Messages: React.FC<MessagesProps> = ({ 
  onBack, 
  onSelectConversation,
  initialConversationId,
  mode,
  toggleMode,
  isModeSwitching,
  unreadCount,
  hasUnreadMessages,
  setView,
  setPreviousView,
  titleKey,
  notifications,
  onMarkAsRead,
  onNotificationClick,
  onClearAll,
  onSignOut,
  isGuest = false,
  onNavigateToProfile,
  onNavigateToSettings,
}) => {
  const [user, setUser] = React.useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    loadUser();
  }, []);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!user?.id) return;

    const loadConversations = async () => {
      setIsLoading(true);
      try {
        const convs = await getConversations();
        setConversations(convs);
        
        // If initial conversation ID provided, select it
        if (initialConversationId) {
          const conv = convs.find(c => c.id === initialConversationId);
          if (conv) {
            setSelectedConversation(conv);
          }
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();

    // Subscribe to conversation updates
    const unsubscribe = subscribeToConversations(user.id, (updatedConv) => {
      setConversations((prev) => {
        const index = prev.findIndex(c => c.id === updatedConv.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = updatedConv;
          return updated.sort((a, b) => {
            const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return bTime - aTime;
          });
        } else {
          return [updatedConv, ...prev];
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, initialConversationId]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const msgs = await getMessages(selectedConversation.id);
        setMessages(msgs);
        
        // Mark messages as read
        await markMessagesAsRead(selectedConversation.id);
        
        // Update conversation unread count
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id ? { ...c, unread_count: 0 } : c
          )
        );
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();

    // Subscribe to new messages
    const unsubscribe = subscribeToMessages(selectedConversation.id, (newMsg, eventType) => {
      if (eventType === 'INSERT') {
        setMessages((prev) => [...prev, newMsg]);
        
        // Mark as read if it's not from current user
        if (newMsg.sender_id !== user?.id) {
          markMessagesAsRead(selectedConversation.id);
        }
        
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else if (eventType === 'UPDATE') {
        setMessages((prev) => 
          prev.map((m) => (m.id === newMsg.id ? newMsg : m))
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedConversation?.id, user?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      const sentMsg = await sendMessage(selectedConversation.id, newMessage);
      if (sentMsg) {
        setMessages((prev) => [...prev, sentMsg]);
        setNewMessage('');
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (minutes < 1440) return `منذ ${Math.floor(minutes / 60)} ساعة`;
    return d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
  };

  // Show conversation list
  if (!selectedConversation) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Unified Header */}
        <UnifiedHeader
          mode={mode}
          toggleMode={toggleMode}
          isModeSwitching={isModeSwitching}
          unreadCount={unreadCount}
          hasUnreadMessages={hasUnreadMessages}
          user={user}
          setView={setView}
          setPreviousView={setPreviousView}
          titleKey={titleKey}
          notifications={notifications}
          onMarkAsRead={onMarkAsRead}
          onNotificationClick={onNotificationClick}
          onClearAll={onClearAll}
          onSignOut={onSignOut}
          onGoToMarketplace={onBack}
          title="الرسائل"
          currentView="messages"
          isGuest={isGuest}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToSettings={onNavigateToSettings}
        />

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <MessageCircle size={48} className="text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد محادثات بعد</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <motion.button
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversation(conv);
                    if (onSelectConversation) {
                      onSelectConversation(conv.id);
                    }
                  }}
                  className="w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-right"
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {conv.other_user?.avatar_url ? (
                      <img
                        src={conv.other_user.avatar_url}
                        alt={conv.other_user.display_name || 'User'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User size={24} className="text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-bold text-sm truncate">
                        {conv.other_user?.display_name || 'مستخدم'}
                      </h3>
                      {conv.unread_count && conv.unread_count > 0 ? (
                        <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full shrink-0">
                          {conv.unread_count}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.last_message_preview || 'لا توجد رسائل'}
                    </p>
                    {conv.last_message_at && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatTime(conv.last_message_at)}
                      </p>
                    )}
                  </div>
                  <ChevronLeft size={18} className="text-muted-foreground shrink-0" />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show conversation messages
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-[#0a0a0f]/70 backdrop-blur-3xl px-4 py-3 flex items-center gap-3">
        <motion.button
          onClick={() => setSelectedConversation(null)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all text-foreground focus:outline-none bg-card/80 backdrop-blur-sm border border-border shadow-lg hover:bg-card"
        >
          <ArrowRight size={22} strokeWidth={2.5} />
        </motion.button>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          {selectedConversation.other_user?.avatar_url ? (
            <img
              src={selectedConversation.other_user.avatar_url}
              alt={selectedConversation.other_user.display_name || 'User'}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User size={20} className="text-primary" />
          )}
        </div>
        <h1 className="text-lg font-bold flex-1">
          {selectedConversation.other_user?.display_name || 'مستخدم'}
        </h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="space-y-6">
            <ChatMessageSkeleton />
            <ChatMessageSkeleton isUser />
            <ChatMessageSkeleton />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle size={48} className="text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد رسائل بعد</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      isOwn
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-secondary text-secondary-foreground rounded-tl-none'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <p className={`text-[10px] ${
                        isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {formatTime(msg.created_at)}
                      </p>
                      {isOwn && (
                        msg.is_read ? (
                          <CheckCheck size={12} className="text-blue-200" />
                        ) : (
                          <CheckCheck size={12} className="text-primary-foreground/40" />
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-background border-t border-border p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="اكتب رسالتك..."
            className="flex-1 py-3 px-4 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary text-right"
            dir="rtl"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            {isSending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

