import { supabase } from './supabaseClient.ts';

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
    return (data || []).map((r: { request_id: string }) => r.request_id);
  } catch (error) {
    console.error('Error getting unread request IDs:', error);
    return [];
  }
}

/**
 * Get all viewed request IDs for current user (requests they actually opened and read)
 * Returns set of request IDs that the user has read (is_read = true)
 * Note: Green dot indicator depends on this - it only disappears when request is actually opened
 */
export async function getViewedRequestIds(): Promise<Set<string>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Set();

    const { data, error } = await supabase
      .from('request_views')
      .select('request_id')
      .eq('user_id', user.id)
      .eq('is_read', true); // Only requests that were actually opened (read)

    if (error) throw error;
    return new Set((data || []).map((r: { request_id: string }) => r.request_id));
  } catch (error) {
    console.error('Error getting viewed request IDs:', error);
    return new Set();
  }
}

/**
 * Subscribe to request views changes for real-time updates
 */
export function subscribeToViewedRequests(
  userId: string,
  onUpdate: (viewedIds: Set<string>) => void
) {
  const channel = supabase
    .channel(`request_views_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'request_views',
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        // Refetch all viewed requests on any change
        const viewedIds = await getViewedRequestIds();
        onUpdate(viewedIds);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ==========================================
// View Count System (للجميع - مسجلين وزوار)
// ==========================================

/**
 * Generate or get session ID for tracking views
 */
function getOrCreateSessionId(): string {
  const STORAGE_KEY = 'abeely_session_id';
  let sessionId = localStorage.getItem(STORAGE_KEY);
  
  if (!sessionId) {
    // Generate a unique session ID
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(STORAGE_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Increment view count for a request (works for everyone - registered and guests)
 * Returns the new view count and whether this was a new view
 */
export async function incrementRequestViews(requestId: string): Promise<{
  success: boolean;
  isNewView: boolean;
  viewCount: number;
}> {
  try {
    const sessionId = getOrCreateSessionId();
    const userAgent = navigator.userAgent;
    
    const { data, error } = await supabase.rpc('increment_request_views', {
      request_id_param: requestId,
      session_id_param: sessionId,
      user_agent_param: userAgent,
    });

    if (error) throw error;
    
    return {
      success: data?.success ?? false,
      isNewView: data?.is_new_view ?? false,
      viewCount: data?.view_count ?? 0,
    };
  } catch (error) {
    console.error('Error incrementing request views:', error);
    return { success: false, isNewView: false, viewCount: 0 };
  }
}

/**
 * Get view count for a specific request
 */
export async function getRequestViewCount(requestId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_request_view_count', {
      request_id_param: requestId,
    });

    if (error) throw error;
    return data ?? 0;
  } catch (error) {
    console.error('Error getting request view count:', error);
    return 0;
  }
}

/**
 * Get detailed view statistics for a request (for request owner)
 */
export async function getRequestViewStats(requestId: string): Promise<{
  totalViews: number;
  uniqueRegisteredUsers: number;
  guestViews: number;
  viewsLast24h: number;
  viewsLast7d: number;
} | null> {
  try {
    const { data, error } = await supabase.rpc('get_request_view_stats', {
      request_id_param: requestId,
    });

    if (error) throw error;
    
    if (!data) return null;
    
    return {
      totalViews: data.total_views ?? 0,
      uniqueRegisteredUsers: data.unique_registered_users ?? 0,
      guestViews: data.guest_views ?? 0,
      viewsLast24h: data.views_last_24h ?? 0,
      viewsLast7d: data.views_last_7d ?? 0,
    };
  } catch (error) {
    console.error('Error getting request view stats:', error);
    return null;
  }
}

