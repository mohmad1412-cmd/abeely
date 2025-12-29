import { supabase } from './supabaseClient';
import { Category } from '../types';

/**
 * خدمة إدارة التصنيفات
 * تجلب التصنيفات من الباك إند وتوفر fallback للتصنيفات المحلية
 */

// تصنيف "غير محدد" الثابت
export const UNSPECIFIED_CATEGORY: Category = { 
  id: 'unspecified', 
  label: 'غير محدد', 
  emoji: '❓' 
};

// التصنيفات المحلية (fallback) مع إضافة "غير محدد"
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
  { id: 'education', label: 'تعليم وتدريب', emoji: '📚' },
  { id: 'legal', label: 'قانون واستشارات', emoji: '⚖️' },
  { id: 'finance', label: 'مالية ومحاسبة', emoji: '💰' },
  { id: 'photography', label: 'تصوير وفيديو', emoji: '📷' },
  { id: 'events', label: 'مناسبات وحفلات', emoji: '🎉' },
  { id: 'beauty', label: 'تجميل وعناية', emoji: '💅' },
  { id: 'cleaning', label: 'تنظيف وخدمات منزلية', emoji: '🧹' },
  { id: 'food', label: 'طعام ومطاعم', emoji: '🍽️' },
  { id: 'car', label: 'سيارات وقطع غيار', emoji: '🚗' },
  { id: 'other', label: 'أخرى', emoji: '📦' },
  UNSPECIFIED_CATEGORY,
];

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
      console.warn('Error fetching pending categories:', error.message);
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
    console.error('Error in getPendingCategories:', err);
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
  finalId?: string
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
        description: `تصنيف تمت إضافته بناءً على اقتراح`,
        is_active: true,
        sort_order: 50, // ترتيب متوسط
      });

    if (insertError) {
      console.error('Error inserting approved category:', insertError);
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
      console.error('Error updating pending category:', updateError);
    }

    // مسح الـ cache
    clearCategoriesCache();

    return true;
  } catch (err) {
    console.error('Error in approvePendingCategory:', err);
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
      console.error('Error rejecting pending category:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in rejectPendingCategory:', err);
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
      console.error('Error merging pending category:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in mergePendingCategory:', err);
    return false;
  }
}

/**
 * التحقق من وجود تصنيف بالاسم
 */
export async function findCategoryByLabel(label: string): Promise<Category | null> {
  const categories = await getCategories();
  const lowerLabel = label.toLowerCase();
  
  return categories.find(cat => 
    cat.label.toLowerCase() === lowerLabel ||
    cat.label.toLowerCase().includes(lowerLabel) ||
    lowerLabel.includes(cat.label.toLowerCase())
  ) || null;
}

/**
 * تحويل أسماء التصنيفات إلى IDs
 */
export async function getCategoryIdsByLabels(labels: string[]): Promise<string[]> {
  const categories = await getCategories();
  const ids: string[] = [];
  
  for (const label of labels) {
    const lowerLabel = label.toLowerCase();
    const matched = categories.find(cat => 
      cat.label.toLowerCase() === lowerLabel ||
      cat.label.toLowerCase().includes(lowerLabel) ||
      lowerLabel.includes(cat.label.toLowerCase())
    );
    
    if (matched) {
      ids.push(matched.id);
    }
  }
  
  // إذا لم نجد أي تصنيف، نضيف "غير محدد"
  if (ids.length === 0) {
    ids.push('unspecified');
  }
  
  return [...new Set(ids)]; // إزالة التكرار
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



