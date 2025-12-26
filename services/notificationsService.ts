import { supabase } from './supabaseClient';
import { Notification } from '../types';

// ==========================================
// Notifications
// ==========================================

/**
 * Get all notifications for current user
 */
export async function getNotifications(limit = 50): Promise<Notification[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        related_request:requests!notifications_related_request_id_fkey(
          id,
          title,
          author_id,
          author:profiles!requests_author_id_fkey(display_name)
        ),
        related_offer:offers!notifications_related_offer_id_fkey(
          id,
          title,
          provider_name
        ),
        related_message:messages!notifications_related_message_id_fkey(
          id,
          content,
          sender_id,
          sender:profiles!messages_sender_id_fkey(display_name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((n: any) => ({
      id: n.id,
      type: n.type as Notification['type'],
      title: n.title,
      message: n.message,
      timestamp: new Date(n.created_at),
      isRead: n.is_read,
      linkTo: n.link_to || undefined,
      relatedRequest: n.related_request ? {
        id: n.related_request.id,
        title: n.related_request.title,
        authorName: n.related_request.author?.display_name || undefined,
      } : undefined,
      relatedOffer: n.related_offer ? {
        id: n.related_offer.id,
        title: n.related_offer.title,
        providerName: n.related_offer.provider_name,
      } : undefined,
      relatedMessage: n.related_message ? {
        id: n.related_message.id,
        senderName: n.related_message.sender?.display_name || 'مستخدم',
        preview: n.related_message.content.substring(0, 50) + (n.related_message.content.length > 50 ? '...' : ''),
      } : undefined,
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
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
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
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
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
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
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return false;
  }
}

/**
 * Create a notification (for admin/system use)
 */
export async function createNotification(
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  linkTo?: string,
  relatedRequestId?: string,
  relatedOfferId?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
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
    console.error('Error creating notification:', error);
    return false;
  }
}

// ==========================================
// Realtime Subscriptions
// ==========================================

/**
 * Subscribe to new notifications
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        const n = payload.new;
        
        // Fetch full notification with related data
        const { data: fullNotification } = await supabase
          .from('notifications')
          .select(`
            *,
            related_request:requests!notifications_related_request_id_fkey(
              id,
              title,
              author_id,
              author:profiles!requests_author_id_fkey(display_name)
            ),
            related_offer:offers!notifications_related_offer_id_fkey(
              id,
              title,
              provider_name
            ),
            related_message:messages!notifications_related_message_id_fkey(
              id,
              content,
              sender_id,
              sender:profiles!messages_sender_id_fkey(display_name)
            )
          `)
          .eq('id', n.id)
          .single();

        if (fullNotification) {
          callback({
            id: fullNotification.id,
            type: fullNotification.type as Notification['type'],
            title: fullNotification.title,
            message: fullNotification.message,
            timestamp: new Date(fullNotification.created_at),
            isRead: fullNotification.is_read,
            linkTo: fullNotification.link_to || undefined,
            relatedRequest: fullNotification.related_request ? {
              id: fullNotification.related_request.id,
              title: fullNotification.related_request.title,
              authorName: fullNotification.related_request.author?.display_name || undefined,
            } : undefined,
            relatedOffer: fullNotification.related_offer ? {
              id: fullNotification.related_offer.id,
              title: fullNotification.related_offer.title,
              providerName: fullNotification.related_offer.provider_name,
            } : undefined,
            relatedMessage: fullNotification.related_message ? {
              id: fullNotification.related_message.id,
              senderName: fullNotification.related_message.sender?.display_name || 'مستخدم',
              preview: fullNotification.related_message.content.substring(0, 50) + (fullNotification.related_message.content.length > 50 ? '...' : ''),
            } : undefined,
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

