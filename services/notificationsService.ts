import { supabase } from "./supabaseClient.ts";
import { AppNotification } from "../types.ts";
import { logger } from "../utils/logger.ts";

// ==========================================
// Type Definitions for Database Tables
// ==========================================

/**
 * نوع الإشعار في قاعدة البيانات
 */
interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link_to?: string | null;
  related_request_id?: string | null;
  related_offer_id?: string | null;
  related_message_id?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  data?: Record<string, unknown> | null;
}

/**
 * نوع الطلب المختصر
 */
interface RequestRow {
  id: string;
  title: string;
  author_id?: string | null;
}

/**
 * نوع العرض المختصر
 */
interface OfferRow {
  id: string;
  title: string;
  provider_name: string;
  status: string;
}

/**
 * نوع الرسالة المختصرة
 */
interface MessageRow {
  id: string;
  content: string;
  sender_id?: string | null;
}

/**
 * نوع الملف الشخصي المختصر
 */
interface ProfileRow {
  id: string;
  display_name?: string | null;
}

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

    // Type assertion for notifications data
    const notifications = (notificationsData || []) as NotificationRow[];

    // Collect related IDs
    const requestIds = [
      ...new Set(
        notifications.map((n) => n.related_request_id).filter(
          (id): id is string => Boolean(id),
        ),
      ),
    ];
    const offerIds = [
      ...new Set(
        notifications.map((n) => n.related_offer_id).filter(
          (id): id is string => Boolean(id),
        ),
      ),
    ];
    const messageIds = [
      ...new Set(
        notifications.map((n) => n.related_message_id).filter(
          (id): id is string => Boolean(id),
        ),
      ),
    ];

    // Fetch related data separately
    const requestsMap: Record<string, RequestRow> = {};
    const offersMap: Record<string, OfferRow> = {};
    const messagesMap: Record<string, MessageRow> = {};
    const profilesMap: Record<string, ProfileRow> = {};

    if (requestIds.length > 0) {
      const { data: requests } = await supabase
        .from("requests")
        .select("id, title, author_id")
        .in("id", requestIds);

      const requestRows = (requests || []) as RequestRow[];
      requestRows.forEach((r) => {
        requestsMap[r.id] = r;
      });

      // Fetch author profiles
      const authorIds = [
        ...new Set(
          requestRows.map((r) => r.author_id).filter(
            (id): id is string => Boolean(id),
          ),
        ),
      ];
      if (authorIds.length > 0) {
        const { data: authors } = await supabase.from("profiles").select(
          "id, display_name",
        ).in("id", authorIds);

        const authorRows = (authors || []) as ProfileRow[];
        authorRows.forEach((p) => {
          profilesMap[p.id] = p;
        });
      }
    }

    if (offerIds.length > 0) {
      const { data: offers } = await supabase
        .from("offers")
        .select("id, title, provider_name, status")
        .in("id", offerIds);

      const offerRows = (offers || []) as OfferRow[];
      offerRows.forEach((o) => {
        offersMap[o.id] = o;
      });
    }

    if (messageIds.length > 0) {
      const { data: messages } = await supabase
        .from("messages")
        .select("id, content, sender_id")
        .in("id", messageIds);

      const messageRows = (messages || []) as MessageRow[];
      messageRows.forEach((m) => {
        messagesMap[m.id] = m;
      });

      // Fetch sender profiles
      const senderIds = [
        ...new Set(
          messageRows.map((m) => m.sender_id).filter(
            (id): id is string => Boolean(id),
          ),
        ),
      ];
      if (senderIds.length > 0) {
        const { data: senders } = await supabase.from("profiles").select(
          "id, display_name",
        ).in("id", senderIds);

        const senderRows = (senders || []) as ProfileRow[];
        senderRows.forEach((p) => {
          profilesMap[p.id] = p;
        });
      }
    }

    // Transform data and filter out notifications with archived/deleted offers
    const transformedData = notifications.map((n) => {
      const request = n.related_request_id
        ? requestsMap[n.related_request_id]
        : null;
      const offer = n.related_offer_id ? offersMap[n.related_offer_id] : null;
      const message = n.related_message_id
        ? messagesMap[n.related_message_id]
        : null;

      // استثناء الإشعارات المرتبطة بعروض مؤرشفة أو محذوفة
      if (n.related_offer_id && !offer) {
        return null; // العرض مؤرشف أو محذوف
      }

      return {
        ...n,
        related_request: request
          ? {
            ...request,
            author: request.author_id ? profilesMap[request.author_id] : null,
          }
          : null,
        related_offer: offer || null,
        related_message: message
          ? {
            ...message,
            sender: message.sender_id ? profilesMap[message.sender_id] : null,
          }
          : null,
      };
    }).filter((n): n is NonNullable<typeof n> => n !== null);

    return transformedData.map((n) => ({
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
      } as Record<string, unknown>)
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
      } as Record<string, unknown>)
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
    const notificationData: Record<string, unknown> = {
      user_id: userId,
      type,
      title,
      message,
      link_to: linkTo || null,
      related_request_id: relatedRequestId || null,
      related_offer_id: relatedOfferId || null,
    };

    const { error } = await supabase
      .from("notifications")
      .insert(notificationData);

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
        const n = payload.new as NotificationRow;

        // Fetch notification data without foreign key joins
        const { data: notifData } = await supabase
          .from("notifications")
          .select("*")
          .eq("id", n.id)
          .single();

        if (!notifData) return;

        const notif = notifData as NotificationRow;

        // Fetch related data if needed
        let relatedRequest: AppNotification["relatedRequest"] = undefined;
        let relatedOffer: AppNotification["relatedOffer"] = undefined;
        let relatedMessage: AppNotification["relatedMessage"] = undefined;

        if (notif.related_request_id) {
          const { data: req } = await supabase.from("requests").select(
            "id, title, author_id",
          ).eq("id", notif.related_request_id).single();

          if (req) {
            const reqRow = req as RequestRow;
            let authorName: string | undefined;
            if (reqRow.author_id) {
              const { data: author } = await supabase.from("profiles").select(
                "display_name",
              ).eq("id", reqRow.author_id).single();
              const authorProfile = author as ProfileRow | null;
              authorName = authorProfile?.display_name || undefined;
            }
            relatedRequest = { id: reqRow.id, title: reqRow.title, authorName };
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
            const offerRow = offer as OfferRow;
            relatedOffer = {
              id: offerRow.id,
              title: offerRow.title,
              providerName: offerRow.provider_name,
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
            const msgRow = msg as MessageRow;
            let senderName = "مستخدم";
            if (msgRow.sender_id) {
              const { data: sender } = await supabase.from("profiles").select(
                "display_name",
              ).eq("id", msgRow.sender_id).single();
              const senderProfile = sender as ProfileRow | null;
              senderName = senderProfile?.display_name || "مستخدم";
            }
            relatedMessage = {
              id: msgRow.id,
              senderName,
              preview: msgRow.content.substring(0, 50) +
                (msgRow.content.length > 50 ? "..." : ""),
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
        const n = payload.new as NotificationRow;

        // Fetch notification data without foreign key joins
        const { data: notifData } = await supabase
          .from("notifications")
          .select("*")
          .eq("id", n.id)
          .single();

        if (!notifData) return;

        const notif = notifData as NotificationRow;

        // Fetch related data if needed
        let relatedRequest: AppNotification["relatedRequest"] = undefined;
        let relatedOffer: AppNotification["relatedOffer"] = undefined;
        let relatedMessage: AppNotification["relatedMessage"] = undefined;

        if (notif.related_request_id) {
          const { data: req } = await supabase.from("requests").select(
            "id, title, author_id",
          ).eq("id", notif.related_request_id).single();

          if (req) {
            const reqRow = req as RequestRow;
            let authorName: string | undefined;
            if (reqRow.author_id) {
              const { data: author } = await supabase.from("profiles").select(
                "display_name",
              ).eq("id", reqRow.author_id).single();
              const authorProfile = author as ProfileRow | null;
              authorName = authorProfile?.display_name || undefined;
            }
            relatedRequest = { id: reqRow.id, title: reqRow.title, authorName };
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
            const offerRow = offer as OfferRow;
            relatedOffer = {
              id: offerRow.id,
              title: offerRow.title,
              providerName: offerRow.provider_name,
            };
          }
        }

        if (notif.related_message_id) {
          const { data: msg } = await supabase.from("messages").select(
            "id, content, sender_id",
          ).eq("id", notif.related_message_id).single();

          if (msg) {
            const msgRow = msg as MessageRow;
            let senderName = "مستخدم";
            if (msgRow.sender_id) {
              const { data: sender } = await supabase.from("profiles").select(
                "display_name",
              ).eq("id", msgRow.sender_id).single();
              const senderProfile = sender as ProfileRow | null;
              senderName = senderProfile?.display_name || "مستخدم";
            }
            relatedMessage = {
              id: msgRow.id,
              senderName,
              preview: msgRow.content.substring(0, 50) +
                (msgRow.content.length > 50 ? "..." : ""),
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
