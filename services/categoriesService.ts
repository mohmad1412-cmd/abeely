import { supabase } from './supabaseClient';
import { Category, SupportedLocale, getCategoryLabel } from '../types';
import { AVAILABLE_CATEGORIES } from '../data';
import { logger } from '../utils/logger';

/**
 * خدمة إدارة التصنيفات
 * تجلب التصنيفات من الباك إند وتوفر fallback للتصنيفات المحلية
 * مع دعم متعدد اللغات (العربية، الإنجليزية، الأوردية)
 */

// تصنيف "أخرى" الافتراضي (بدلاً من "غير محدد")
export const OTHER_CATEGORY: Category = { 
  id: 'other', 
  label: 'أخرى',
  label_en: 'Other',
  label_ur: 'دیگر',
  icon: 'Grid3x3',
  emoji: '📦' 
};

// التصنيفات المحلية (fallback) - استخدام القائمة الشاملة من data.ts
const LOCAL_CATEGORIES: Category[] = AVAILABLE_CATEGORIES;

// نوع التصنيف المقترح
export interface PendingCategory {
  id: string;
  suggested_label: string;
  suggested_emoji: string;
  suggested_description?: string;
  request_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'merged';
  created_at: Date;
}

// Cache للتصنيفات
let categoriesCache: Category[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

/**
 * جلب التصنيفات من الباك إند
 */
export async function getCategories(forceRefresh = false): Promise<Category[]> {
  // استخدام الـ cache إذا كان متوفراً وصالحاً
  if (!forceRefresh && categoriesCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return categoriesCache;
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, label, label_en, label_ur, icon, emoji, description')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      logger.warn('Error fetching categories from backend, using local fallback', error, 'categoriesService');
      return LOCAL_CATEGORIES;
    }

    if (!data || data.length === 0) {
      logger.warn('No categories found in backend, using local fallback', undefined, 'categoriesService');
      return LOCAL_CATEGORIES;
    }

    // تحديث الـ cache
    categoriesCache = data.map(cat => ({
      id: cat.id,
      label: cat.label,
      label_en: cat.label_en,
      label_ur: cat.label_ur,
      icon: cat.icon,
      emoji: cat.emoji || '📦',
      description: cat.description,
    }));
    cacheTimestamp = Date.now();

    return categoriesCache;
  } catch (err) {
    logger.error('Error in getCategories', err as Error, 'categoriesService');
    return LOCAL_CATEGORIES;
  }
}

/**
 * جلب تصنيف واحد بالـ ID
 */
export async function getCategoryById(categoryId: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find(cat => cat.id === categoryId) || null;
}

/**
 * جلب تصنيفات متعددة بالـ IDs
 */
export async function getCategoriesByIds(categoryIds: string[]): Promise<Category[]> {
  const categories = await getCategories();
  return categories.filter(cat => categoryIds.includes(cat.id));
}

/**
 * البحث في التصنيفات (يبحث في جميع اللغات)
 */
export async function searchCategories(query: string): Promise<Category[]> {
  const categories = await getCategories();
  const lowerQuery = query.toLowerCase();
  
  return categories.filter(cat => 
    cat.label.toLowerCase().includes(lowerQuery) ||
    cat.id.toLowerCase().includes(lowerQuery) ||
    cat.label_en?.toLowerCase().includes(lowerQuery) ||
    cat.label_ur?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * الحصول على اسم التصنيف بناءً على اللغة
 */
export function getCategoryDisplayLabel(category: Category, locale: SupportedLocale = 'ar'): string {
  return getCategoryLabel(category, locale);
}

/**
 * الحصول على اسم التصنيف بالـ ID واللغة
 */
export async function getCategoryLabelById(categoryId: string, locale: SupportedLocale = 'ar'): Promise<string> {
  const category = await getCategoryById(categoryId);
  if (!category) return categoryId;
  return getCategoryLabel(category, locale);
}

/**
 * ربط تصنيفات بطلب (للاستخدام مع جدول request_categories)
 */
export async function setRequestCategories(requestId: string, categoryIds: string[]): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('set_request_categories', {
      p_request_id: requestId,
      p_category_ids: categoryIds
    });

    if (error) {
      logger.error('Error setting request categories', error, 'categoriesService');
      return false;
    }

    return true;
  } catch (err) {
    logger.error('Error in setRequestCategories', err as Error, 'categoriesService');
    return false;
  }
}

/**
 * جلب تصنيفات طلب معين (من جدول request_categories)
 */
export async function getRequestCategories(requestId: string): Promise<Category[]> {
  try {
    const { data, error } = await supabase.rpc('get_request_categories', {
      p_request_id: requestId
    });

    if (error) {
      logger.error('Error getting request categories', error, 'categoriesService');
      return [];
    }

    return (data || []).map((cat: any) => ({
      id: cat.id,
      label: cat.label,
      label_en: cat.label_en,
      label_ur: cat.label_ur,
      icon: cat.icon,
      emoji: cat.emoji || '📦',
    }));
  } catch (err) {
    logger.error('Error in getRequestCategories', err as Error, 'categoriesService');
    return [];
  }
}

/**
 * مسح الـ cache (للاستخدام عند تحديث التصنيفات)
 */
export function clearCategoriesCache(): void {
  categoriesCache = null;
  cacheTimestamp = 0;
}

/**
 * جلب التصنيفات المقترحة (بانتظار الموافقة)
 */
export async function getPendingCategories(): Promise<PendingCategory[]> {
  try {
    const { data, error } = await supabase
      .from('pending_categories')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      logger.warn('Error fetching pending categories', error, 'categoriesService');
      return [];
    }

    return (data || []).map(cat => ({
      id: cat.id,
      suggested_label: cat.suggested_label,
      suggested_emoji: cat.suggested_emoji || '📦',
      suggested_description: cat.suggested_description,
      request_id: cat.request_id,
      status: cat.status,
      created_at: new Date(cat.created_at),
    }));
  } catch (err) {
    logger.error('Error in getPendingCategories', err as Error, 'categoriesService');
    return [];
  }
}

/**
 * الموافقة على تصنيف مقترح وإضافته للتصنيفات
 */
export async function approvePendingCategory(
  pendingCategoryId: string,
  finalLabel: string,
  finalEmoji: string = '📦',
  finalId?: string,
  finalIcon?: string
): Promise<boolean> {
  try {
    // إنشاء ID فريد إذا لم يتم توفيره
    const categoryId = finalId || finalLabel.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\u0621-\u064Aa-z0-9-]/g, '')
      .slice(0, 50);

    // إضافة التصنيف الجديد
    const { error: insertError } = await supabase
      .from('categories')
      .insert({
        id: categoryId,
        label: finalLabel,
        emoji: finalEmoji,
        icon: finalIcon || 'Grid3x3',
        description: `تصنيف تمت إضافته بناءً على اقتراح`,
        is_active: true,
        sort_order: 50, // ترتيب متوسط
      });

    if (insertError) {
      logger.error('Error inserting approved category', insertError, 'categoriesService');
      return false;
    }

    // تحديث حالة التصنيف المقترح
    const { error: updateError } = await supabase
      .from('pending_categories')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', pendingCategoryId);

    if (updateError) {
      logger.error('Error updating pending category', updateError, 'categoriesService');
    }

    // مسح الـ cache
    clearCategoriesCache();

    return true;
  } catch (err) {
    logger.error('Error in approvePendingCategory', err as Error, 'categoriesService');
    return false;
  }
}

/**
 * رفض تصنيف مقترح
 */
export async function rejectPendingCategory(pendingCategoryId: string, notes?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pending_categories')
      .update({
        status: 'rejected',
        admin_notes: notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', pendingCategoryId);

    if (error) {
      logger.error('Error rejecting pending category', error, 'categoriesService');
      return false;
    }

    return true;
  } catch (err) {
    logger.error('Error in rejectPendingCategory', err as Error, 'categoriesService');
    return false;
  }
}

/**
 * دمج تصنيف مقترح مع تصنيف موجود
 */
export async function mergePendingCategory(
  pendingCategoryId: string,
  existingCategoryId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pending_categories')
      .update({
        status: 'merged',
        merged_with_category_id: existingCategoryId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', pendingCategoryId);

    if (error) {
      logger.error('Error merging pending category', error, 'categoriesService');
      return false;
    }

    return true;
  } catch (err) {
    logger.error('Error in mergePendingCategory', err as Error, 'categoriesService');
    return false;
  }
}

/**
 * التحقق من وجود تصنيف بالاسم (يبحث في جميع اللغات)
 */
export async function findCategoryByLabel(label: string): Promise<Category | null> {
  const categories = await getCategories();
  const lowerLabel = label.toLowerCase();
  
  return categories.find(cat => 
    cat.label.toLowerCase() === lowerLabel ||
    cat.label.toLowerCase().includes(lowerLabel) ||
    lowerLabel.includes(cat.label.toLowerCase()) ||
    cat.label_en?.toLowerCase() === lowerLabel ||
    cat.label_en?.toLowerCase().includes(lowerLabel)
  ) || null;
}

/**
 * تحويل أسماء التصنيفات إلى IDs (يدعم جميع اللغات)
 */
export async function getCategoryIdsByLabels(labels: string[]): Promise<string[]> {
  const categories = await getCategories();
  const ids: string[] = [];
  
  for (const label of labels) {
    const lowerLabel = label.toLowerCase();
    const matched = categories.find(cat => 
      cat.label.toLowerCase() === lowerLabel ||
      cat.label.toLowerCase().includes(lowerLabel) ||
      lowerLabel.includes(cat.label.toLowerCase()) ||
      cat.label_en?.toLowerCase() === lowerLabel ||
      cat.label_en?.toLowerCase().includes(lowerLabel) ||
      cat.id.toLowerCase() === lowerLabel
    );
    
    if (matched) {
      ids.push(matched.id);
    }
  }
  
  // إذا لم نجد أي تصنيف، نضيف "أخرى"
  if (ids.length === 0) {
    ids.push('other');
  }
  
  return [...new Set(ids)]; // إزالة التكرار
}

/**
 * الاشتراك بتحديثات التصنيفات (Realtime)
 */
export function subscribeToCategoriesUpdates(callback: (categories: Category[]) => void): () => void {
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let isSubscribed = false;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  const subscribe = () => {
    // إزالة الـ channel السابق إذا كان موجوداً
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // Ignore errors when removing channel
      }
    }

    channel = supabase
      .channel('categories-changes', {
        config: {
          broadcast: { self: false },
          presence: { key: '' }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
        },
        async () => {
          // مسح الـ cache وإعادة جلب التصنيفات
          clearCategoriesCache();
          const categories = await getCategories(true);
          callback(categories);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true;
          retryCount = 0;
          logger.log('✅ Subscribed to categories updates');
        } else if (status === 'CHANNEL_ERROR') {
          logger.warn('⚠️ WebSocket channel error - categories updates may not work');
          // إعادة المحاولة إذا لم نتجاوز الحد الأقصى
          if (retryCount < MAX_RETRIES && !isSubscribed) {
            retryCount++;
            setTimeout(() => {
              if (channel) subscribe();
            }, 2000 * retryCount); // Exponential backoff
          }
        } else if (status === 'TIMED_OUT') {
          logger.warn('⚠️ WebSocket connection timed out - categories updates may not work');
          // إعادة المحاولة إذا لم نتجاوز الحد الأقصى
          if (retryCount < MAX_RETRIES && !isSubscribed) {
            retryCount++;
            setTimeout(() => {
              if (channel) subscribe();
            }, 2000 * retryCount);
          }
        } else if (status === 'CLOSED') {
          isSubscribed = false;
          logger.warn('⚠️ WebSocket connection closed');
        }
      });
  };

  // بدء الاشتراك
  subscribe();

  return () => {
    if (channel) {
      try {
        supabase.removeChannel(channel);
        channel = null;
        isSubscribed = false;
      } catch (e) {
        // Ignore errors when removing channel
      }
    }
  };
}

/**
 * الحصول على اللغة الحالية من localStorage أو الافتراضي
 */
export function getCurrentLocale(): SupportedLocale {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('locale');
    if (stored === 'en' || stored === 'ar' || stored === 'ur') {
      return stored;
    }
  }
  return 'ar'; // العربية هي الافتراضية
}

/**
 * البحث المتقدم في التصنيفات بناءً على كلمات مفتاحية
 */
export async function findCategoriesByKeywords(keywords: string[]): Promise<Category[]> {
  const categories = await getCategories();
  const results: { category: Category; score: number }[] = [];
  
  for (const category of categories) {
    let score = 0;
    const searchableText = [
      category.label,
      category.label_en || '',
      category.label_ur || '',
      category.description || '',
      category.id,
    ].join(' ').toLowerCase();
    
    for (const keyword of keywords) {
      if (searchableText.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    
    if (score > 0) {
      results.push({ category, score });
    }
  }
  
  // ترتيب حسب الأعلى تطابقاً
  return results
    .sort((a, b) => b.score - a.score)
    .map(r => r.category);
}
