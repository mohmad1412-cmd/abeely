import { supabase } from "./supabaseClient";
import { logger } from "../utils/logger";

// ==========================================
// Constants
// ==========================================

const MESSAGE_ATTACHMENTS_BUCKET = "message-attachments";
const VOICE_MESSAGES_BUCKET = "voice-messages";

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
  file_type: "image" | "video" | "audio" | "document";
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
  message_type?: "text" | "audio" | "image" | "file" | "mixed";
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
      logger.error("Auth error in getConversations:", authError, "service");
      return [];
    }
    if (!user) return [];

    // First fetch conversations without joins to avoid foreign key issues
    const { data: convData, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (convError) {
      logger.error("Supabase error in getConversations:", convError, "service");
      if (convError.code === "42P01" || convError.code === "PGRST116") {
        return [];
      }
      throw convError;
    }

    // Fetch profiles separately to avoid foreign key relationship issues
    const participantIds = new Set<string>();
    (convData || []).forEach((conv) => {
      participantIds.add(conv.participant1_id);
      participantIds.add(conv.participant2_id);
    });

    const profilesMap: Record<string, any> = {};
    if (participantIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", Array.from(participantIds));

      (profiles || []).forEach((p) => {
        profilesMap[p.id] = p;
      });
    }

    const data = (convData || []).map((conv) => ({
      ...conv,
      participant1: profilesMap[conv.participant1_id] || null,
      participant2: profilesMap[conv.participant2_id] || null,
    }));

    const error = null;

    // Error already handled above

    // Fetch all unread counts in one query instead of N queries (performance optimization)
    const conversationIds = (data || []).map((c) => c.id);
    const unreadCountsMap: Record<string, number> = {};

    if (conversationIds.length > 0) {
      try {
        // Use a single query with grouping to get all unread counts
        const { data: unreadData, error: unreadError } = await supabase
          .from("messages")
          .select("conversation_id")
          .in("conversation_id", conversationIds)
          .eq("is_read", false)
          .neq("sender_id", user.id);

        if (!unreadError && unreadData) {
          // Count occurrences per conversation_id
          unreadData.forEach((msg) => {
            unreadCountsMap[msg.conversation_id] =
              (unreadCountsMap[msg.conversation_id] || 0) + 1;
          });
        }
      } catch (countErr) {
        logger.warn("Exception getting unread counts:", countErr);
      }
    }

    // Transform data to include other_user and unread_count (no async needed now!)
    const conversations = (data || []).map((conv) => {
      const otherUser = conv.participant1_id === user.id
        ? conv.participant2
        : conv.participant1;

      return {
        ...conv,
        other_user: otherUser,
        unread_count: unreadCountsMap[conv.id] || 0,
      };
    });

    return conversations;
  } catch (error) {
    logger.error("Error fetching conversations:", error, "service");
    return [];
  }
}

/**
 * Get or create conversation between two users
 */

export async function getOrCreateConversation(
  otherUserId: string,
  requestId?: string,
  offerId?: string,
): Promise<Conversation | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Helper to fetch existing conversation with better query
    const fetchExisting = async (): Promise<any> => {
      // Determine consistent participant order (same as we use for insert)
      const participant1Id = user.id < otherUserId ? user.id : otherUserId;
      const participant2Id = user.id < otherUserId ? otherUserId : user.id;

      // First, try with consistent ordering (new conversations use this)
      const { data: data1, error: error1 } = await supabase
        .from("conversations")
        .select("*")
        .eq("participant1_id", participant1Id)
        .eq("participant2_id", participant2Id)
        .eq("request_id", requestId || null)
        .eq("offer_id", offerId || null)
        .maybeSingle();

      if (error1 && error1.code !== "PGRST116") {
        logger.error(
          "Error fetching existing conversation (consistent order):",
          error1,
          "service",
        );
      }

      if (data1) {
        return data1;
      }

      // Fallback: check reverse order for old conversations that may not follow consistent ordering
      // Only do this if the IDs are actually different
      if (participant1Id !== participant2Id) {
        const { data: data2, error: error2 } = await supabase
          .from("conversations")
          .select("*")
          .eq("participant1_id", participant2Id)
          .eq("participant2_id", participant1Id)
          .eq("request_id", requestId || null)
          .eq("offer_id", offerId || null)
          .maybeSingle();

        if (error2 && error2.code !== "PGRST116") {
          logger.error(
            "Error fetching existing conversation (reverse order):",
            error2,
            "service",
          );
        }

        if (data2) {
          return data2;
        }
      }

      return null;
    };

    // 1. Try to find existing conversation
    const existing = await fetchExisting();
    if (existing) {
      return existing as Conversation;
    }

    // 2. Create new conversation
    // Ensure consistent ordering: smaller ID first for participant1_id to avoid constraint issues
    const participant1Id = user.id < otherUserId ? user.id : otherUserId;
    const participant2Id = user.id < otherUserId ? otherUserId : user.id;

    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({
        participant1_id: participant1Id,
        participant2_id: participant2Id,
        request_id: requestId || null,
        offer_id: offerId || null,
      })
      .select()
      .maybeSingle();

    if (error) {
      // If error is unique constraint violation (code 23505), it means it was created concurrently
      // Retry fetching with exponential backoff
      if (error.code === "23505" || error.code === "409") {
        logger.log(
          "Race condition detected in getOrCreateConversation, retrying with backoff...",
        );

        // Retry with exponential backoff (3 attempts: 100ms, 200ms, 400ms)
        for (let attempt = 0; attempt < 3; attempt++) {
          const delay = 100 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));

          const retryExisting = await fetchExisting();
          if (retryExisting) {
            logger.log(
              `Found conversation after race condition (attempt ${
                attempt + 1
              })`,
            );
            return retryExisting as Conversation;
          }
        }

        // Last attempt: try a broader search
        logger.log(
          "Last attempt: searching all conversations between participants...",
        );
        const lastRetry = await fetchExisting();
        if (lastRetry) {
          return lastRetry as Conversation;
        }

        logger.error(
          "Could not find conversation after race condition retries",
          null,
          "service",
        );
        // Don't throw - return null so the UI can handle gracefully
        return null;
      }
      throw error;
    }

    return newConv as Conversation;
  } catch (error) {
    logger.error("Error getting/creating conversation:", error, "service");
    return null;
  }
}

/**
 * Get conversation by ID
 */
export async function getConversation(
  conversationId: string,
): Promise<Conversation | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch conversation without explicit foreign key joins
    const { data: convData, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .maybeSingle();

    if (convError) throw convError;

    // Fetch profiles separately
    const participantIds = [convData.participant1_id, convData.participant2_id];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", participantIds);

    const profilesMap: Record<string, any> = {};
    (profiles || []).forEach((p) => {
      profilesMap[p.id] = p;
    });

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
    logger.error("Error fetching conversation:", error, "service");
    return null;
  }
}

// ==========================================
// Messages
// ==========================================

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  limit = 50,
): Promise<Message[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Verify user has access to this conversation
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .single();

    if (!conv) return [];

    // Fetch messages without explicit foreign key joins
    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (messagesError) throw messagesError;

    // Fetch sender profiles separately
    const senderIds = [
      ...new Set((messagesData || []).map((m) => m.sender_id)),
    ];
    const sendersMap: Record<string, any> = {};
    if (senderIds.length > 0) {
      const { data: senders } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", senderIds);
      (senders || []).forEach((s) => {
        sendersMap[s.id] = s;
      });
    }

    const data = (messagesData || []).map((m) => ({
      ...m,
      sender: sendersMap[m.sender_id] || null,
    }));

    return data.reverse() as Message[]; // Reverse to show oldest first
  } catch (error) {
    logger.error("Error fetching messages:", error, "service");
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
    senderProfile?: any;
  },
): Promise<Message | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Verify user is a participant in the conversation
    const { data: conv } = await supabase
      .from("conversations")
      .select("participant1_id, participant2_id")
      .eq("id", conversationId)
      .single();
    if (
      !conv ||
      (conv.participant1_id !== user.id && conv.participant2_id !== user.id)
    ) {
      logger.warn("User not allowed to send in this conversation");
      return null;
    }

    // Determine message type
    let messageType: Message["message_type"] = "text";
    if (options?.audioUrl) {
      messageType = "audio";
    } else if (options?.attachments && options.attachments.length > 0) {
      const hasImages = options.attachments.some((a) =>
        a.file_type === "image"
      );
      const hasOther = options.attachments.some((a) => a.file_type !== "image");
      if (content.trim() || (hasImages && hasOther)) {
        messageType = "mixed";
      } else if (hasImages) {
        messageType = "image";
      } else {
        messageType = "file";
      }
    }

    // Insert message
    const { data: insertedMsg, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        attachments: options?.attachments || [],
        audio_url: options?.audioUrl || null,
        audio_duration: options?.audioDuration || null,
        message_type: messageType,
      })
      .select("*")
      .single();

    if (insertError) throw insertError;

    // Use provided profile or fetch if executing on server/unknown context
    // In most cases, we can return null for sender effectively because
    // the UI already optimistic-updated it, and Realtime will bring the full object later.
    // But for completeness:
    let senderProfile = options?.senderProfile;

    if (!senderProfile) {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      senderProfile = data;
    }

    // Start side effects in background (Fire and Forget)
    // We don't await these to speed up the UI response
    (async () => {
      try {
        // Update conversation's last_message_at and last_message_preview
        // (This is also done by trigger, but we do it here as backup)
        const messagePreview = content.trim() ||
          (options?.audioUrl
            ? "رسالة صوتية"
            : options?.attachments && options.attachments.length > 0
            ? "مرفق"
            : "رسالة");

        // Run independence updates in parallel
        await Promise.all([
          // Update conversation
          supabase
            .from("conversations")
            .update({
              last_message_at: insertedMsg.created_at,
              last_message_preview: messagePreview.substring(0, 100),
              updated_at: new Date().toISOString(),
            })
            .eq("id", conversationId),

          // Handle notifications
          (async () => {
            // Use the conversation data we already fetched
            if (conv) {
              const recipientId = conv.participant1_id === user.id
                ? conv.participant2_id
                : conv.participant1_id;

              if (recipientId) {
                // 1. In-app notification
                try {
                  const senderName = senderProfile?.display_name || "مستخدم";
                  const notificationMessage = content.trim()
                    ? content.substring(0, 50) +
                      (content.length > 50 ? "..." : "")
                    : options?.audioUrl
                    ? "رسالة صوتية"
                    : options?.attachments && options.attachments.length > 0
                    ? "مرفق"
                    : "رسالة جديدة";

                  const { error: notifError } = await supabase
                    .from("notifications")
                    .insert({
                      user_id: recipientId,
                      type: "message",
                      title: "رسالة جديدة",
                      message: `${senderName}: ${notificationMessage}`,
                      link_to: `/messages/${conversationId}`,
                      related_message_id: insertedMsg.id,
                      related_request_id: conv.request_id || null, // Use data from conv check
                      related_offer_id: conv.offer_id || null, // Use data from conv check
                    });

                  if (notifError) {
                    logger.warn("Failed to create notification:", notifError);
                  }
                } catch (e) {
                  logger.warn("Error creating notification:", e);
                }

                // 2. Push Notification
                try {
                  // Fetch request title if needed
                  let requestTitle = "محادثة عامة";
                  if (conv.request_id) {
                    const { data: reqData } = await supabase
                      .from("requests")
                      .select("title")
                      .eq("id", conv.request_id)
                      .single();
                    if (reqData) requestTitle = reqData.title;
                  }

                  await sendPushNotificationForNewMessage({
                    conversationId,
                    messageContent: content.trim() ||
                      (options?.audioUrl ? "رسالة صوتية" : "مرفق"),
                    recipientId,
                    senderName: senderProfile?.display_name || "مستخدم",
                    requestTitle,
                    authorId: user.id,
                  });
                } catch (e) {
                  logger.warn("Failed to send push:", e);
                }
              }
            }
          })(),
        ]);
      } catch (err) {
        logger.error("Error in sendMessage background tasks:", err);
      }
    })();

    return {
      ...insertedMsg,
      sender: senderProfile || null,
    } as Message;
  } catch (error) {
    logger.error("Error sending message:", error, "service");
    return null;
  }
}

/**
 * Mark messages as read - تحديث فوري
 */
export async function markMessagesAsRead(
  conversationId: string,
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Verify user belongs to conversation
    const { data: conv } = await supabase
      .from("conversations")
      .select("participant1_id, participant2_id")
      .eq("id", conversationId)
      .single();
    if (
      !conv ||
      (conv.participant1_id !== user.id && conv.participant2_id !== user.id)
    ) {
      logger.warn("User not allowed to mark messages in this conversation");
      return false;
    }

    // تحديث فوري - تحديث جميع الرسائل غير المقروءة دفعة واحدة
    const { error } = await supabase
      .from("messages")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("is_read", false);

    if (error) throw error;

    // تحديث المحادثة لتشغيل الاشتراكات Realtime فوراً
    // هذا يضمن أن جميع الاشتراكات تتلقى التحديث فوراً
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // إرسال حدث لتحديث فوري للـ counts
    window.dispatchEvent(new CustomEvent("refresh-unread-counts"));

    return true;
  } catch (error) {
    logger.error("Error marking messages as read:", error, "service");
    return false;
  }
}

// ==========================================
// Realtime Subscriptions
// ==========================================

/**
 * Subscribe to new messages and updates in a conversation - تحديث فوري
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (message: Message, eventType: "INSERT" | "UPDATE") => void,
) {
  const channel = supabase
    .channel(`messages:${conversationId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: conversationId },
      },
    })
    .on(
      "postgres_changes",
      {
        event: "*", // Listen for all changes (INSERT, UPDATE)
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          // تحديث فوري - استخدام البيانات من payload مباشرة
          const msgData = payload.new as Message;

          // إذا كانت الرسالة موجودة بالفعل ولدينا المرسل، لا داعي للجلب مرة أخرى
          // لكن هنا نحن في static context، لذا سنجلب البروفايل فقط

          try {
            // التحقق من وجود sender_id
            if (msgData.sender_id) {
              const { data: senderProfile } = await supabase
                .from("profiles")
                .select("id, display_name, avatar_url")
                .eq("id", msgData.sender_id)
                .maybeSingle();

              const fullMessage = {
                ...msgData,
                sender: senderProfile || {
                  id: msgData.sender_id,
                  display_name: "مستخدم",
                  avatar_url: null,
                },
              };

              callback(
                fullMessage as Message,
                payload.eventType as "INSERT" | "UPDATE",
              );
            } else {
              // في حالة غريبة عدم وجود sender_id
              callback(msgData, payload.eventType as "INSERT" | "UPDATE");
            }
          } catch (err) {
            logger.error("Error processing realtime message:", err);
            // Fallback: send partial data
            callback(msgData, payload.eventType as "INSERT" | "UPDATE");
          }
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to conversation updates - تحديث فوري
 */
export function subscribeToConversations(
  userId: string,
  callback: (conversation: Conversation) => void,
) {
  const channel = supabase
    .channel(`conversations:${userId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: userId },
      },
    })
    .on(
      "postgres_changes",
      {
        event: "*", // INSERT, UPDATE, DELETE
        schema: "public",
        table: "conversations",
        filter: `participant1_id=eq.${userId}`,
      },
      (payload) => {
        // تحديث فوري - استدعاء مباشر
        callback(payload.new as Conversation);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*", // INSERT, UPDATE, DELETE
        schema: "public",
        table: "conversations",
        filter: `participant2_id=eq.${userId}`,
      },
      (payload) => {
        // تحديث فوري - استدعاء مباشر
        callback(payload.new as Conversation);
      },
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
  closedReason: string = "تم قبول عرض آخر على هذا الطلب",
): Promise<{ closedCount: number; systemMessagesSent: number }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { closedCount: 0, systemMessagesSent: 0 };

    // جلب جميع المحادثات المرتبطة بالطلب
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("request_id", requestId)
      .neq("is_closed", true);

    if (error) {
      logger.error("خطأ في جلب المحادثات:", error, "service");
      return { closedCount: 0, systemMessagesSent: 0 };
    }

    // تصفية المحادثات باستثناء العرض المقبول
    const conversationsToClose = (conversations || []).filter(
      (conv) => conv.offer_id !== excludeOfferId,
    );

    let closedCount = 0;
    let systemMessagesSent = 0;

    for (const conv of conversationsToClose) {
      // إغلاق المحادثة
      const { error: closeError } = await supabase
        .from("conversations")
        .update({
          is_closed: true,
          closed_reason: closedReason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conv.id);

      if (!closeError) {
        closedCount++;

        // إرسال رسالة نظام لطيفة
        const systemMessage = await sendSystemMessage(
          conv.id,
          "🔔 تم إغلاق هذه المحادثة - تم قبول عرض آخر على هذا الطلب. شكراً لاهتمامك!",
        );
        if (systemMessage) systemMessagesSent++;
      }
    }

    return { closedCount, systemMessagesSent };
  } catch (error) {
    logger.error("خطأ في إغلاق المحادثات:", error, "service");
    return { closedCount: 0, systemMessagesSent: 0 };
  }
}

/**
 * إرسال رسالة نظام في محادثة
 */
export async function sendSystemMessage(
  conversationId: string,
  content: string,
): Promise<Message | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // إرسال الرسالة باسم النظام (نستخدم معرف المستخدم الحالي مع علامة خاصة في المحتوى)
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      logger.error("خطأ في إرسال رسالة النظام:", error, "service");
      return null;
    }

    // تحديث آخر رسالة في المحادثة
    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content.substring(0, 100),
      })
      .eq("id", conversationId);

    return data as Message;
  } catch (error) {
    logger.error("خطأ في إرسال رسالة النظام:", error, "service");
    return null;
  }
}

/**
 * التحقق مما إذا كانت المحادثة مغلقة
 */
export async function isConversationClosed(
  conversationId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("is_closed")
      .eq("id", conversationId)
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
export async function getConversationClosedReason(
  conversationId: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("closed_reason")
      .eq("id", conversationId)
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
  const extension = originalName.split(".").pop() || "file";
  return `${prefix}/${timestamp}-${randomString}.${extension}`;
}

/**
 * Upload a file attachment for messages
 */
export async function uploadMessageAttachment(
  file: File,
  conversationId: string,
): Promise<MessageAttachment | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const filePath = generateFileName(
      file.name,
      `${conversationId}/${user.id}`,
    );

    const { data, error } = await supabase.storage
      .from(MESSAGE_ATTACHMENTS_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      logger.error("Upload error:", error, "service");
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(MESSAGE_ATTACHMENTS_BUCKET)
      .getPublicUrl(data.path);

    // Determine file type
    let fileType: MessageAttachment["file_type"] = "document";
    if (file.type.startsWith("image/")) {
      fileType = "image";
    } else if (file.type.startsWith("video/")) {
      fileType = "video";
    } else if (file.type.startsWith("audio/")) {
      fileType = "audio";
    }

    return {
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: fileType,
      file_size: file.size,
    };
  } catch (error) {
    logger.error("Error uploading attachment:", error, "service");
    return null;
  }
}

/**
 * Upload multiple file attachments
 */
export async function uploadMessageAttachments(
  files: File[],
  conversationId: string,
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
  duration: number,
): Promise<{ url: string; duration: number } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const timestamp = Date.now();
    const filePath = `${conversationId}/${user.id}/${timestamp}.webm`;

    const { data, error } = await supabase.storage
      .from(VOICE_MESSAGES_BUCKET)
      .upload(filePath, audioBlob, {
        cacheControl: "3600",
        contentType: "audio/webm",
        upsert: false,
      });

    if (error) {
      logger.error("Voice upload error:", error, "service");
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
    logger.error("Error uploading voice message:", error, "service");
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
      .from("conversations")
      .select("id")
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

    if (convError || !conversations || conversations.length === 0) return 0;

    const conversationIds = conversations.map((c) => c.id);

    // Count unread messages across all conversations
    const { count, error: countError } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .eq("is_read", false)
      .neq("sender_id", user.id);

    if (countError) return 0;
    return count || 0;
  } catch (error) {
    logger.error("Error getting unread count:", error, "service");
    return 0;
  }
}

/**
 * Subscribe to unread messages count changes - فوري ومباشر
 */
export function subscribeToUnreadCount(
  userId: string,
  callback: (count: number) => void,
) {
  // Initial count
  getTotalUnreadMessagesCount().then(callback);

  // Subscribe to message changes - تحديث فوري عند أي تغيير
  const channel = supabase
    .channel(`unread-messages:${userId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: userId },
      },
    })
    .on(
      "postgres_changes",
      {
        event: "*", // INSERT, UPDATE, DELETE
        schema: "public",
        table: "messages",
        filter: `sender_id=neq.${userId}`, // فقط الرسائل من الآخرين
      },
      async () => {
        // تحديث فوري - لا تأخير
        const count = await getTotalUnreadMessagesCount();
        callback(count);
      },
    )
    // أيضاً اشتراك على conversations للتحديثات - participant1_id
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "conversations",
        filter: `participant1_id=eq.${userId}`,
      },
      async () => {
        // تحديث فوري عند تحديث المحادثة
        const count = await getTotalUnreadMessagesCount();
        callback(count);
      },
    )
    // اشتراك على conversations - participant2_id
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "conversations",
        filter: `participant2_id=eq.${userId}`,
      },
      async () => {
        // تحديث فوري عند تحديث المحادثة
        const count = await getTotalUnreadMessagesCount();
        callback(count);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to unread messages for requests and offers - تحديث فوري للـ badges
 */
export function subscribeToUnreadMessagesForRequestsAndOffers(
  userId: string,
  requestIds: string[],
  offerIds: string[],
  onUpdate: (data: {
    unreadForRequests: number;
    unreadForOffers: number;
    unreadPerRequest: Map<string, number>;
    unreadPerOffer: Map<string, number>;
  }) => void,
) {
  // حساب أولي
  const calculateAndUpdate = async () => {
    const [requestsCount, offersCount, perRequestMap, perOfferMap] =
      await Promise.all([
        requestIds.length > 0
          ? getUnreadMessagesForMyRequests(requestIds)
          : Promise.resolve(0),
        offerIds.length > 0
          ? getUnreadMessagesForMyOffers(offerIds)
          : Promise.resolve(0),
        requestIds.length > 0
          ? getUnreadMessagesPerRequest(requestIds)
          : Promise.resolve(new Map()),
        offerIds.length > 0
          ? getUnreadMessagesPerOffer(offerIds)
          : Promise.resolve(new Map()),
      ]);

    onUpdate({
      unreadForRequests: requestsCount,
      unreadForOffers: offersCount,
      unreadPerRequest: perRequestMap,
      unreadPerOffer: perOfferMap,
    });
  };

  calculateAndUpdate();

  // اشتراك فوري على messages table - أي تغيير يحدث تحديث فوري
  const messagesChannel = supabase
    .channel(`unread-for-user-items:${userId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: userId },
      },
    })
    .on(
      "postgres_changes",
      {
        event: "*", // INSERT, UPDATE, DELETE
        schema: "public",
        table: "messages",
        filter: `sender_id=neq.${userId}`, // فقط رسائل الآخرين
      },
      async () => {
        // تحديث فوري - لا تأخير
        calculateAndUpdate();
      },
    )
    // اشتراك على conversations - participant1_id
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `participant1_id=eq.${userId}`,
      },
      async () => {
        // تحديث فوري عند أي تغيير في المحادثات
        calculateAndUpdate();
      },
    )
    // اشتراك على conversations - participant2_id
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `participant2_id=eq.${userId}`,
      },
      async () => {
        // تحديث فوري عند أي تغيير في المحادثات
        calculateAndUpdate();
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(messagesChannel);
  };
}

/**
 * Get unread messages count for user's requests
 * Counts messages in conversations linked to user's requests
 */
export async function getUnreadMessagesForMyRequests(
  userRequestIds: string[],
): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !userRequestIds || userRequestIds.length === 0) return 0;

    // Get conversations linked to user's requests
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .in("request_id", userRequestIds)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

    if (convError || !conversations || conversations.length === 0) return 0;

    const conversationIds = conversations.map((c) => c.id);

    // Count unread messages in these conversations
    const { count, error: countError } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .eq("is_read", false)
      .neq("sender_id", user.id);

    if (countError) return 0;
    return count || 0;
  } catch (error) {
    logger.error(
      "Error getting unread messages for my requests:",
      error,
      "service",
    );
    return 0;
  }
}

/**
 * Get unread messages count for user's offers
 * Counts messages in conversations linked to user's offers
 */
export async function getUnreadMessagesForMyOffers(
  userOfferIds: string[],
): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !userOfferIds || userOfferIds.length === 0) return 0;

    // Get conversations linked to user's offers
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .in("offer_id", userOfferIds)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

    if (convError || !conversations || conversations.length === 0) return 0;

    const conversationIds = conversations.map((c) => c.id);

    // Count unread messages in these conversations
    const { count, error: countError } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .eq("is_read", false)
      .neq("sender_id", user.id);

    if (countError) return 0;
    return count || 0;
  } catch (error) {
    logger.error(
      "Error getting unread messages for my offers:",
      error,
      "service",
    );
    return 0;
  }
}

/**
 * Get unread messages count per request ID
 * Returns a map of requestId -> unread count
 */
export async function getUnreadMessagesPerRequest(
  userRequestIds: string[],
): Promise<Map<string, number>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !userRequestIds || userRequestIds.length === 0) {
      return new Map();
    }

    // Get conversations linked to user's requests with request_id
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("id, request_id")
      .in("request_id", userRequestIds)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

    if (convError || !conversations || conversations.length === 0) {
      return new Map();
    }

    const conversationIds = conversations.map((c) => c.id);
    const requestIdToConvIds = new Map<string, string[]>();
    conversations.forEach((conv) => {
      if (conv.request_id) {
        const existing = requestIdToConvIds.get(conv.request_id) || [];
        existing.push(conv.id);
        requestIdToConvIds.set(conv.request_id, existing);
      }
    });

    // Get unread messages per conversation
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", conversationIds)
      .eq("is_read", false)
      .neq("sender_id", user.id);

    if (messagesError) return new Map();

    // Count messages per request
    const result = new Map<string, number>();
    requestIdToConvIds.forEach((convIds, requestId) => {
      const count = (messages || []).filter((m) =>
        convIds.includes(m.conversation_id)
      ).length;
      if (count > 0) {
        result.set(requestId, count);
      }
    });

    return result;
  } catch (error) {
    logger.error(
      "Error getting unread messages per request:",
      error,
      "service",
    );
    return new Map();
  }
}

/**
 * Get unread messages count per offer ID
 * Returns a map of offerId -> unread count
 */
export async function getUnreadMessagesPerOffer(
  userOfferIds: string[],
): Promise<Map<string, number>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !userOfferIds || userOfferIds.length === 0) return new Map();

    // Get conversations linked to user's offers with offer_id
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("id, offer_id")
      .in("offer_id", userOfferIds)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

    if (convError || !conversations || conversations.length === 0) {
      return new Map();
    }

    const conversationIds = conversations.map((c) => c.id);
    const offerIdToConvIds = new Map<string, string[]>();
    conversations.forEach((conv) => {
      if (conv.offer_id) {
        const existing = offerIdToConvIds.get(conv.offer_id) || [];
        existing.push(conv.id);
        offerIdToConvIds.set(conv.offer_id, existing);
      }
    });

    // Get unread messages per conversation
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", conversationIds)
      .eq("is_read", false)
      .neq("sender_id", user.id);

    if (messagesError) return new Map();

    // Count messages per offer
    const result = new Map<string, number>();
    offerIdToConvIds.forEach((convIds, offerId) => {
      const count = (messages || []).filter((m) =>
        convIds.includes(m.conversation_id)
      ).length;
      if (count > 0) {
        result.set(offerId, count);
      }
    });

    return result;
  } catch (error) {
    logger.error("Error getting unread messages per offer:", error, "service");
    return new Map();
  }
}

/**
 * Get unread messages count for a specific conversation (request_id + offer_id)
 * Returns the number of unread messages for the current user in this conversation
 */
export async function getUnreadCountForConversation(
  requestId: string,
  offerId?: string,
): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // Find the conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .eq("request_id", requestId)
      .eq("offer_id", offerId || null)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .maybeSingle();

    if (convError || !conversation) return 0;

    // Count unread messages in this conversation
    const { count, error: countError } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversation.id)
      .eq("is_read", false)
      .neq("sender_id", user.id);

    if (countError) return 0;
    return count || 0;
  } catch (error) {
    logger.error(
      "Error getting unread count for conversation:",
      error,
      "service",
    );
    return 0;
  }
}

// ==========================================
// Push Notifications Helper
// ==========================================

export async function sendPushNotificationForNewMessage(params: {
  conversationId: string;
  messageContent: string;
  recipientId: string;
  senderName: string;
  requestTitle?: string;
  authorId: string;
}): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "send-push-notification",
      {
        body: {
          notificationType: "new_message",
          requestId: params.conversationId, // Using conv ID as requestId for context
          requestTitle: params.requestTitle || "محادثة",
          messageContent: params.messageContent,
          recipientId: params.recipientId,
          senderName: params.senderName,
          authorId: params.authorId,
        },
      },
    );

    if (error) {
      logger.warn("Edge Function error (message push):", error);
      return;
    }

    logger.log("📱 Message push notification sent:", data);
  } catch (err) {
    logger.warn("Failed to call send-push-notification for message:", err);
  }
}
