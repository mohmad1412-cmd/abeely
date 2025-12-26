import { supabase } from './supabaseClient';
import { UserPreferences } from '../types';

/**
 * خدمة إدارة اهتمامات المستخدمين
 */

// الحصول على اهتمامات المستخدم
export const getUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_user_preferences', { p_user_id: userId });

    if (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }

    if (!data) {
      return {
        interestedCategories: [],
        interestedCities: [],
        radarWords: [],
        notifyOnInterest: true,
        roleMode: 'requester'
      };
    }

    return {
      interestedCategories: data.interested_categories || [],
      interestedCities: data.interested_cities || [],
      radarWords: data.radar_words || [],
      notifyOnInterest: data.notify_on_interest ?? true,
      roleMode: data.role_mode || 'requester'
    };
  } catch (err) {
    console.error('Error in getUserPreferences:', err);
    return null;
  }
};

// تحديث اهتمامات المستخدم
export const updateUserPreferences = async (
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<UserPreferences | null> => {
  try {
    const { data, error } = await supabase
      .rpc('update_user_preferences', {
        p_user_id: userId,
        p_categories: preferences.interestedCategories,
        p_cities: preferences.interestedCities,
        p_radar_words: preferences.radarWords,
        p_notify_on_interest: preferences.notifyOnInterest,
        p_role_mode: preferences.roleMode
      });

    if (error) {
      console.error('Error updating user preferences:', error);
      return null;
    }

    return {
      interestedCategories: data.interested_categories || [],
      interestedCities: data.interested_cities || [],
      radarWords: data.radar_words || [],
      notifyOnInterest: data.notify_on_interest ?? true,
      roleMode: data.role_mode || 'requester'
    };
  } catch (err) {
    console.error('Error in updateUserPreferences:', err);
    return null;
  }
};

// البحث عن مستخدمين مهتمين (للإشعارات)
export const findInterestedUsers = async (
  category?: string,
  city?: string,
  keywords?: string[]
): Promise<Array<{ userId: string; displayName: string; phone: string; matchType: string }>> => {
  try {
    const { data, error } = await supabase
      .rpc('find_interested_users', {
        p_category: category,
        p_city: city,
        p_keywords: keywords
      });

    if (error) {
      console.error('Error finding interested users:', error);
      return [];
    }

    return (data || []).map((user: any) => ({
      userId: user.user_id,
      displayName: user.display_name,
      phone: user.phone,
      matchType: user.match_type
    }));
  } catch (err) {
    console.error('Error in findInterestedUsers:', err);
    return [];
  }
};

// تحديث مباشر للاهتمامات عبر profiles table (بديل للـ RPC)
export const updatePreferencesDirect = async (
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<boolean> => {
  try {
    const updateData: any = {};
    
    if (preferences.interestedCategories !== undefined) {
      updateData.interested_categories = preferences.interestedCategories;
    }
    if (preferences.interestedCities !== undefined) {
      updateData.interested_cities = preferences.interestedCities;
    }
    if (preferences.radarWords !== undefined) {
      updateData.radar_words = preferences.radarWords;
    }
    if (preferences.notifyOnInterest !== undefined) {
      updateData.notify_on_interest = preferences.notifyOnInterest;
    }
    if (preferences.roleMode !== undefined) {
      updateData.role_mode = preferences.roleMode;
    }
    
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('Error updating preferences directly:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in updatePreferencesDirect:', err);
    return false;
  }
};

// الحصول على الاهتمامات مباشرة من profiles table
export const getPreferencesDirect = async (userId: string): Promise<UserPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('interested_categories, interested_cities, radar_words, notify_on_interest, role_mode')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching preferences directly:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      interestedCategories: data.interested_categories || [],
      interestedCities: data.interested_cities || [],
      radarWords: data.radar_words || [],
      notifyOnInterest: data.notify_on_interest ?? true,
      roleMode: data.role_mode || 'requester'
    };
  } catch (err) {
    console.error('Error in getPreferencesDirect:', err);
    return null;
  }
};

