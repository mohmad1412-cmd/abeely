import React, { useEffect, useState, useRef } from 'react';
import { logger } from '../utils/logger';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  ArrowRight, 
  Send, 
  Loader2,
  User,
  ChevronLeft,
  CheckCheck,
  Paperclip,
  Mic,
  X,
  Image,
  FileText,
  Play,
  Pause,
  Trash2
} from 'lucide-react';
import { 
  getConversations, 
  getMessages, 
  sendMessage,
  markMessagesAsRead,
  getOrCreateConversation,
  subscribeToMessages,
  subscribeToConversations,
  uploadMessageAttachments,
  uploadVoiceMessage,
  Conversation,
  Message,
  MessageAttachment
} from '../services/messagesService';
import { getCurrentUser } from '../services/authService';
import { ListItemSkeleton, ChatMessageSkeleton } from './ui/LoadingSkeleton';
import { UnifiedHeader } from './ui/UnifiedHeader';

// Audio Player Component for Voice Messages
const AudioPlayer: React.FC<{ url: string; duration?: number }> = ({ url, duration: propDuration }) => {
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(propDuration || 0);
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    const audio = audioRef;
    if (audio) {
      const handleLoadedMetadata = () => {
        const dur = audio.duration;
        if (dur && isFinite(dur)) {
          setDuration(dur);
        }
      };
      
      const handleTimeUpdate = () => {
        const time = audio.currentTime;
        const dur = audio.duration;
        if (dur && isFinite(dur) && dur > 0) {
          setCurrentTime(time);
          setProgressPercent((time / dur) * 100);
        }
      };
      
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setProgressPercent(0);
      };
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      
      if (audio.readyState >= 1 && audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [audioRef]);

  const togglePlay = () => {
    if (audioRef) {
      if (isPlaying) {
        audioRef.pause();
      } else {
        audioRef.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef && duration > 0) {
      audioRef.currentTime = newTime;
      setCurrentTime(newTime);
      setProgressPercent((newTime / duration) * 100);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-white/10 rounded-xl p-2 min-w-[180px]">
      <div className="flex items-center gap-2 flex-row-reverse">
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full flex items-center justify-center text-current hover:bg-white/20 transition-colors shrink-0"
        >
          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <div className="flex-1 flex items-center gap-2 flex-row-reverse">
          <span className="text-[10px] opacity-70 tabular-nums shrink-0 min-w-[40px] text-right">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.01"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to left, currentColor 0%, currentColor ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%, rgba(255,255,255,0.2) 100%)`,
            }}
          />
        </div>
      </div>
      <audio ref={setAudioRef} src={url} preload="metadata" className="hidden" />
    </div>
  );
};

// Attachment Preview Component
const AttachmentPreview: React.FC<{ 
  attachment: MessageAttachment; 
  isOwn: boolean;
}> = ({ attachment, isOwn }) => {
  if (attachment.file_type === 'image') {
    return (
      <a href={attachment.file_url} target="_blank" rel="noopener noreferrer" className="block">
        <img 
          src={attachment.file_url} 
          alt={attachment.file_name}
          className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
        />
      </a>
    );
  }

  return (
    <a 
      href={attachment.file_url} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        isOwn ? 'bg-white/10' : 'bg-secondary/50'
      }`}
    >
      <FileText size={18} />
      <span className="text-xs truncate max-w-[150px]">{attachment.file_name}</span>
    </a>
  );
};

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
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  onOpenLanguagePopup?: () => void;
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
  isDarkMode,
  toggleTheme,
  onOpenLanguagePopup,
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
  
  // Attachments state
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  
  // Preview audio player state
  const [previewAudioRef, setPreviewAudioRef] = useState<HTMLAudioElement | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

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
        logger.error('Error loading conversations:', error, 'service');
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
        logger.error('Error loading messages:', error, 'service');
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

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      setRecordingTime(0);
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // File handling
  const handleFilePick = () => fileInputRef.current?.click();

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setAttachedFiles((prev) => {
      const existingNames = new Set(prev.map(f => f.name));
      const newFiles = files.filter(f => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });
    e.target.value = "";
  };

  const removeFile = (name: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.name !== name));
  };

  // Voice recording
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("التسجيل الصوتي غير مدعوم في هذا المتصفح");
      return;
    }

    if (isRecording || recordedAudioUrl) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: "audio/webm" });
          setRecordedAudioBlob(blob);
          setRecordedAudioUrl(URL.createObjectURL(blob));
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      logger.error("Error starting recording:", error, 'service');
      alert("حدث خطأ في بدء التسجيل");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    setMediaRecorder(null);
    setRecordingTime(0);
    setRecordedAudioBlob(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedAudioUrl(null);
  };

  const clearPendingMedia = () => {
    setAttachedFiles([]);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    setMediaRecorder(null);
    setRecordingTime(0);
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    const hasContent = newMessage.trim() || attachedFiles.length > 0 || recordedAudioBlob;
    if (!hasContent || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      let uploadedAttachments: MessageAttachment[] = [];
      let audioUrl: string | undefined;
      let audioDuration: number | undefined;

      // Upload attachments if any
      if (attachedFiles.length > 0) {
        uploadedAttachments = await uploadMessageAttachments(attachedFiles, selectedConversation.id);
      }

      // Upload voice message if any
      if (recordedAudioBlob) {
        const voiceResult = await uploadVoiceMessage(recordedAudioBlob, selectedConversation.id, recordingTime);
        if (voiceResult) {
          audioUrl = voiceResult.url;
          audioDuration = voiceResult.duration;
        }
      }

      const sentMsg = await sendMessage(selectedConversation.id, newMessage, {
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        audioUrl,
        audioDuration,
      });

      if (sentMsg) {
        setMessages((prev) => [...prev, sentMsg]);
        setNewMessage('');
        clearPendingMedia();
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      logger.error('Error sending message:', error, 'service');
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
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          onOpenLanguagePopup={onOpenLanguagePopup}
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
              const hasAttachments = msg.attachments && msg.attachments.length > 0;
              const hasAudio = msg.audio_url;
              
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
                    {/* Voice Message */}
                    {hasAudio && (
                      <div className="mb-2">
                        <AudioPlayer url={msg.audio_url!} duration={msg.audio_duration || undefined} />
                      </div>
                    )}
                    
                    {/* Attachments */}
                    {hasAttachments && (
                      <div className="flex flex-col gap-2 mb-2">
                        {msg.attachments!.map((att, idx) => (
                          <AttachmentPreview key={idx} attachment={att} isOwn={isOwn} />
                        ))}
                      </div>
                    )}
                    
                    {/* Text Content */}
                    {msg.content && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    )}
                    
                    <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <p className={`text-[10px] ${
                        isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {formatTime(msg.created_at)}
                      </p>
                      {isOwn && (
                        msg.is_read ? (
                          <CheckCheck size={12} className="text-primary-foreground/60" />
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
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFilesSelected}
          multiple
          accept="image/*,video/*,application/pdf,.doc,.docx"
          className="hidden"
        />
        
        {/* Recording indicator */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center justify-between mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              <button
                onClick={cancelRecording}
                className="p-2 hover:bg-red-500/20 rounded-full transition-colors"
              >
                <X size={18} className="text-red-500" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatRecordingTime(recordingTime)}</span>
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              </div>
              <button
                onClick={stopRecording}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                إيقاف
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Recorded audio preview */}
        <AnimatePresence>
          {recordedAudioUrl && !isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 mb-3 p-3 bg-primary/10 border border-primary/20 rounded-xl"
            >
              <button
                onClick={cancelRecording}
                className="p-2 hover:bg-primary/20 rounded-full transition-colors"
              >
                <Trash2 size={16} className="text-destructive" />
              </button>
              <div className="flex-1">
                <audio src={recordedAudioUrl} controls className="w-full h-8" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Attached files preview */}
        <AnimatePresence>
          {attachedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-wrap gap-2 mb-3"
            >
              {attachedFiles.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg"
                >
                  {file.type.startsWith('image/') ? (
                    <Image size={14} className="text-primary" />
                  ) : (
                    <FileText size={14} className="text-primary" />
                  )}
                  <span className="text-xs truncate max-w-[100px]">{file.name}</span>
                  <button
                    onClick={() => removeFile(file.name)}
                    className="p-1 hover:bg-destructive/20 rounded-full"
                  >
                    <X size={12} className="text-destructive" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex items-center gap-2">
          {/* Attachment button */}
          <button
            onClick={handleFilePick}
            disabled={isSending || isRecording}
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            <Paperclip size={18} className="text-muted-foreground" />
          </button>
          
          {/* Voice recording button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isSending || recordedAudioUrl !== null}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 ${
              isRecording 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            <Mic size={18} className={isRecording ? 'text-white' : 'text-muted-foreground'} />
          </button>
          
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
            className="flex-1 py-3 px-4 rounded-xl bg-secondary border border-border focus:outline-none focus:border-primary text-right"
            dir="rtl"
            disabled={isRecording}
          />
          <button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && attachedFiles.length === 0 && !recordedAudioBlob) || isSending || isRecording}
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

