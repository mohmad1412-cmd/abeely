import { supabase } from './supabaseClient';
import { Category } from '../types';

/**
 * خدمة إدارة التصنيفات
 * تجلب التصنيفات من الباك إند وتوفر fallback للتصنيفات المحلية
 */

// التصنيفات المحلية (fallback)
const LOCAL_CATEGORIES: Category[] = [
  { id: 'tech', label: 'خدمات تقنية وبرمجة', emoji: '💻' },
  { id: 'design', label: 'تصميم وجرافيكس', emoji: '🎨' },
  { id: 'writing', label: 'كتابة ومحتوى', emoji: '✍️' },
  { id: 'marketing', label: 'تسويق ومبيعات', emoji: '📊' },
  { id: 'engineering', label: 'هندسة وعمارة', emoji: '🏗️' },
  { id: 'mobile', label: 'خدمات جوال', emoji: '📱' },
  { id: 'maintenance', label: 'صيانة ومنزل', emoji: '🔧' },
  { id: 'transport', label: 'نقل وخدمات لوجستية', emoji: '🚚' },
  { id: 'health', label: 'صحة ولياقة', emoji: '🩺' },
  { id: 'translation', label: 'ترجمة ولغات', emoji: '🌐' },
];

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
      .select('id, label, emoji, description')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.warn('Error fetching categories from backend, using local fallback:', error.message);
      return LOCAL_CATEGORIES;
    }

    if (!data || data.length === 0) {
      console.warn('No categories found in backend, using local fallback');
      return LOCAL_CATEGORIES;
    }

    // تحديث الـ cache
    categoriesCache = data.map(cat => ({
      id: cat.id,
      label: cat.label,
      emoji: cat.emoji || '📦',
    }));
    cacheTimestamp = Date.now();

    return categoriesCache;
  } catch (err) {
    console.error('Error in getCategories:', err);
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
 * البحث في التصنيفات
 */
export async function searchCategories(query: string): Promise<Category[]> {
  const categories = await getCategories();
  const lowerQuery = query.toLowerCase();
  
  return categories.filter(cat => 
    cat.label.toLowerCase().includes(lowerQuery) ||
    cat.id.toLowerCase().includes(lowerQuery)
  );
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
      console.error('Error setting request categories:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in setRequestCategories:', err);
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
      console.error('Error getting request categories:', error);
      return [];
    }

    return (data || []).map((cat: any) => ({
      id: cat.id,
      label: cat.label,
      emoji: cat.emoji || '📦',
    }));
  } catch (err) {
    console.error('Error in getRequestCategories:', err);
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
 * الاشتراك بتحديثات التصنيفات (Realtime)
 */
export function subscribeToCategoriesUpdates(callback: (categories: Category[]) => void): () => void {
  const channel = supabase
    .channel('categories-changes')
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
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}



