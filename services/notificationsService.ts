import { supabase } from "./supabaseClient.ts";
import { AppNotification } from "../types.ts";
import { logger } from "../utils/logger.ts";

// ==========================================
// Notifications
// ==========================================

/**
 * Get all notifications for current user
 */
export async function getNotifications(limit = 50): Promise<AppNotification[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Fetch notifications without explicit foreign key joins to avoid PGRST200 errors
    const { data: notificationsData, error: notificationsError } =
      await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (notificationsError) throw notificationsError;

    // Collect related IDs
    const requestIds = [
      ...new Set(
        (notificationsData || []).map((n) => n.related_request_id).filter(
          Boolean,
        ),
      ),
    ];
    const offerIds = [
      ...new Set(
        (notificationsData || []).map((n) => n.related_offer_id).filter(
          Boolean,
        ),
      ),
    ];
    const messageIds = [
      ...new Set(
        (notificationsData || []).map((n) => n.related_message_id).filter(
          Boolean,
        ),
      ),
    ];

    // Fetch related data separately
    const requestsMap: Record<string, any> = {};
    const offersMap: Record<string, any> = {};
    const messagesMap: Record<string, any> = {};
    const profilesMap: Record<string, any> = {};

    if (requestIds.length > 0) {
      const { data: requests } = await supabase
        .from("requests")
        .select("id, title, author_id")
        .in("id", requestIds);
      (requests || []).forEach((r) => {
        requestsMap[r.id] = r;
      });

      // Fetch author profiles
      const authorIds = [
        ...new Set((requests || []).map((r) => r.author_id).filter(Boolean)),
      ];
      if (authorIds.length > 0) {
        const { data: authors } = await supabase.from("profiles").select(
          "id, display_name",
        ).in("id", authorIds);
        (authors || []).forEach((p) => {
          profilesMap[p.id] = p;
        });
      }
    }

    if (offerIds.length > 0) {
      const { data: offers } = await supabase
        .from("offers")
        .select("id, title, provider_name, status")
        .in("id", offerIds);
      (offers || []).forEach((o) => {
        offersMap[o.id] = o;
      });
    }

    if (messageIds.length > 0) {
      const { data: messages } = await supabase
        .from("messages")
        .select("id, content, sender_id")
        .in("id", messageIds);
      (messages || []).forEach((m) => {
        messagesMap[m.id] = m;
      });

      // Fetch sender profiles
      const senderIds = [
        ...new Set((messages || []).map((m) => m.sender_id).filter(Boolean)),
      ];
      if (senderIds.length > 0) {
        const { data: senders } = await supabase.from("profiles").select(
          "id, display_name",
        ).in("id", senderIds);
        (senders || []).forEach((p) => {
          profilesMap[p.id] = p;
        });
      }
    }

    // Transform data and filter out notifications with archived/deleted offers
    const data = (notificationsData || []).map((n) => {
      const request = requestsMap[n.related_request_id];
      const offer = offersMap[n.related_offer_id];
      const message = messagesMap[n.related_message_id];

      // استثناء الإشعارات المرتبطة بعروض مؤرشفة أو محذوفة
      if (n.related_offer_id && !offer) {
        return null; // العرض مؤرشف أو محذوف
      }

      return {
        ...n,
        related_request: request
          ? {
            ...request,
            author: profilesMap[request.author_id] || null,
          }
          : null,
        related_offer: offer || null,
        related_message: message
          ? {
            ...message,
            sender: profilesMap[message.sender_id] || null,
          }
          : null,
      };
    }).filter(Boolean); // إزالة القيم null

    return (data || []).map((n: any) => ({
      id: n.id,
      type: n.type as AppNotification["type"],
      title: n.title,
      message: n.message,
      timestamp: new Date(n.created_at),
      isRead: n.is_read,
      linkTo: n.link_to || undefined,
      relatedRequest: n.related_request
        ? {
          id: n.related_request.id,
          title: n.related_request.title,
          authorName: n.related_request.author?.display_name || undefined,
        }
        : undefined,
      relatedOffer: n.related_offer
        ? {
          id: n.related_offer.id,
          title: n.related_offer.title,
          providerName: n.related_offer.provider_name,
        }
        : undefined,
      relatedMessage: n.related_message
        ? {
          id: n.related_message.id,
          senderName: n.related_message.sender?.display_name || "مستخدم",
          preview: n.related_message.content.substring(0, 50) +
            (n.related_message.content.length > 50 ? "..." : ""),
        }
        : undefined,
    }));
  } catch (error) {
    logger.error("Error fetching notifications", error, "notificationsService");
    return [];
  }
}

/**
 * Get unread notifications count
 */
export async function getUnreadNotificationsCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    logger.error("Error getting unread count", error, "notificationsService");
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) throw error;

    return true;
  } catch (error) {
    logger.error(
      "Error marking notification as read",
      error,
      "notificationsService",
    );
    return false;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) throw error;

    return true;
  } catch (error) {
    logger.error(
      "Error marking all notifications as read",
      error,
      "notificationsService",
    );
    return false;
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(
  notificationId: string,
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) throw error;

    return true;
  } catch (error) {
    logger.error("Error deleting notification", error, "notificationsService");
    return false;
  }
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);

    if (error) throw error;

    return true;
  } catch (error) {
    logger.error("Error clearing notifications", error, "notificationsService");
    return false;
  }
}

/**
 * Create a notification (for admin/system use)
 */
export async function createNotification(
  userId: string,
  type: AppNotification["type"],
  title: string,
  message: string,
  linkTo?: string,
  relatedRequestId?: string,
  relatedOfferId?: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        message,
        link_to: linkTo || null,
        related_request_id: relatedRequestId || null,
        related_offer_id: relatedOfferId || null,
      });

    if (error) throw error;

    return true;
  } catch (error) {
    logger.error("Error creating notification", error, "notificationsService");
    return false;
  }
}

// ==========================================
// Realtime Subscriptions
// ==========================================

/**
 * Subscribe to new notifications and updates
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: AppNotification) => void,
  onUpdate?: (notification: AppNotification) => void,
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        const n = payload.new as any;

        // Fetch notification data without foreign key joins
        const { data: notif } = await supabase
          .from("notifications")
          .select("*")
          .eq("id", n.id)
          .single();

        if (!notif) return;

        // Fetch related data if needed
        let relatedRequest: any = undefined;
        let relatedOffer: any = undefined;
        let relatedMessage: any = undefined;

        if (notif.related_request_id) {
          const { data: req } = await supabase.from("requests").select(
            "id, title, author_id",
          ).eq("id", notif.related_request_id).single();
          if (req) {
            let authorName: string | undefined;
            if (req.author_id) {
              const { data: author } = await supabase.from("profiles").select(
                "display_name",
              ).eq("id", req.author_id).single();
              authorName = author?.display_name || undefined;
            }
            relatedRequest = { id: req.id, title: req.title, authorName };
          }
        }

        if (notif.related_offer_id) {
          const { data: offer } = await supabase
            .from("offers")
            .select("id, title, provider_name, status")
            .eq("id", notif.related_offer_id)
            .neq("status", "archived") // استثناء العروض المؤرشفة
            .single();
          if (offer) {
            relatedOffer = {
              id: offer.id,
              title: offer.title,
              providerName: offer.provider_name,
            };
          } else {
            // العرض مؤرشف أو محذوف، لا نرسل الإشعار
            return;
          }
        }

        if (notif.related_message_id) {
          const { data: msg } = await supabase.from("messages").select(
            "id, content, sender_id",
          ).eq("id", notif.related_message_id).single();
          if (msg) {
            let senderName = "مستخدم";
            if (msg.sender_id) {
              const { data: sender } = await supabase.from("profiles").select(
                "display_name",
              ).eq("id", msg.sender_id).single();
              senderName = sender?.display_name || "مستخدم";
            }
            relatedMessage = {
              id: msg.id,
              senderName,
              preview: msg.content.substring(0, 50) +
                (msg.content.length > 50 ? "..." : ""),
            };
          }
        }

        callback({
          id: notif.id,
          type: notif.type as AppNotification["type"],
          title: notif.title,
          message: notif.message,
          timestamp: new Date(notif.created_at),
          isRead: notif.is_read,
          linkTo: notif.link_to || undefined,
          relatedRequest,
          relatedOffer,
          relatedMessage,
        });
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        const n = payload.new as any;

        // Fetch notification data without foreign key joins
        const { data: notif } = await supabase
          .from("notifications")
          .select("*")
          .eq("id", n.id)
          .single();

        if (!notif) return;

        // Fetch related data if needed
        let relatedRequest: any = undefined;
        let relatedOffer: any = undefined;
        let relatedMessage: any = undefined;

        if (notif.related_request_id) {
          const { data: req } = await supabase.from("requests").select(
            "id, title, author_id",
          ).eq("id", notif.related_request_id).single();
          if (req) {
            let authorName: string | undefined;
            if (req.author_id) {
              const { data: author } = await supabase.from("profiles").select(
                "display_name",
              ).eq("id", req.author_id).single();
              authorName = author?.display_name || undefined;
            }
            relatedRequest = { id: req.id, title: req.title, authorName };
          }
        }

        if (notif.related_offer_id) {
          const { data: offer } = await supabase
            .from("offers")
            .select("id, title, provider_name, status")
            .eq("id", notif.related_offer_id)
            .neq("status", "archived")
            .single();
          if (offer) {
            relatedOffer = {
              id: offer.id,
              title: offer.title,
              providerName: offer.provider_name,
            };
          }
        }

        if (notif.related_message_id) {
          const { data: msg } = await supabase.from("messages").select(
            "id, content, sender_id",
          ).eq("id", notif.related_message_id).single();
          if (msg) {
            let senderName = "مستخدم";
            if (msg.sender_id) {
              const { data: sender } = await supabase.from("profiles").select(
                "display_name",
              ).eq("id", msg.sender_id).single();
              senderName = sender?.display_name || "مستخدم";
            }
            relatedMessage = {
              id: msg.id,
              senderName,
              preview: msg.content.substring(0, 50) +
                (msg.content.length > 50 ? "..." : ""),
            };
          }
        }

        // إرسال الإشعار المحدث (خاصة عند تغيير is_read)
        const updatedNotification: AppNotification = {
          id: notif.id,
          type: notif.type as AppNotification["type"],
          title: notif.title,
          message: notif.message,
          timestamp: new Date(notif.created_at),
          isRead: notif.is_read,
          linkTo: notif.link_to || undefined,
          relatedRequest,
          relatedOffer,
          relatedMessage,
        };

        // استدعاء callback التحديث إذا كان موجوداً
        if (onUpdate) {
          onUpdate(updatedNotification);
        } else {
          // إذا لم يكن هناك callback منفصل، استخدم نفس callback
          callback(updatedNotification);
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
