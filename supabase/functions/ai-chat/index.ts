// @ts-ignore - Supabase Edge Runtime types
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ============================================
// Configuration - Using Anthropic Claude and OpenAI GPT (round-robin)
// ============================================
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || 
                          Deno.env.get("VITE_ANTHROPIC_API_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || 
                       Deno.env.get("VITE_OPENAI_API_KEY") || "";
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const OPENAI_MODEL = "gpt-4o";

// Counter for round-robin selection
let requestCounter = 0;

// Supabase client للتحقق من التصنيفات
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// التصنيفات الشاملة مع كلماتها المفتاحية (70+ تصنيف)
const FIXED_CATEGORIES = [
  // تقنية
  { id: 'software-dev', label: 'تطوير برمجيات', keywords: ['برمجة', 'سوفتوير', 'نظام', 'أتمتة', 'كود', 'برنامج', 'تطوير'] },
  { id: 'web-dev', label: 'تطوير مواقع', keywords: ['موقع', 'ويب', 'صفحة', 'منصة', 'HTML', 'CSS', 'React', 'WordPress'] },
  { id: 'mobile-apps', label: 'تطبيقات جوال', keywords: ['تطبيق', 'جوال', 'موبايل', 'آيفون', 'أندرويد', 'iOS', 'Flutter'] },
  { id: 'it-support', label: 'دعم تقني', keywords: ['دعم تقني', 'مشكلة تقنية', 'IT', 'صيانة كمبيوتر', 'لاب توب'] },
  { id: 'data-analysis', label: 'تحليل بيانات', keywords: ['تحليل', 'بيانات', 'داتا', 'إحصائيات', 'Excel', 'تقارير'] },
  { id: 'ai-services', label: 'خدمات ذكاء اصطناعي', keywords: ['ذكاء اصطناعي', 'AI', 'تعلم آلي', 'ChatGPT', 'بوت'] },
  
  // تصميم
  { id: 'graphic-design', label: 'تصميم جرافيك', keywords: ['تصميم', 'جرافيك', 'صور', 'فوتوشوب', 'اليستريتور', 'بوستر'] },
  { id: 'ui-ux', label: 'تصميم واجهات', keywords: ['UI', 'UX', 'واجهة', 'تجربة مستخدم', 'فيجما', 'Figma'] },
  { id: 'logo-branding', label: 'شعارات وهوية', keywords: ['شعار', 'لوقو', 'هوية', 'بصرية', 'براند', 'علامة تجارية'] },
  { id: 'interior-design', label: 'تصميم داخلي', keywords: ['تصميم داخلي', 'ديكور', 'أثاث', 'غرفة', 'صالة'] },
  { id: 'architectural', label: 'تصميم معماري', keywords: ['معماري', 'هندسة معمارية', 'مخطط', 'فيلا', 'مبنى'] },
  
  // محتوى
  { id: 'content-writing', label: 'كتابة محتوى', keywords: ['كتابة', 'محتوى', 'مقال', 'مدونة', 'نصوص'] },
  { id: 'copywriting', label: 'كتابة إعلانية', keywords: ['إعلانية', 'سلوقان', 'نص إعلاني', 'كوبي'] },
  { id: 'translation', label: 'ترجمة', keywords: ['ترجمة', 'لغة', 'إنجليزي', 'عربي', 'فرنسي', 'ألماني'] },
  { id: 'voice-over', label: 'تعليق صوتي', keywords: ['صوتي', 'تعليق', 'راوي', 'voice over', 'دوبلاج'] },
  { id: 'proofreading', label: 'تدقيق لغوي', keywords: ['تدقيق', 'إملائي', 'نحوي', 'تصحيح', 'مراجعة'] },
  
  // تسويق
  { id: 'digital-marketing', label: 'تسويق رقمي', keywords: ['تسويق', 'رقمي', 'إعلان', 'حملة', 'ترويج'] },
  { id: 'social-media', label: 'سوشيال ميديا', keywords: ['سوشيال', 'ميديا', 'انستقرام', 'تويتر', 'سناب', 'تيك توك'] },
  { id: 'seo', label: 'تحسين محركات البحث', keywords: ['SEO', 'قوقل', 'بحث', 'ظهور', 'ترتيب'] },
  { id: 'advertising', label: 'إعلانات', keywords: ['إعلان', 'ممول', 'قوقل أدز', 'فيسبوك أدز'] },
  
  // خدمات مهنية
  { id: 'legal-services', label: 'خدمات قانونية', keywords: ['قانون', 'محامي', 'عقد', 'قضية', 'محكمة', 'توثيق'] },
  { id: 'accounting', label: 'محاسبة', keywords: ['محاسبة', 'ضرائب', 'ميزانية', 'مالية', 'تدقيق'] },
  { id: 'consulting', label: 'استشارات', keywords: ['استشارة', 'نصيحة', 'خبرة', 'إدارية'] },
  { id: 'hr-services', label: 'موارد بشرية', keywords: ['توظيف', 'موارد بشرية', 'HR', 'موظفين', 'رواتب'] },
  
  // تعليم
  { id: 'tutoring', label: 'دروس خصوصية', keywords: ['درس', 'خصوصي', 'معلم', 'مدرس', 'شرح', 'تقوية'] },
  { id: 'online-courses', label: 'دورات أونلاين', keywords: ['دورة', 'كورس', 'أونلاين', 'تعلم'] },
  { id: 'language-learning', label: 'تعليم لغات', keywords: ['تعليم لغة', 'إنجليزي', 'فرنسي', 'لغة'] },
  { id: 'skills-training', label: 'تدريب مهارات', keywords: ['تدريب', 'مهارة', 'ورشة عمل', 'تطوير ذات'] },
  
  // صحة
  { id: 'medical-consult', label: 'استشارات طبية', keywords: ['طبيب', 'دكتور', 'استشارة طبية', 'صحة'] },
  { id: 'nutrition', label: 'تغذية', keywords: ['تغذية', 'دايت', 'حمية', 'أكل صحي', 'نظام غذائي'] },
  { id: 'fitness', label: 'لياقة بدنية', keywords: ['لياقة', 'رياضة', 'جيم', 'مدرب شخصي', 'تمارين'] },
  { id: 'mental-health', label: 'صحة نفسية', keywords: ['نفسي', 'علاج نفسي', 'استشارة نفسية', 'قلق'] },
  
  // صيانة ومنزل
  { id: 'plumbing', label: 'سباكة', keywords: ['سباكة', 'سباك', 'مياه', 'حنفية', 'مجاري', 'تسريب'] },
  { id: 'electrical', label: 'كهرباء', keywords: ['كهرباء', 'كهربائي', 'أسلاك', 'فيش', 'إضاءة'] },
  { id: 'ac-services', label: 'تكييف', keywords: ['تكييف', 'مكيف', 'فريون', 'تبريد', 'سبليت'] },
  { id: 'home-repair', label: 'إصلاحات منزلية', keywords: ['إصلاح', 'صيانة منزل', 'تصليح'] },
  { id: 'appliance-repair', label: 'صيانة أجهزة', keywords: ['غسالة', 'ثلاجة', 'فرن', 'جهاز', 'صيانة أجهزة'] },
  { id: 'painting', label: 'دهانات', keywords: ['دهان', 'طلاء', 'صبغ', 'حائط', 'لون'] },
  { id: 'carpentry', label: 'نجارة', keywords: ['نجار', 'خشب', 'أثاث', 'باب', 'نافذة'] },
  
  // نقل
  { id: 'moving', label: 'نقل عفش', keywords: ['نقل', 'عفش', 'أثاث', 'ترحيل', 'انتقال'] },
  { id: 'shipping', label: 'شحن', keywords: ['شحن', 'بضاعة', 'طرد', 'تغليف'] },
  { id: 'delivery', label: 'توصيل', keywords: ['توصيل', 'ديليفري', 'طلب', 'مندوب'] },
  
  // سيارات
  { id: 'car-repair', label: 'صيانة سيارات', keywords: ['سيارة', 'ميكانيكي', 'ورشة', 'صيانة سيارة', 'موتر', 'جيب', 'لكزس', 'تويوتا', 'هونداي', 'نيسان', 'مرسيدس', 'بي إم دبليو', 'أودي', 'فورد', 'شيفروليه', 'جمس', 'دودج', 'كيا', 'هوندا', 'مازدا', 'سوزوكي', 'قطع غيار', 'صدام', 'مكينة', 'جير', 'فرامل', 'إطارات', 'بطارية'] },
  { id: 'car-wash', label: 'غسيل سيارات', keywords: ['غسيل', 'تنظيف سيارة', 'بوليش'] },
  { id: 'car-rental', label: 'تأجير سيارات', keywords: ['إيجار سيارة', 'تأجير', 'رنت'] },
  { id: 'driver-services', label: 'خدمات سائق', keywords: ['سائق', 'درايفر', 'توصيل'] },
  
  // مناسبات
  { id: 'event-planning', label: 'تنظيم مناسبات', keywords: ['حفلة', 'مناسبة', 'تنظيم', 'فعالية', 'حدث'] },
  { id: 'catering', label: 'تموين', keywords: ['تموين', 'ضيافة', 'بوفيه', 'كيترنج'] },
  { id: 'photography', label: 'تصوير', keywords: ['تصوير', 'مصور', 'كاميرا', 'صور'] },
  { id: 'videography', label: 'تصوير فيديو', keywords: ['فيديو', 'مونتاج', 'فيديوغرافر'] },
  { id: 'entertainment', label: 'ترفيه', keywords: ['ترفيه', 'موسيقى', 'دي جي', 'منشط'] },
  { id: 'flowers-decor', label: 'زهور وتزيين', keywords: ['زهور', 'ورد', 'تزيين', 'ديكور حفلة'] },
  
  // جمال وعناية
  { id: 'hair-styling', label: 'تصفيف شعر', keywords: ['شعر', 'قص', 'صبغة', 'تسريحة', 'حلاق'] },
  { id: 'makeup', label: 'مكياج', keywords: ['مكياج', 'ميكب', 'تجميل', 'عروس'] },
  { id: 'spa-massage', label: 'سبا ومساج', keywords: ['سبا', 'مساج', 'استرخاء', 'عناية'] },
  { id: 'nails', label: 'أظافر', keywords: ['أظافر', 'مانيكير', 'بديكير', 'طلاء'] },
  
  // تنظيف
  { id: 'home-cleaning', label: 'تنظيف منازل', keywords: ['تنظيف منزل', 'شغالة', 'نظافة منزلية'] },
  { id: 'office-cleaning', label: 'تنظيف مكاتب', keywords: ['تنظيف مكتب', 'نظافة مكاتب', 'شركة'] },
  { id: 'laundry', label: 'غسيل وكي', keywords: ['غسيل', 'كي', 'ملابس', 'مغسلة'] },
  { id: 'pest-control', label: 'مكافحة حشرات', keywords: ['حشرات', 'صراصير', 'فئران', 'مكافحة', 'رش'] },
  
  // طعام
  { id: 'cooking', label: 'طبخ منزلي', keywords: ['طبخ', 'أكل', 'وجبة', 'طباخ', 'معصوب', 'مندي', 'كبسة', 'مطبق', 'حنيذ', 'مظبي', 'شاورما', 'فلافل', 'سمبوسة', 'سندويش', 'برجر', 'بيتزا', 'باستا', 'رز', 'لحم', 'دجاج', 'سمك', 'لحم بقري', 'لحم خروف', 'مشاوي', 'مشكل', 'مقبلات', 'سلطة', 'شوربة', 'حساء', 'يخني', 'مقلوبة', 'مجبوس', 'مشاكيك', 'مشكل مشاوي', 'مشكل لحم', 'مشكل دجاج', 'مشكل سمك', 'أرز بخاري', 'أرز كباب', 'أرز دجاج', 'أرز لحم', 'أرز سمك', 'مشكل يمني', 'مشكل سعودي', 'مشكل خليجي', 'مشكل عربي', 'طعام يمني', 'طعام سعودي', 'طعام خليجي', 'طعام عربي', 'أطباق عربية', 'أطباق يمنية', 'أطباق خليجية', 'أطباق شعبية', 'أكل بيتي', 'أكل منزلي', 'أكل طازج', 'أكل جاهز', 'توصيل طعام', 'طلب طعام', 'وجبة جاهزة', 'وجبة ساخنة', 'وجبة باردة'] },
  { id: 'restaurants', label: 'مطاعم', keywords: ['مطعم', 'مطاعم', 'مطعم يمني', 'مطعم سعودي', 'مطعم خليجي', 'مطعم عربي', 'مطعم آسيوي', 'مطعم إيطالي', 'مطعم صيني', 'مطعم ياباني', 'مطعم هندي', 'مطعم تركي', 'مطعم لبناني', 'مطعم شامي', 'مطعم مصري', 'مطعم مغربي', 'مطعم بحري', 'مطعم مشاوي', 'مطعم بيتزا', 'مطعم برجر', 'مطعم فطور', 'مطعم غداء', 'مطعم عشاء', 'مطعم سريع', 'مطعم فاخر', 'مطعم شعبي', 'مطعم عائلي', 'مطعم للعزائم', 'مطعم للولائم', 'مطعم للمناسبات', 'مطعم للحفلات', 'مطعم للأعراس', 'مطعم للعزائم', 'مطعم للولائم', 'مطعم للمناسبات', 'مطعم للحفلات', 'مطعم للأعراس', 'مطعم للعزائم', 'مطعم للولائم', 'مطعم للمناسبات', 'مطعم للحفلات', 'مطعم للأعراس', 'مطعم للعزائم', 'مطعم للولائم', 'مطعم للمناسبات', 'مطعم للحفلات', 'مطعم للأعراس'] },
  { id: 'baking', label: 'حلويات ومخبوزات', keywords: ['حلويات', 'كيك', 'مخبوزات', 'خبز', 'تورتة', 'كنافة', 'بقلاوة', 'لقيمات', 'زلابيا', 'عصيدة', 'مهلبية', 'أم علي', 'قطايف', 'معمول', 'كعك', 'بسكويت', 'كوكيز', 'دونات', 'وافل', 'بان كيك', 'كريب', 'كرواسان', 'خبز عربي', 'خبز تنور', 'خبز صاج', 'خبز أسمر', 'خبز أبيض', 'خبز بر', 'خبز توست', 'خبز فرنسي', 'خبز إيطالي', 'خبز محلي', 'خبز طازج', 'معجنات', 'فطائر', 'بيتزا', 'بيتزا عربية'] },
  { id: 'catering-food', label: 'تموين طعام', keywords: ['تموين طعام', 'ولائم', 'بوفيه أكل', 'تموين مناسبات', 'تموين حفلات', 'تموين أعراس', 'تموين عزائم', 'تموين مناسبات', 'بوفيه', 'كيترنج', 'خدمات طعام', 'تجهيز طعام', 'تحضير طعام', 'طبخ جماعي', 'طبخ مناسبات', 'طبخ حفلات', 'طبخ أعراس', 'طبخ عزائم', 'طبخ ولائم', 'طبخ جماعي', 'طبخ للمناسبات', 'طبخ للحفلات', 'طبخ للأعراس', 'طبخ للعزائم', 'طبخ للولائم', 'خدمات التموين', 'خدمات الكيترنج', 'خدمات البوفيه'] },
  
  // عقارات
  { id: 'real-estate', label: 'عقارات', keywords: ['عقار', 'شقة', 'فيلا', 'أرض', 'بيت', 'إيجار', 'بيع'] },
  { id: 'property-mgmt', label: 'إدارة عقارات', keywords: ['إدارة عقار', 'تحصيل', 'مستأجرين'] },
  
  // حيوانات
  { id: 'pet-care', label: 'رعاية حيوانات', keywords: ['حيوان', 'قط', 'كلب', 'رعاية', 'فندقة'] },
  { id: 'pet-grooming', label: 'تجميل حيوانات', keywords: ['تجميل حيوانات', 'قص شعر', 'حمام'] },
  
  // أمن
  { id: 'security', label: 'خدمات أمنية', keywords: ['أمن', 'حراسة', 'حارس', 'أمان'] },
  { id: 'cctv', label: 'كاميرات مراقبة', keywords: ['كاميرا', 'مراقبة', 'CCTV', 'تركيب كاميرات'] },
  
  // أخرى
  { id: 'other', label: 'أخرى', keywords: ['أخرى', 'متنوع', 'عام', 'غير محدد'] },
];

// دالة للتحقق من تطابق التصنيف مع الكلمات المفتاحية
function findMatchingCategories(text: string): string[] {
  const lowerText = text.toLowerCase();
  const matches: { id: string; label: string; score: number }[] = [];
  
  for (const cat of FIXED_CATEGORIES) {
    // تخطي "أخرى" من الاقتراحات
    if (cat.id === 'other') continue;
    
    let score = 0;
    for (const keyword of cat.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    if (score > 0) {
      matches.push({ id: cat.id, label: cat.label, score });
    }
  }
  
  // ترتيب حسب الأكثر تطابقاً
  matches.sort((a, b) => b.score - a.score);
  
  // إرجاع أفضل 5 تصنيفات (بدلاً من 3) لتشجيع اختيار تصنيفات متعددة
  return matches.slice(0, 5).map(m => m.label);
}

// دالة للتحقق مما إذا كان التصنيف موجوداً (مطابقة مرنة)
function isKnownCategory(label: string): boolean {
  if (!label) return false;
  const lowerLabel = label.toLowerCase().trim();
  
  // إزالة علامات الترقيم والمسافات الزائدة
  const normalizedLabel = lowerLabel.replace(/[؟?؟،,.\s]+/g, ' ').trim();
  
  return FIXED_CATEGORIES.some(cat => {
    const catLabel = cat.label.toLowerCase().trim();
    const normalizedCatLabel = catLabel.replace(/[؟?؟،,.\s]+/g, ' ').trim();
    
    // مطابقة دقيقة
    if (normalizedLabel === normalizedCatLabel) return true;
    
    // مطابقة جزئية (يحتوي على)
    if (normalizedLabel.includes(normalizedCatLabel) || normalizedCatLabel.includes(normalizedLabel)) return true;
    
    // مطابقة كلمات (إذا تطابقت 70% من الكلمات)
    const labelWords = normalizedLabel.split(/\s+/).filter(w => w.length > 2);
    const catWords = normalizedCatLabel.split(/\s+/).filter(w => w.length > 2);
    
    if (labelWords.length > 0 && catWords.length > 0) {
      const matchingWords = labelWords.filter(w => catWords.some(cw => cw.includes(w) || w.includes(cw)));
      const matchRatio = matchingWords.length / Math.max(labelWords.length, catWords.length);
      if (matchRatio >= 0.7) return true;
    }
    
    return false;
  });
}

// دالة لإيجاد أفضل تصنيف مطابق (حتى لو لم يكن مطابقاً تماماً)
function findBestMatchingCategory(label: string): { id: string; label: string } | null {
  if (!label) return null;
  const lowerLabel = label.toLowerCase().trim();
  const normalizedLabel = lowerLabel.replace(/[؟?؟،,.\s]+/g, ' ').trim();
  
  let bestMatch: { id: string; label: string; score: number } | null = null;
  
  for (const cat of FIXED_CATEGORIES) {
    const catLabel = cat.label.toLowerCase().trim();
    const normalizedCatLabel = catLabel.replace(/[؟?؟،,.\s]+/g, ' ').trim();
    let score = 0;
    
    // مطابقة دقيقة = 100 نقطة
    if (normalizedLabel === normalizedCatLabel) {
      return { id: cat.id, label: cat.label };
    }
    
    // مطابقة جزئية = 50 نقطة
    if (normalizedLabel.includes(normalizedCatLabel) || normalizedCatLabel.includes(normalizedLabel)) {
      score = 50;
    }
    
    // مطابقة كلمات = 30 نقطة لكل كلمة متطابقة
    const labelWords = normalizedLabel.split(/\s+/).filter(w => w.length > 2);
    const catWords = normalizedCatLabel.split(/\s+/).filter(w => w.length > 2);
    
    if (labelWords.length > 0 && catWords.length > 0) {
      const matchingWords = labelWords.filter(w => catWords.some(cw => cw.includes(w) || w.includes(cw)));
      score += matchingWords.length * 30;
    }
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: cat.id, label: cat.label, score };
    }
  }
  
  // إرجاع أفضل تطابق إذا كان النقاط >= 30
  return bestMatch && bestMatch.score >= 30 ? { id: bestMatch.id, label: bestMatch.label } : null;
}

function res(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

// ============================================
// Unified AI Provider (Anthropic or OpenAI)
// ============================================
async function callAnthropic(systemPrompt: string, messages: any[]): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Anthropic API Error:", error);
    throw new Error(error?.error?.message || "Anthropic API call failed");
  }

  const result = await response.json();
  return result.content?.[0]?.text || "";
}

async function callOpenAI(systemPrompt: string, messages: any[]): Promise<string> {
  // Convert messages to OpenAI format (include system in messages array)
  const openAIMessages: any[] = [
    { role: "system", content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content
    }))
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: openAIMessages,
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("OpenAI API Error:", error);
    throw new Error(error?.error?.message || "OpenAI API call failed");
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "";
}

async function callAI(systemPrompt: string, messages: any[]): Promise<{ text: string; provider: string; model: string }> {
  // Round-robin: alternate between providers
  requestCounter++;
  const hasAnthropic = !!ANTHROPIC_API_KEY;
  const hasOpenAI = !!OPENAI_API_KEY;
  
  if (!hasAnthropic && !hasOpenAI) {
    throw new Error("No AI provider configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY");
  }
  
  let targetProvider: "anthropic" | "openai";
  if (!hasAnthropic) {
    targetProvider = "openai";
  } else if (!hasOpenAI) {
    targetProvider = "anthropic";
  } else {
    // Both available - use round-robin
    targetProvider = (requestCounter % 2 === 0) ? "openai" : "anthropic";
  }

  // Try the target provider, fallback to the other if it fails
  try {
    if (targetProvider === "anthropic") {
      const text = await callAnthropic(systemPrompt, messages);
      return { text, provider: "anthropic", model: ANTHROPIC_MODEL };
    } else {
      const text = await callOpenAI(systemPrompt, messages);
      return { text, provider: "openai", model: OPENAI_MODEL };
    }
  } catch (error) {
    console.warn(`⚠️ ${targetProvider} failed, trying fallback...`, error);
    
    // Fallback to the other provider
    const fallbackProvider = targetProvider === "anthropic" ? "openai" : "anthropic";
    
    if (fallbackProvider === "anthropic" && ANTHROPIC_API_KEY) {
      try {
        const text = await callAnthropic(systemPrompt, messages);
        return { text, provider: "anthropic", model: ANTHROPIC_MODEL };
      } catch (fallbackError) {
        throw new Error(`Both providers failed. Last error: ${fallbackError.message}`);
      }
    } else if (fallbackProvider === "openai" && OPENAI_API_KEY) {
      try {
        const text = await callOpenAI(systemPrompt, messages);
        return { text, provider: "openai", model: OPENAI_MODEL };
      } catch (fallbackError) {
        throw new Error(`Both providers failed. Last error: ${fallbackError.message}`);
      }
    }
    
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return res({ ok: true });

  try {
    let body;
    try {
      body = await req.json();
    } catch (_e) {
      return res(
        { error: "Valid JSON body is required" },
        400,
      );
    }

    const { prompt, mode = "chat", history = [], chatHistory = [] } = body;
    if (!prompt) return res({ error: "prompt required" }, 400);
    
    // استخدام chatHistory إذا كان متوفراً، وإلا history (للتوافق مع الكود القديم)
    const conversationHistory = chatHistory.length > 0 ? chatHistory : history;

    if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) {
      console.error("❌ No AI provider configured!");
      console.error("Available env vars:", Object.keys(Deno.env.toObject()).filter(k => !k.includes("SECRET")));
      return res({ 
        error: "لا يوجد مفتاح API للذكاء الاصطناعي مهيأ في Supabase Edge Functions",
        solution: "يرجى إضافة ANTHROPIC_API_KEY أو OPENAI_API_KEY في: Supabase Dashboard → Settings → Edge Functions → Add new secret",
        command: "supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx\nor\nsupabase secrets set OPENAI_API_KEY=sk-xxxxx"
      }, 500);
    }

    let systemInstruction = "";

    if (mode === "draft") {
      systemInstruction = `
أنت مساعد ذكي متخصص في منصة "أبيلي" - منصة سعودية لربط طالبي الخدمات بمقدميها.

مهمتك الأساسية:
1. **إنشاء عنوان** من النص المدخل (لا تنسخ النص حرفياً!)
2. **تصنيف الطلب** بناءً على فهمك العميق للمحتوى ومعرفتك العامة

═══════════════════════════════════════════════════════════════
🎯 تعليمات إنشاء العنوان:
═══════════════════════════════════════════════════════════════

⚠️ **قاعدة ذهبية**: استخدم فقط ما هو موجود في النص - لا تفترض معلومات غير موجودة!

📝 أمثلة:
- النص: "جيب لكزس 2005" → العنوان: "مطلوب جيب لكزس 2005"
- النص: "تصميم شعار" → العنوان: "مطلوب تصميم شعار"
- النص: "صيانة مكيف" → العنوان: "مطلوب صيانة مكيف"

🎯 قواعد:
1. ابدأ بـ "مطلوب" أو "أبغى" أو "ابحث عن"
2. لا تنسخ النص حرفياً - حوّله لعنوان مختصر
3. لا تفترض معلومات غير موجودة (قطع غيار، سبليت، مدينة، إلخ)
4. العنوان مختصر: 5-10 كلمات كحد أقصى

═══════════════════════════════════════════════════════════════
🧠 تعليمات التصنيف الذكي (مهم جداً):
═══════════════════════════════════════════════════════════════

**استخدم معرفتك العامة وفهمك العميق للمحتوى!**

🔍 **كيف تصنف:**
1. **افهم المحتوى بعمق**: استخدم معرفتك العامة عن الأطباق، الخدمات، المنتجات، إلخ
   - مثال: "معصوب يمني" → تعرف أنه طعام يمني → تصنفه "طبخ منزلي"
   - مثال: "مندي" → تعرف أنه طعام خليجي → تصنفه "طبخ منزلي"
   - مثال: "كبسة" → تعرف أنه طعام سعودي → تصنفه "طبخ منزلي"
   - مثال: "شاورما" → تعرف أنه طعام → تصنفه "طبخ منزلي"

2. **استخدم السياق**: لا تعتمد فقط على الكلمات، بل على المعنى
   - "جيب لكزس" → تعرف أنه سيارة → تصنفه "صيانة سيارات"
   - "تصميم شعار" → تعرف أنه تصميم جرافيك → تصنفه "تصميم جرافيك" + "شعارات وهوية"
   - "موقع إلكتروني" → تعرف أنه تطوير ويب → تصنفه "تطوير مواقع"

3. **فهم الثقافة المحلية**: استخدم معرفتك بالثقافة العربية والخليجية
   - الأطباق اليمنية (معصوب، حنيذ، مظبي) → "طبخ منزلي"
   - الأطباق السعودية (مندي، كبسة، مطبق) → "طبخ منزلي"
   - الأطباق الخليجية (مشاكيك، مشكل) → "طبخ منزلي"

4. **التصنيفات المتعددة**: اختر 2-5 تصنيفات عندما يناسب الطلب أكثر من تصنيف
   - "تصميم شعار لشركة" → ["تصميم جرافيك", "شعارات وهوية"]
   - "موقع إلكتروني مع تطبيق" → ["تطوير مواقع", "تطبيقات جوال"]
   - "صيانة جيب لكزس" → ["صيانة سيارات"]

═══════════════════════════════════════════════════════════════
📋 التصنيفات المتاحة (اختر منها حصرياً):
═══════════════════════════════════════════════════════════════

🔧 تقنية: "تطوير برمجيات" | "تطوير مواقع" | "تطبيقات جوال" | "دعم تقني" | "تحليل بيانات" | "خدمات ذكاء اصطناعي"
🎨 تصميم: "تصميم جرافيك" | "تصميم واجهات" | "شعارات وهوية" | "تصميم داخلي" | "تصميم معماري"
✍️ محتوى: "كتابة محتوى" | "كتابة إعلانية" | "ترجمة" | "تعليق صوتي" | "تدقيق لغوي"
📈 تسويق: "تسويق رقمي" | "سوشيال ميديا" | "تحسين محركات البحث" | "إعلانات"
💼 خدمات مهنية: "خدمات قانونية" | "محاسبة" | "استشارات" | "موارد بشرية"
📚 تعليم: "دروس خصوصية" | "دورات أونلاين" | "تعليم لغات" | "تدريب مهارات"
🏥 صحة: "استشارات طبية" | "تغذية" | "لياقة بدنية" | "صحة نفسية"
🔧 صيانة ومنزل: "سباكة" | "كهرباء" | "تكييف" | "إصلاحات منزلية" | "صيانة أجهزة" | "دهانات" | "نجارة"
🚚 نقل: "نقل عفش" | "شحن" | "توصيل"
🚗 سيارات: "صيانة سيارات" | "غسيل سيارات" | "تأجير سيارات" | "خدمات سائق"
🎉 مناسبات: "تنظيم مناسبات" | "تموين" | "تصوير" | "تصوير فيديو" | "ترفيه" | "زهور وتزيين"
💅 جمال وعناية: "تصفيف شعر" | "مكياج" | "سبا ومساج" | "أظافر"
🧹 تنظيف: "تنظيف منازل" | "تنظيف مكاتب" | "غسيل وكي" | "مكافحة حشرات"
🍽️ طعام: "طبخ منزلي" | "مطاعم" | "حلويات ومخبوزات" | "تموين طعام"
🏘️ عقارات: "عقارات" | "إدارة عقارات"
🐱 حيوانات: "رعاية حيوانات" | "تجميل حيوانات"
🛡️ أمن: "خدمات أمنية" | "كاميرات مراقبة"
📦 أخرى: "أخرى" (فقط إذا لم يناسب أي تصنيف أعلاه)

🚨 قواعد التصنيف النهائية:
1. **استخدم فهمك العميق** - لا تعتمد على مطابقة كلمات فقط، بل على فهم المعنى
2. **استخدم معرفتك العامة** - عن الأطباق، الخدمات، المنتجات، الثقافة المحلية
3. **اختر فقط من القائمة أعلاه** - لا تختلق تصنيفات جديدة أبداً
4. **اختر تصنيفات متعددة** - 2-5 تصنيفات في معظم الحالات
5. **استخدم "أخرى" فقط كحل أخير** - إذا لم يناسب الطلب أي تصنيف من القائمة
6. **التصنيفات بالنص العربي الدقيق** - استخدم نفس النص كما في القائمة

═══════════════════════════════════════════════════════════════

أجب بـ JSON فقط بهذا التنسيق (بدون أي نص آخر):
{
  "title": "عنوان مختصر يبدأ بـ 'مطلوب' أو 'أبغى' - لا تنسخ النص المدخل حرفياً!",
  "categories": ["فئة1", "فئة2", "فئة3", ...]
}

ملاحظات مهمة:
- **"title"**: عنوان مختصر (5-10 كلمات) يبدأ بكلمة طلبية - لا تنسخ النص المدخل حرفياً!
- **"categories"**: قائمة التصنيفات (2-5 تصنيفات في معظم الحالات) من القائمة أعلاه
  ⚠️ **مهم جداً**: اختر تصنيفات متعددة! لا تكتفي بتصنيف واحد إلا إذا كان الطلب بسيط جداً
  أمثلة:
  - "صيانة جيب لكزس" → ["صيانة سيارات", "قطع غيار"]
  - "تصميم شعار لشركة" → ["تصميم جرافيك", "شعارات وهوية"]
  - "موقع إلكتروني مع تطبيق" → ["تطوير مواقع", "تطبيقات جوال"]
  - "تنظيف مكتب" → ["تنظيف مكاتب"] (تصنيف واحد كافٍ)
- لا تستخرج ميزانية، موقع، أو مدة تنفيذ - هذه الحقول غير مطلوبة
- لا تعيد صياغة الوصف - فقط العنوان والتصنيفات`;
    } else {
      // Default Chat Mode (original behavior)
      systemInstruction = `أنت مساعد ذكي لمنصة "أبيلي" (منصة طلبات خدمات).
- بلهجة سعودية ودودة وقصيرة.
- هدفك جمع معلومتين: (وصف الخدمة) و (المدينة).
- بمجرد توفر الوصف والمدينة، اجعل is_ready_to_send = true.

أجب بـ JSON فقط:
{
  "title": "عنوان الطلب",
  "city": "المدينة",
  "description_brief": "وصف مختصر",
  "response_to_user": "ردك للمستخدم",
  "is_ready_to_send": boolean
}`;
    }

    // تحويل chatHistory إلى تنسيق Claude
    const claudeMessages: any[] = conversationHistory.map((msg: any) => ({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.text || msg.parts?.[0]?.text || ''
    }));
    
    // إضافة الرسالة الحالية
    claudeMessages.push({
      role: 'user',
      content: prompt
    });

    // استدعاء AI (Anthropic أو OpenAI)
    const { text: rawOutput, provider, model } = await callAI(systemInstruction, claudeMessages);
    console.log(`✅ ${provider} (${model}) response received`);
    
    // محاولة استخراج JSON
    let parsed;
    try {
      // Try to extract JSON from response
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/) || rawOutput.match(/```json\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawOutput;
      parsed = JSON.parse(jsonStr.trim());
    } catch (_e) {
      console.warn("Failed to parse JSON, using raw output");
      parsed = { 
        aiResponse: rawOutput,
        isClarification: true 
      };
    }

    // معالجة التصنيفات في وضع draft
    if (mode === "draft") {
      const validCategories: string[] = [];
      
      // دالة لتنظيف التصنيف من علامات الاستفهام والنصوص الغريبة
      const cleanCategory = (cat: string): string => {
        if (!cat) return cat;
        let cleaned = cat.replace(/[؟?؟]/g, '').trim();
        cleaned = cleaned.split(/[؟?؟]/)[0].trim();
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        return cleaned;
      };
      
      // معالجة التصنيفات فقط
      if (parsed.categories && Array.isArray(parsed.categories)) {
        for (const cat of parsed.categories) {
          const cleanedCat = cleanCategory(cat);
          if (!cleanedCat || cleanedCat.toLowerCase() === 'أخرى' || cleanedCat.toLowerCase() === 'other') continue;
          
          // محاولة إيجاد أفضل تطابق
          const bestMatch = findBestMatchingCategory(cleanedCat);
          
          if (bestMatch) {
            // إضافة التصنيف المطابق
            if (!validCategories.includes(bestMatch.label)) {
              validCategories.push(bestMatch.label);
            }
          } else if (isKnownCategory(cleanedCat)) {
            // إذا لم نجد تطابقاً جيداً، نتحقق من التصنيفات المعروفة
            const matchedCat = FIXED_CATEGORIES.find(fc => 
              fc.label.toLowerCase() === cleanedCat.toLowerCase() ||
              fc.label.toLowerCase().includes(cleanedCat.toLowerCase()) ||
              cleanedCat.toLowerCase().includes(fc.label.toLowerCase())
            );
            if (matchedCat && !validCategories.includes(matchedCat.label)) {
              validCategories.push(matchedCat.label);
            }
          }
          // إذا لم نجد تطابقاً، نتجاهل التصنيف (لن نضيف تصنيفات غير معروفة)
        }
      }
      
      // إذا لم يكن هناك تصنيفات صحيحة، نضيف "أخرى" فقط كحل أخير
      if (validCategories.length === 0) {
        console.log("⚠️ لم يتم العثور على تصنيفات صحيحة، إضافة 'أخرى'");
        validCategories.push("أخرى");
      } else {
        console.log(`✅ تم العثور على ${validCategories.length} تصنيف(ات): ${validCategories.join(', ')}`);
      }
      
      parsed.categories = [...new Set(validCategories)]; // إزالة التكرار
      
      // إزالة الحقول غير المطلوبة
      delete parsed.uncertainCategories;
      delete parsed.suggestedCategory;
      delete parsed.description;
      delete parsed.budgetMin;
      delete parsed.budgetMax;
      delete parsed.deliveryTime;
      delete parsed.location;
    }

    return res({
      ...parsed,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Error in ai-chat:", e);
    return res({ error: String(e) }, 500);
  }
});
