/**
 * Service for finding interested users
 * 
 * ⚠️ SECURITY NOTE: This function requires SERVICE_ROLE_KEY and should ONLY be called
 * from server-side code (database triggers, edge functions, or backend services).
 * Never expose SERVICE_ROLE_KEY to the frontend!
 */

import { logger } from '../utils/logger';

export interface InterestedUser {
  user_id: string;
  display_name: string;
  phone: string;
  match_type: 'category' | 'city' | 'radar_word' | 'unknown';
}

export interface FindInterestedUsersParams {
  category?: string;
  city?: string;
  keywords?: string[];
}

export interface FindInterestedUsersResponse {
  data: InterestedUser[];
  error?: string;
}

/**
 * Find users interested in a category, city, or keywords
 * 
 * This function calls the Supabase Edge Function `find-interested-users`
 * which requires SERVICE_ROLE_KEY authentication.
 * 
 * @param params - Search parameters
 * @param params.category - Category ID to match (optional)
 * @param params.city - City name to match (optional)
 * @param params.keywords - Array of keywords to match against radar_words (optional)
 * @param supabaseUrl - Supabase project URL
 * @param serviceRoleKey - SERVICE_ROLE_KEY (must be kept secret!)
 * 
 * @returns Array of interested users with their match type
 * 
 * @example
 * ```typescript
 * const users = await findInterestedUsers(
 *   { category: 'web-dev', city: 'الرياض', keywords: ['موقع', 'ويب'] },
 *   'https://your-project.supabase.co',
 *   process.env.SUPABASE_SERVICE_ROLE_KEY!
 * );
 * ```
 */
export async function findInterestedUsers(
  params: FindInterestedUsersParams,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<FindInterestedUsersResponse> {
  try {
    // Validate inputs
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase URL or SERVICE_ROLE_KEY');
    }

    // Build request body
    const body: Record<string, unknown> = {};
    if (params.category) body.category = params.category;
    if (params.city) body.city = params.city;
    if (params.keywords && params.keywords.length > 0) {
      body.keywords = params.keywords;
    }

    // Call the Edge Function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/find-interested-users`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('find-interested-users failed', {
        status: response.status,
        error: errorText,
      });
      return {
        data: [],
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const result = await response.json();
    
    if (result.error) {
      logger.error('find-interested-users returned error', result.error);
      return {
        data: [],
        error: result.error,
      };
    }

    return {
      data: result.data || [],
    };
  } catch (error) {
    logger.error('Error calling find-interested-users', error);
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Example usage in a database trigger or edge function:
 * 
 * ```typescript
 * import { findInterestedUsers } from './services/interestedUsersService';
 * 
 * // In a database trigger after a new request is created:
 * const interestedUsers = await findInterestedUsers(
 *   {
 *     category: newRequest.category_id,
 *     city: newRequest.location,
 *     keywords: extractKeywords(newRequest.description),
 *   },
 *   Deno.env.get('SUPABASE_URL')!,
 *   Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
 * );
 * 
 * // Send notifications to interested users
 * for (const user of interestedUsers.data) {
 *   await sendNotification(user.user_id, newRequest.id);
 * }
 * ```
 */

