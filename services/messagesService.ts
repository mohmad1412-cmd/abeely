import { supabase } from './supabaseClient';

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
  // Joined data
  other_user?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  unread_count?: number;
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
      console.error('Auth error in getConversations:', authError);
      return [];
    }
    if (!user) return [];

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant1:profiles!conversations_participant1_id_fkey(id, display_name, avatar_url),
        participant2:profiles!conversations_participant2_id_fkey(id, display_name, avatar_url)
      `)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Supabase error in getConversations:', error);
      // If table doesn't exist or RLS issue, return empty array instead of throwing
      if (error.code === '42P01' || error.code === 'PGRST116') {
        return [];
      }
      throw error;
    }

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
            console.warn('Error getting unread count for conversation:', conv.id, countError);
            unreadCount = 0;
          } else {
            unreadCount = count || 0;
          }
        } catch (countErr) {
          console.warn('Exception getting unread count:', countErr);
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
    console.error('Error fetching conversations:', error);
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
      .eq('request_id', requestId || null)
      .eq('offer_id', offerId || null)
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
    console.error('Error getting/creating conversation:', error);
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

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant1:profiles!conversations_participant1_id_fkey(id, display_name, avatar_url),
        participant2:profiles!conversations_participant2_id_fkey(id, display_name, avatar_url)
      `)
      .eq('id', conversationId)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .single();

    if (error) throw error;

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
    console.error('Error fetching conversation:', error);
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

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).reverse() as Message[]; // Reverse to show oldest first
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

/**
 * Send a message
 */
export async function sendMessage(
  conversationId: string,
  content: string
): Promise<Message | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url)
      `)
      .single();

    if (error) throw error;

    return data as Message;
  } catch (error) {
    console.error('Error sending message:', error);
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

    return true;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return false;
  }
}

// ==========================================
// Realtime Subscriptions
// ==========================================

/**
 * Subscribe to new messages in a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (message: Message) => void
) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        // Fetch full message with sender data
        const { data } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url)
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          callback(data as Message);
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

