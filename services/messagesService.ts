import { supabase } from './supabaseClient';
import { logger } from '../utils/logger';

// ==========================================
// Constants
// ==========================================

const MESSAGE_ATTACHMENTS_BUCKET = 'message-attachments';
const VOICE_MESSAGES_BUCKET = 'voice-messages';

// ==========================================
// Types
// ==========================================

export interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  request_id: string | null;
  offer_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
  is_closed?: boolean; // هل المحادثة مغلقة؟
  closed_reason?: string; // سبب الإغلاق
  // Joined data
  other_user?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  unread_count?: number;
}

export interface MessageAttachment {
  id?: string;
  file_url: string;
  file_name: string;
  file_type: 'image' | 'video' | 'audio' | 'document';
  file_size?: number;
  thumbnail_url?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  // New fields for attachments and audio
  attachments?: MessageAttachment[];
  audio_url?: string | null;
  audio_duration?: number | null;
  message_type?: 'text' | 'audio' | 'image' | 'file' | 'mixed';
  // Joined data
  sender?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// ==========================================
// Conversations
// ==========================================

/**
 * Get all conversations for current user
 */
export async function getConversations(): Promise<Conversation[]> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      logger.error('Auth error in getConversations:', authError, 'service');
      return [];
    }
    if (!user) return [];

    // First fetch conversations without joins to avoid foreign key issues
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (convError) {
      logger.error('Supabase error in getConversations:', convError, 'service');
      if (convError.code === '42P01' || convError.code === 'PGRST116') {
        return [];
      }
      throw convError;
    }

    // Fetch profiles separately to avoid foreign key relationship issues
    const participantIds = new Set<string>();
    (convData || []).forEach(conv => {
      participantIds.add(conv.participant1_id);
      participantIds.add(conv.participant2_id);
    });

    let profilesMap: Record<string, any> = {};
    if (participantIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', Array.from(participantIds));
      
      (profiles || []).forEach(p => {
        profilesMap[p.id] = p;
      });
    }

    const data = (convData || []).map(conv => ({
      ...conv,
      participant1: profilesMap[conv.participant1_id] || null,
      participant2: profilesMap[conv.participant2_id] || null,
    }));

    const error = null;

    // Error already handled above

    // Transform data to include other_user and unread_count
    const conversations = await Promise.all(
      (data || []).map(async (conv) => {
        const otherUserId = conv.participant1_id === user.id 
          ? conv.participant2_id 
          : conv.participant1_id;
        
        const otherUser = conv.participant1_id === user.id
          ? conv.participant2
          : conv.participant1;

        // Get unread count - with error handling
        let unreadCount = 0;
        try {
          const { count, error: countError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);
          
          if (countError) {
            logger.warn('Error getting unread count for conversation:', conv.id, countError);
            unreadCount = 0;
          } else {
            unreadCount = count || 0;
          }
        } catch (countErr) {
          logger.warn('Exception getting unread count:', countErr);
          unreadCount = 0;
        }

        return {
          ...conv,
          other_user: otherUser,
          unread_count: unreadCount,
        };
      })
    );

    return conversations;
  } catch (error) {
    logger.error('Error fetching conversations:', error, 'service');
    return [];
  }
}

/**
 * Get or create conversation between two users
 */
export async function getOrCreateConversation(
  otherUserId: string,
  requestId?: string,
  offerId?: string
): Promise<Conversation | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Try to find existing conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id})`)
      .is('request_id', requestId ?? null)
      .is('offer_id', offerId ?? null)
      .single();

    if (existing) {
      return existing as Conversation;
    }

    // Create new conversation
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        participant1_id: user.id,
        participant2_id: otherUserId,
        request_id: requestId || null,
        offer_id: offerId || null,
      })
      .select()
      .single();

    if (error) throw error;

    return newConv as Conversation;
  } catch (error) {
    logger.error('Error getting/creating conversation:', error, 'service');
    return null;
  }
}

/**
 * Get conversation by ID
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch conversation without explicit foreign key joins
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .single();

    if (convError) throw convError;

    // Fetch profiles separately
    const participantIds = [convData.participant1_id, convData.participant2_id];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', participantIds);
    
    const profilesMap: Record<string, any> = {};
    (profiles || []).forEach(p => { profilesMap[p.id] = p; });

    const data = {
      ...convData,
      participant1: profilesMap[convData.participant1_id] || null,
      participant2: profilesMap[convData.participant2_id] || null,
    };

    const otherUserId = data.participant1_id === user.id 
      ? data.participant2_id 
      : data.participant1_id;
    
    const otherUser = data.participant1_id === user.id
      ? data.participant2
      : data.participant1;

    return {
      ...data,
      other_user: otherUser,
    } as Conversation;
  } catch (error) {
    logger.error('Error fetching conversation:', error, 'service');
    return null;
  }
}

// ==========================================
// Messages
// ==========================================

/**
 * Get messages for a conversation
 */
export async function getMessages(conversationId: string, limit = 50): Promise<Message[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Verify user has access to this conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .single();

    if (!conv) return [];

    // Fetch messages without explicit foreign key joins
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (messagesError) throw messagesError;

    // Fetch sender profiles separately
    const senderIds = [...new Set((messagesData || []).map(m => m.sender_id))];
    let sendersMap: Record<string, any> = {};
    if (senderIds.length > 0) {
      const { data: senders } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', senderIds);
      (senders || []).forEach(s => { sendersMap[s.id] = s; });
    }

    const data = (messagesData || []).map(m => ({
      ...m,
      sender: sendersMap[m.sender_id] || null,
    }));

    return data.reverse() as Message[]; // Reverse to show oldest first
  } catch (error) {
    logger.error('Error fetching messages:', error, 'service');
    return [];
  }
}

/**
 * Send a message with optional attachments and audio
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  options?: {
    attachments?: MessageAttachment[];
    audioUrl?: string;
    audioDuration?: number;
  }
): Promise<Message | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Verify user is a participant in the conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('participant1_id, participant2_id')
      .eq('id', conversationId)
      .single();
    if (!conv || (conv.participant1_id !== user.id && conv.participant2_id !== user.id)) {
      logger.warn('User not allowed to send in this conversation');
      return null;
    }

    // Determine message type
    let messageType: Message['message_type'] = 'text';
    if (options?.audioUrl) {
      messageType = 'audio';
    } else if (options?.attachments && options.attachments.length > 0) {
      const hasImages = options.attachments.some(a => a.file_type === 'image');
      const hasOther = options.attachments.some(a => a.file_type !== 'image');
      if (content.trim() || (hasImages && hasOther)) {
        messageType = 'mixed';
      } else if (hasImages) {
        messageType = 'image';
      } else {
        messageType = 'file';
      }
    }

    // Insert message
    const { data: insertedMsg, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        attachments: options?.attachments || [],
        audio_url: options?.audioUrl || null,
        audio_duration: options?.audioDuration || null,
        message_type: messageType,
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    // Update conversation's last_message_at and last_message_preview
    // (This is also done by trigger, but we do it here as backup)
    const messagePreview = content.trim() || (options?.audioUrl ? 'رسالة صوتية' : options?.attachments && options.attachments.length > 0 ? 'مرفق' : 'رسالة');
    await supabase
      .from('conversations')
      .update({
        last_message_at: insertedMsg.created_at,
        last_message_preview: messagePreview.substring(0, 100),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    // Fetch sender profile separately
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    // Get conversation to find recipient
    const { data: conversation } = await supabase
      .from('conversations')
      .select('participant1_id, participant2_id, request_id, offer_id')
      .eq('id', conversationId)
      .single();

    // Send notification to recipient (backup if trigger doesn't work)
    if (conversation) {
      const recipientId = conversation.participant1_id === user.id 
        ? conversation.participant2_id 
        : conversation.participant1_id;
      
      if (recipientId) {
        try {
          const senderName = senderProfile?.display_name || 'مستخدم';
          const notificationMessage = content.trim() 
            ? content.substring(0, 50) + (content.length > 50 ? '...' : '')
            : options?.audioUrl 
              ? 'رسالة صوتية' 
              : options?.attachments && options.attachments.length > 0 
                ? 'مرفق' 
                : 'رسالة جديدة';

          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: recipientId,
              type: 'message',
              title: 'رسالة جديدة',
              message: `${senderName}: ${notificationMessage}`,
              link_to: `/messages/${conversationId}`,
              related_message_id: insertedMsg.id,
              related_request_id: conversation.request_id || null,
              related_offer_id: conversation.offer_id || null,
            });

          if (notifError) {
            logger.warn('Failed to create notification (trigger should handle it):', notifError);
          }
        } catch (notifError) {
          logger.warn('Exception creating notification (trigger should handle it):', notifError);
        }
      }
    }

    return {
      ...insertedMsg,
      sender: senderProfile || null,
    } as Message;
  } catch (error) {
    logger.error('Error sending message:', error, 'service');
    return null;
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(conversationId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Verify user belongs to conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('participant1_id, participant2_id')
      .eq('id', conversationId)
      .single();
    if (!conv || (conv.participant1_id !== user.id && conv.participant2_id !== user.id)) {
      logger.warn('User not allowed to mark messages in this conversation');
      return false;
    }

    const { error } = await supabase
      .from('messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false);

    if (error) throw error;

    // Update conversation's updated_at to trigger realtime subscriptions
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return true;
  } catch (error) {
    logger.error('Error marking messages as read:', error, 'service');
    return false;
  }
}

// ==========================================
// Realtime Subscriptions
// ==========================================

/**
 * Subscribe to new messages and updates in a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (message: Message, eventType: 'INSERT' | 'UPDATE') => void
) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // Listen for all changes (INSERT, UPDATE)
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          // Fetch full message
          const { data: msgData } = await supabase
            .from('messages')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (msgData) {
            // Fetch sender profile separately
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .eq('id', msgData.sender_id)
              .single();

            const data = { ...msgData, sender: senderProfile || null };
            callback(data as Message, payload.eventType as 'INSERT' | 'UPDATE');
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to conversation updates
 */
export function subscribeToConversations(
  userId: string,
  callback: (conversation: Conversation) => void
) {
  const channel = supabase
    .channel(`conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `participant1_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Conversation);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `participant2_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Conversation);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ==========================================
// Conversation Management
// ==========================================

/**
 * إغلاق محادثات طلب معين (باستثناء العرض المقبول)
 * تُستخدم عند قبول عرض لإغلاق المحادثات مع العارضين الآخرين
 */
export async function closeConversationsForRequest(
  requestId: string,
  excludeOfferId?: string,
  closedReason: string = 'تم قبول عرض آخر على هذا الطلب'
): Promise<{ closedCount: number; systemMessagesSent: number }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { closedCount: 0, systemMessagesSent: 0 };

    // جلب جميع المحادثات المرتبطة بالطلب
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('request_id', requestId)
      .neq('is_closed', true);

    if (error) {
      logger.error('خطأ في جلب المحادثات:', error, 'service');
      return { closedCount: 0, systemMessagesSent: 0 };
    }

    // تصفية المحادثات باستثناء العرض المقبول
    const conversationsToClose = (conversations || []).filter(
      conv => conv.offer_id !== excludeOfferId
    );

    let closedCount = 0;
    let systemMessagesSent = 0;

    for (const conv of conversationsToClose) {
      // إغلاق المحادثة
      const { error: closeError } = await supabase
        .from('conversations')
        .update({ 
          is_closed: true, 
          closed_reason: closedReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', conv.id);

      if (!closeError) {
        closedCount++;

        // إرسال رسالة نظام لطيفة
        const systemMessage = await sendSystemMessage(
          conv.id,
          '🔔 تم إغلاق هذه المحادثة - تم قبول عرض آخر على هذا الطلب. شكراً لاهتمامك!'
        );
        if (systemMessage) systemMessagesSent++;
      }
    }

    return { closedCount, systemMessagesSent };
  } catch (error) {
    logger.error('خطأ في إغلاق المحادثات:', error, 'service');
    return { closedCount: 0, systemMessagesSent: 0 };
  }
}

/**
 * إرسال رسالة نظام في محادثة
 */
export async function sendSystemMessage(
  conversationId: string,
  content: string
): Promise<Message | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // إرسال الرسالة باسم النظام (نستخدم معرف المستخدم الحالي مع علامة خاصة في المحتوى)
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      logger.error('خطأ في إرسال رسالة النظام:', error, 'service');
      return null;
    }

    // تحديث آخر رسالة في المحادثة
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content.substring(0, 100),
      })
      .eq('id', conversationId);

    return data as Message;
  } catch (error) {
    logger.error('خطأ في إرسال رسالة النظام:', error, 'service');
    return null;
  }
}

/**
 * التحقق مما إذا كانت المحادثة مغلقة
 */
export async function isConversationClosed(conversationId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('is_closed')
      .eq('id', conversationId)
      .single();

    if (error) return false;
    return data?.is_closed || false;
  } catch {
    return false;
  }
}

/**
 * الحصول على سبب إغلاق المحادثة
 */
export async function getConversationClosedReason(conversationId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('closed_reason')
      .eq('id', conversationId)
      .single();

    if (error) return null;
    return data?.closed_reason || null;
  } catch {
    return null;
  }
}

// ==========================================
// File Upload Functions
// ==========================================

/**
 * Generate unique file name
 */
function generateFileName(originalName: string, prefix: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || 'file';
  return `${prefix}/${timestamp}-${randomString}.${extension}`;
}

/**
 * Upload a file attachment for messages
 */
export async function uploadMessageAttachment(
  file: File,
  conversationId: string
): Promise<MessageAttachment | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const filePath = generateFileName(file.name, `${conversationId}/${user.id}`);
    
    const { data, error } = await supabase.storage
      .from(MESSAGE_ATTACHMENTS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      logger.error('Upload error:', error, 'service');
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(MESSAGE_ATTACHMENTS_BUCKET)
      .getPublicUrl(data.path);

    // Determine file type
    let fileType: MessageAttachment['file_type'] = 'document';
    if (file.type.startsWith('image/')) {
      fileType = 'image';
    } else if (file.type.startsWith('video/')) {
      fileType = 'video';
    } else if (file.type.startsWith('audio/')) {
      fileType = 'audio';
    }

    return {
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: fileType,
      file_size: file.size,
    };
  } catch (error) {
    logger.error('Error uploading attachment:', error, 'service');
    return null;
  }
}

/**
 * Upload multiple file attachments
 */
export async function uploadMessageAttachments(
  files: File[],
  conversationId: string
): Promise<MessageAttachment[]> {
  const attachments: MessageAttachment[] = [];
  
  for (const file of files) {
    const attachment = await uploadMessageAttachment(file, conversationId);
    if (attachment) {
      attachments.push(attachment);
    }
  }
  
  return attachments;
}

/**
 * Upload voice message recording
 */
export async function uploadVoiceMessage(
  audioBlob: Blob,
  conversationId: string,
  duration: number
): Promise<{ url: string; duration: number } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const timestamp = Date.now();
    const filePath = `${conversationId}/${user.id}/${timestamp}.webm`;
    
    const { data, error } = await supabase.storage
      .from(VOICE_MESSAGES_BUCKET)
      .upload(filePath, audioBlob, {
        cacheControl: '3600',
        contentType: 'audio/webm',
        upsert: false
      });

    if (error) {
      logger.error('Voice upload error:', error, 'service');
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(VOICE_MESSAGES_BUCKET)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      duration: Math.round(duration),
    };
  } catch (error) {
    logger.error('Error uploading voice message:', error, 'service');
    return null;
  }
}

// ==========================================
// Unread Messages Count
// ==========================================

/**
 * Get total unread messages count for current user
 */
export async function getTotalUnreadMessagesCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // Get all conversations for the user
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

    if (convError || !conversations || conversations.length === 0) return 0;

    const conversationIds = conversations.map(c => c.id);

    // Count unread messages across all conversations
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('is_read', false)
      .neq('sender_id', user.id);

    if (countError) return 0;
    return count || 0;
  } catch (error) {
    logger.error('Error getting unread count:', error, 'service');
    return 0;
  }
}

/**
 * Subscribe to unread messages count changes
 */
export function subscribeToUnreadCount(
  userId: string,
  callback: (count: number) => void
) {
  // Initial count
  getTotalUnreadMessagesCount().then(callback);

  // Subscribe to message changes
  const channel = supabase
    .channel(`unread-messages:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
      },
      async () => {
        // Recalculate count on any message change
        const count = await getTotalUnreadMessagesCount();
        callback(count);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Get unread messages count for user's requests
 * Counts messages in conversations linked to user's requests
 */
export async function getUnreadMessagesForMyRequests(userRequestIds: string[]): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !userRequestIds || userRequestIds.length === 0) return 0;

    // Get conversations linked to user's requests
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .in('request_id', userRequestIds)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

    if (convError || !conversations || conversations.length === 0) return 0;

    const conversationIds = conversations.map(c => c.id);

    // Count unread messages in these conversations
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('is_read', false)
      .neq('sender_id', user.id);

    if (countError) return 0;
    return count || 0;
  } catch (error) {
    logger.error('Error getting unread messages for my requests:', error, 'service');
    return 0;
  }
}

/**
 * Get unread messages count for user's offers
 * Counts messages in conversations linked to user's offers
 */
export async function getUnreadMessagesForMyOffers(userOfferIds: string[]): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !userOfferIds || userOfferIds.length === 0) return 0;

    // Get conversations linked to user's offers
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .in('offer_id', userOfferIds)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

    if (convError || !conversations || conversations.length === 0) return 0;

    const conversationIds = conversations.map(c => c.id);

    // Count unread messages in these conversations
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('is_read', false)
      .neq('sender_id', user.id);

    if (countError) return 0;
    return count || 0;
  } catch (error) {
    logger.error('Error getting unread messages for my offers:', error, 'service');
    return 0;
  }
}
