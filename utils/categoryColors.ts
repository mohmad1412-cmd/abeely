/**
 * دالة لتوليد لون ثابت بناءً على category ID
 * تستخدم hash function لضمان نفس اللون لنفس ID دائماً
 */
export function getCategoryColor(categoryId: string): string {
  // Hash function بسيط لتوليد رقم من الـ ID
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // استخدام الـ hash لتحديد اللون من القائمة
  const colors: string[] = [
    'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
    'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300',
    'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30 text-green-700 dark:text-green-300',
    'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300',
    'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300',
    'border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300',
    'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300',
    'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300',
    'border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300',
    'border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300',
    'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300',
    'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
    'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300',
    'border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300',
    'border-fuchsia-200 dark:border-fuchsia-800 bg-fuchsia-50/50 dark:bg-fuchsia-950/30 text-fuchsia-700 dark:text-fuchsia-300',
    'border-lime-200 dark:border-lime-800 bg-lime-50/50 dark:bg-lime-950/30 text-lime-700 dark:text-lime-300',
  ];
  
  // استخدام الـ hash لتحديد اللون
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
}

/**
 * دالة للحصول على لون محدد للتصنيفات المعروفة
 * تحتوي على جميع التصنيفات الـ 70+ مع ألوان ثابتة
 */
export function getKnownCategoryColor(categoryId: string): string {
  const knownColors: Record<string, string> = {
    // تقنية - أزرق
    'software-dev': 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
    'web-dev': 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
    'mobile-apps': 'border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300',
    'it-support': 'border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300',
    'data-analysis': 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300',
    'ai-services': 'border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300',
    
    // تصميم - بنفسجي
    'graphic-design': 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300',
    'ui-ux': 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300',
    'logo-branding': 'border-fuchsia-200 dark:border-fuchsia-800 bg-fuchsia-50/50 dark:bg-fuchsia-950/30 text-fuchsia-700 dark:text-fuchsia-300',
    'interior-design': 'border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300',
    'architectural': 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300',
    
    // محتوى - أخضر
    'content-writing': 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30 text-green-700 dark:text-green-300',
    'copywriting': 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30 text-green-700 dark:text-green-300',
    'translation': 'border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300',
    'voice-over': 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
    'proofreading': 'border-lime-200 dark:border-lime-800 bg-lime-50/50 dark:bg-lime-950/30 text-lime-700 dark:text-lime-300',
    
    // تسويق - برتقالي
    'digital-marketing': 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300',
    'social-media': 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300',
    'seo': 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    'advertising': 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300',
    
    // خدمات مهنية - رمادي/بني
    'legal-services': 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/30 text-stone-700 dark:text-stone-300',
    'accounting': 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
    'consulting': 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300',
    'hr-services': 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
    
    // تعليم - كهرماني
    'tutoring': 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    'online-courses': 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    'language-learning': 'border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300',
    'skills-training': 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300',
    
    // صحة - وردي
    'medical-consult': 'border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300',
    'nutrition': 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30 text-green-700 dark:text-green-300',
    'fitness': 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300',
    'mental-health': 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300',
    
    // صيانة ومنزل - أصفر
    'plumbing': 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
    'electrical': 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300',
    'ac-services': 'border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300',
    'home-repair': 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    'appliance-repair': 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/30 text-gray-700 dark:text-gray-300',
    'painting': 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300',
    'carpentry': 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    
    // نقل - نيلي
    'moving': 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300',
    'shipping': 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300',
    'delivery': 'border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300',
    
    // سيارات - رمادي
    'car-repair': 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300',
    'car-wash': 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
    'car-rental': 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/30 text-gray-700 dark:text-gray-300',
    'driver-services': 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300',
    
    // مناسبات - بنفسجي
    'event-planning': 'border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300',
    'catering': 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300',
    'photography': 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300',
    'videography': 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300',
    'entertainment': 'border-fuchsia-200 dark:border-fuchsia-800 bg-fuchsia-50/50 dark:bg-fuchsia-950/30 text-fuchsia-700 dark:text-fuchsia-300',
    'flowers-decor': 'border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300',
    
    // جمال وعناية - فوشيا
    'hair-styling': 'border-fuchsia-200 dark:border-fuchsia-800 bg-fuchsia-50/50 dark:bg-fuchsia-950/30 text-fuchsia-700 dark:text-fuchsia-300',
    'makeup': 'border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300',
    'spa-massage': 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300',
    'nails': 'border-fuchsia-200 dark:border-fuchsia-800 bg-fuchsia-50/50 dark:bg-fuchsia-950/30 text-fuchsia-700 dark:text-fuchsia-300',
    
    // تنظيف - أخضر ليموني
    'home-cleaning': 'border-lime-200 dark:border-lime-800 bg-lime-50/50 dark:bg-lime-950/30 text-lime-700 dark:text-lime-300',
    'office-cleaning': 'border-lime-200 dark:border-lime-800 bg-lime-50/50 dark:bg-lime-950/30 text-lime-700 dark:text-lime-300',
    'laundry': 'border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300',
    'pest-control': 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300',
    
    // طعام - برتقالي
    'cooking': 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300',
    'restaurants': 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300',
    'baking': 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    'catering-food': 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300',
    
    // عقارات - بني
    'real-estate': 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/30 text-stone-700 dark:text-stone-300',
    'property-mgmt': 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/30 text-stone-700 dark:text-stone-300',
    
    // حيوانات أليفة - بني
    'pet-care': 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    'pet-grooming': 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    
    // أمن وحماية - رمادي غامق
    'security': 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 text-zinc-700 dark:text-zinc-300',
    'cctv': 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 text-zinc-700 dark:text-zinc-300',
    
    // أخرى والتصنيفات القديمة
    'other': 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/30 text-gray-700 dark:text-gray-300',
    
    // التوافق مع التصنيفات القديمة
    'tech': 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
    'design': 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300',
    'writing': 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30 text-green-700 dark:text-green-300',
    'marketing': 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300',
    'engineering': 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300',
    'mobile': 'border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300',
    'maintenance': 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300',
    'transport': 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300',
    'health': 'border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300',
    'education': 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    'legal': 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300',
    'finance': 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
    'events': 'border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300',
    'beauty': 'border-fuchsia-200 dark:border-fuchsia-800 bg-fuchsia-50/50 dark:bg-fuchsia-950/30 text-fuchsia-700 dark:text-fuchsia-300',
    'cleaning': 'border-lime-200 dark:border-lime-800 bg-lime-50/50 dark:bg-lime-950/30 text-lime-700 dark:text-lime-300',
    'food': 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300',
    'car': 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/30 text-gray-700 dark:text-gray-300',
  };
  
  return knownColors[categoryId] || getCategoryColor(categoryId);
}
