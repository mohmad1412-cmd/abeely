import { supabase } from './supabaseClient';

// ==========================================
// Request Views Service
// ==========================================
// يتتبع قراءة المستخدمين للطلبات

/**
 * Mark a request as viewed (when user opens RequestDetail)
 */
export async function markRequestAsViewed(requestId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('mark_request_viewed', {
      request_id_param: requestId,
    });

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('Error marking request as viewed:', error);
    return false;
  }
}

/**
 * Mark a request as read (when user fully reads it)
 */
export async function markRequestAsRead(requestId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('mark_request_read', {
      request_id_param: requestId,
    });

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('Error marking request as read:', error);
    return false;
  }
}

/**
 * Get count of unread requests in user's interests
 */
export async function getUnreadInterestsCount(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_unread_interests_count');

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error getting unread interests count:', error);
    return 0;
  }
}

/**
 * Check if a request is read by current user
 */
export async function isRequestRead(requestId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('request_views')
      .select('is_read')
      .eq('user_id', user.id)
      .eq('request_id', requestId)
      .single();

    if (error || !data) return false;
    return data.is_read === true;
  } catch (error) {
    console.error('Error checking if request is read:', error);
    return false;
  }
}

/**
 * Get all unread request IDs for current user
 */
export async function getUnreadRequestIds(): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('request_views')
      .select('request_id')
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    return (data || []).map(r => r.request_id);
  } catch (error) {
    console.error('Error getting unread request IDs:', error);
    return [];
  }
}

