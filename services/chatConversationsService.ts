import { supabase } from './supabaseClient';

// أنواع البيانات
export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  created_at?: string;
  metadata?: Record<string, any>;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  request_id: string | null;
}

/**
 * الحصول على المحادثة النشطة للمستخدم
 */
export async function getActiveConversation(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error getting active conversation:', error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error('Error in getActiveConversation:', err);
    return null;
  }
}

/**
 * إنشاء محادثة جديدة
 */
export async function createNewConversation(
  userId: string,
  title?: string
): Promise<string | null> {
  try {
    // إيقاف جميع المحادثات النشطة السابقة
    await supabase
      .from('ai_conversations')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    // إنشاء محادثة جديدة
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: userId,
        title: title || null,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error('Error in createNewConversation:', err);
    return null;
  }
}

/**
 * الحصول على جميع رسائل المحادثة
 */
export async function getConversationMessages(
  conversationId: string
): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('ai_conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting messages:', error);
      return [];
    }

    return (data || []).map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'ai',
      text: msg.text,
      created_at: msg.created_at,
      metadata: msg.metadata || {},
    }));
  } catch (err) {
    console.error('Error in getConversationMessages:', err);
    return [];
  }
}

/**
 * إضافة رسالة جديدة للمحادثة
 */
export async function addMessageToConversation(
  conversationId: string,
  role: 'user' | 'ai',
  text: string,
  metadata?: Record<string, any>
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('ai_conversation_messages')
      .insert({
        conversation_id: conversationId,
        role,
        text,
        metadata: metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error adding message:', error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error('Error in addMessageToConversation:', err);
    return null;
  }
}

/**
 * تحديث عنوان المحادثة
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ai_conversations')
      .update({ title })
      .eq('id', conversationId);

    if (error) {
      console.error('Error updating conversation title:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in updateConversationTitle:', err);
    return false;
  }
}

/**
 * إيقاف المحادثة (عند نشر الطلب)
 */
export async function deactivateConversation(
  conversationId: string,
  requestId?: string
): Promise<boolean> {
  try {
    const updateData: any = { is_active: false };
    if (requestId) {
      updateData.request_id = requestId;
    }

    const { error } = await supabase
      .from('ai_conversations')
      .update(updateData)
      .eq('id', conversationId);

    if (error) {
      console.error('Error deactivating conversation:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in deactivateConversation:', err);
    return false;
  }
}

/**
 * الحصول على جميع محادثات المستخدم
 */
export async function getUserConversations(
  userId: string,
  limit: number = 50
): Promise<ChatConversation[]> {
  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting user conversations:', error);
      return [];
    }

    return (data || []) as ChatConversation[];
  } catch (err) {
    console.error('Error in getUserConversations:', err);
    return [];
  }
}

/**
 * حفظ محادثة كاملة (إنشاء أو تحديث)
 */
export async function saveConversation(
  userId: string,
  messages: ChatMessage[],
  title?: string
): Promise<string | null> {
  try {
    // الحصول على المحادثة النشطة أو إنشاء واحدة جديدة
    let conversationId = await getActiveConversation(userId);
    
    if (!conversationId) {
      conversationId = await createNewConversation(userId, title);
      if (!conversationId) {
        console.error('Failed to create conversation');
        return null;
      }
    } else if (title) {
      // تحديث العنوان إذا تم توفيره
      await updateConversationTitle(conversationId, title);
    }

    // حفظ جميع الرسائل
    for (const message of messages) {
      // تجنب إضافة رسائل مكررة (تحقق من آخر رسالة)
      const existingMessages = await getConversationMessages(conversationId);
      const lastMessage = existingMessages[existingMessages.length - 1];
      
      // إذا كانت الرسالة مختلفة عن الأخيرة، أضفها
      if (!lastMessage || lastMessage.text !== message.text || lastMessage.role !== message.role) {
        await addMessageToConversation(
          conversationId,
          message.role,
          message.text,
          message.metadata
        );
      }
    }

    return conversationId;
  } catch (err) {
    console.error('Error in saveConversation:', err);
    return null;
  }
}

/**
 * تحميل محادثة كاملة للمستخدم
 */
export async function loadUserConversation(userId: string): Promise<ChatMessage[]> {
  try {
    const conversationId = await getActiveConversation(userId);
    
    if (!conversationId) {
      return [];
    }

    return await getConversationMessages(conversationId);
  } catch (err) {
    console.error('Error in loadUserConversation:', err);
    return [];
  }
}

