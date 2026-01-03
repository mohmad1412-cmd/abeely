import { Category, Request, Offer, Notification, Review } from './types';

/**
 * قائمة التصنيفات الشاملة مع دعم متعدد اللغات
 * - label: العربية (الافتراضي)
 * - label_en: الإنجليزية
 * - label_ur: الأوردية
 * - icon: اسم أيقونة lucide-react
 * - emoji: fallback للإيموجي
 */
export const AVAILABLE_CATEGORIES: Category[] = [
  // تقنية
  { id: 'software-dev', label: 'تطوير برمجيات', label_en: 'Software Development', label_ur: 'سافٹ ویئر ڈویلپمنٹ', icon: 'Code', emoji: '💻' },
  { id: 'web-dev', label: 'تطوير مواقع', label_en: 'Web Development', label_ur: 'ویب ڈویلپمنٹ', icon: 'Globe', emoji: '🌐' },
  { id: 'mobile-apps', label: 'تطبيقات جوال', label_en: 'Mobile Apps', label_ur: 'موبائل ایپس', icon: 'Smartphone', emoji: '📱' },
  { id: 'it-support', label: 'دعم تقني', label_en: 'IT Support', label_ur: 'آئی ٹی سپورٹ', icon: 'Headphones', emoji: '🎧' },
  { id: 'data-analysis', label: 'تحليل بيانات', label_en: 'Data Analysis', label_ur: 'ڈیٹا تجزیہ', icon: 'BarChart', emoji: '📊' },
  { id: 'ai-services', label: 'خدمات ذكاء اصطناعي', label_en: 'AI Services', label_ur: 'اے آئی خدمات', icon: 'Brain', emoji: '🧠' },
  
  // تصميم
  { id: 'graphic-design', label: 'تصميم جرافيك', label_en: 'Graphic Design', label_ur: 'گرافک ڈیزائن', icon: 'Palette', emoji: '🎨' },
  { id: 'ui-ux', label: 'تصميم واجهات', label_en: 'UI/UX Design', label_ur: 'یو آئی ڈیزائن', icon: 'Layout', emoji: '📐' },
  { id: 'logo-branding', label: 'شعارات وهوية', label_en: 'Logo & Branding', label_ur: 'لوگو اور برانڈنگ', icon: 'Figma', emoji: '✨' },
  { id: 'interior-design', label: 'تصميم داخلي', label_en: 'Interior Design', label_ur: 'انٹیریئر ڈیزائن', icon: 'Sofa', emoji: '🛋️' },
  { id: 'architectural', label: 'تصميم معماري', label_en: 'Architectural Design', label_ur: 'تعمیراتی ڈیزائن', icon: 'Building2', emoji: '🏗️' },
  
  // محتوى
  { id: 'content-writing', label: 'كتابة محتوى', label_en: 'Content Writing', label_ur: 'مواد لکھنا', icon: 'FileText', emoji: '📝' },
  { id: 'copywriting', label: 'كتابة إعلانية', label_en: 'Copywriting', label_ur: 'کاپی رائٹنگ', icon: 'PenTool', emoji: '✍️' },
  { id: 'translation', label: 'ترجمة', label_en: 'Translation', label_ur: 'ترجمہ', icon: 'Languages', emoji: '🌍' },
  { id: 'voice-over', label: 'تعليق صوتي', label_en: 'Voice Over', label_ur: 'وائس اوور', icon: 'Mic', emoji: '🎙️' },
  { id: 'proofreading', label: 'تدقيق لغوي', label_en: 'Proofreading', label_ur: 'پروف ریڈنگ', icon: 'Check', emoji: '✔️' },
  
  // تسويق
  { id: 'digital-marketing', label: 'تسويق رقمي', label_en: 'Digital Marketing', label_ur: 'ڈیجیٹل مارکیٹنگ', icon: 'TrendingUp', emoji: '📈' },
  { id: 'social-media', label: 'سوشيال ميديا', label_en: 'Social Media', label_ur: 'سوشل میڈیا', icon: 'Share2', emoji: '📲' },
  { id: 'seo', label: 'تحسين محركات البحث', label_en: 'SEO', label_ur: 'ایس ای او', icon: 'Search', emoji: '🔍' },
  { id: 'advertising', label: 'إعلانات', label_en: 'Advertising', label_ur: 'اشتہارات', icon: 'Megaphone', emoji: '📣' },
  
  // خدمات مهنية
  { id: 'legal-services', label: 'خدمات قانونية', label_en: 'Legal Services', label_ur: 'قانونی خدمات', icon: 'Scale', emoji: '⚖️' },
  { id: 'accounting', label: 'محاسبة', label_en: 'Accounting', label_ur: 'اکاؤنٹنگ', icon: 'Calculator', emoji: '🧮' },
  { id: 'consulting', label: 'استشارات', label_en: 'Consulting', label_ur: 'مشاورت', icon: 'MessageSquare', emoji: '💬' },
  { id: 'hr-services', label: 'موارد بشرية', label_en: 'HR Services', label_ur: 'ایچ آر خدمات', icon: 'Users', emoji: '👥' },
  
  // تعليم
  { id: 'tutoring', label: 'دروس خصوصية', label_en: 'Tutoring', label_ur: 'ٹیوشن', icon: 'GraduationCap', emoji: '🎓' },
  { id: 'online-courses', label: 'دورات أونلاين', label_en: 'Online Courses', label_ur: 'آن لائن کورسز', icon: 'Monitor', emoji: '🖥️' },
  { id: 'language-learning', label: 'تعليم لغات', label_en: 'Language Learning', label_ur: 'زبان سیکھنا', icon: 'BookOpen', emoji: '📖' },
  { id: 'skills-training', label: 'تدريب مهارات', label_en: 'Skills Training', label_ur: 'ہنر کی تربیت', icon: 'Target', emoji: '🎯' },
  
  // صحة
  { id: 'medical-consult', label: 'استشارات طبية', label_en: 'Medical Consultation', label_ur: 'طبی مشاورت', icon: 'Stethoscope', emoji: '🩺' },
  { id: 'nutrition', label: 'تغذية', label_en: 'Nutrition', label_ur: 'غذائیت', icon: 'Apple', emoji: '🍎' },
  { id: 'fitness', label: 'لياقة بدنية', label_en: 'Fitness', label_ur: 'فٹنس', icon: 'Dumbbell', emoji: '💪' },
  { id: 'mental-health', label: 'صحة نفسية', label_en: 'Mental Health', label_ur: 'ذہنی صحت', icon: 'Heart', emoji: '❤️' },
  
  // صيانة ومنزل
  { id: 'plumbing', label: 'سباكة', label_en: 'Plumbing', label_ur: 'پلمبنگ', icon: 'Droplet', emoji: '🔧' },
  { id: 'electrical', label: 'كهرباء', label_en: 'Electrical', label_ur: 'بجلی', icon: 'Zap', emoji: '⚡' },
  { id: 'ac-services', label: 'تكييف', label_en: 'AC Services', label_ur: 'اے سی خدمات', icon: 'Wind', emoji: '❄️' },
  { id: 'home-repair', label: 'إصلاحات منزلية', label_en: 'Home Repair', label_ur: 'گھر کی مرمت', icon: 'Hammer', emoji: '🔨' },
  { id: 'appliance-repair', label: 'صيانة أجهزة', label_en: 'Appliance Repair', label_ur: 'آلات کی مرمت', icon: 'Settings', emoji: '⚙️' },
  { id: 'painting', label: 'دهانات', label_en: 'Painting', label_ur: 'پینٹنگ', icon: 'Paintbrush', emoji: '🖌️' },
  { id: 'carpentry', label: 'نجارة', label_en: 'Carpentry', label_ur: 'بڑھئی گری', icon: 'Axe', emoji: '🪓' },
  
  // نقل
  { id: 'moving', label: 'نقل عفش', label_en: 'Moving Services', label_ur: 'سامان منتقلی', icon: 'Truck', emoji: '🚚' },
  { id: 'shipping', label: 'شحن', label_en: 'Shipping', label_ur: 'شپنگ', icon: 'Package', emoji: '📦' },
  { id: 'delivery', label: 'توصيل', label_en: 'Delivery', label_ur: 'ڈیلیوری', icon: 'MapPin', emoji: '📍' },
  
  // سيارات
  { id: 'car-repair', label: 'صيانة سيارات', label_en: 'Car Repair', label_ur: 'گاڑی کی مرمت', icon: 'Car', emoji: '🚗' },
  { id: 'car-wash', label: 'غسيل سيارات', label_en: 'Car Wash', label_ur: 'گاڑی دھلائی', icon: 'Droplets', emoji: '💧' },
  { id: 'car-rental', label: 'تأجير سيارات', label_en: 'Car Rental', label_ur: 'گاڑی کرایہ', icon: 'Key', emoji: '🔑' },
  { id: 'driver-services', label: 'خدمات سائق', label_en: 'Driver Services', label_ur: 'ڈرائیور خدمات', icon: 'UserCheck', emoji: '👨‍✈️' },
  
  // مناسبات
  { id: 'event-planning', label: 'تنظيم مناسبات', label_en: 'Event Planning', label_ur: 'تقریب کی منصوبہ بندی', icon: 'Calendar', emoji: '📅' },
  { id: 'catering', label: 'تموين', label_en: 'Catering', label_ur: 'کیٹرنگ', icon: 'UtensilsCrossed', emoji: '🍴' },
  { id: 'photography', label: 'تصوير', label_en: 'Photography', label_ur: 'فوٹوگرافی', icon: 'Camera', emoji: '📷' },
  { id: 'videography', label: 'تصوير فيديو', label_en: 'Videography', label_ur: 'ویڈیو گرافی', icon: 'Video', emoji: '🎬' },
  { id: 'entertainment', label: 'ترفيه', label_en: 'Entertainment', label_ur: 'تفریح', icon: 'Music', emoji: '🎵' },
  { id: 'flowers-decor', label: 'زهور وتزيين', label_en: 'Flowers & Decor', label_ur: 'پھول اور سجاوٹ', icon: 'Flower', emoji: '💐' },
  
  // جمال وعناية
  { id: 'hair-styling', label: 'تصفيف شعر', label_en: 'Hair Styling', label_ur: 'بالوں کا اسٹائل', icon: 'Scissors', emoji: '✂️' },
  { id: 'makeup', label: 'مكياج', label_en: 'Makeup', label_ur: 'میک اپ', icon: 'Sparkles', emoji: '💄' },
  { id: 'spa-massage', label: 'سبا ومساج', label_en: 'Spa & Massage', label_ur: 'سپا اور مساج', icon: 'Flower2', emoji: '🌸' },
  { id: 'nails', label: 'أظافر', label_en: 'Nails', label_ur: 'ناخن', icon: 'Hand', emoji: '💅' },
  
  // تنظيف
  { id: 'home-cleaning', label: 'تنظيف منازل', label_en: 'Home Cleaning', label_ur: 'گھر کی صفائی', icon: 'Home', emoji: '🏠' },
  { id: 'office-cleaning', label: 'تنظيف مكاتب', label_en: 'Office Cleaning', label_ur: 'دفتر کی صفائی', icon: 'Building', emoji: '🏢' },
  { id: 'laundry', label: 'غسيل وكي', label_en: 'Laundry', label_ur: 'لانڈری', icon: 'Shirt', emoji: '👔' },
  { id: 'pest-control', label: 'مكافحة حشرات', label_en: 'Pest Control', label_ur: 'کیڑے مکوڑے کنٹرول', icon: 'Bug', emoji: '🐛' },
  
  // طعام
  { id: 'cooking', label: 'طبخ منزلي', label_en: 'Home Cooking', label_ur: 'گھر کا کھانا', icon: 'ChefHat', emoji: '👨‍🍳' },
  { id: 'baking', label: 'حلويات ومخبوزات', label_en: 'Baking', label_ur: 'بیکنگ', icon: 'Cake', emoji: '🎂' },
  { id: 'catering-food', label: 'تموين طعام', label_en: 'Food Catering', label_ur: 'کھانے کی کیٹرنگ', icon: 'Soup', emoji: '🍲' },
  
  // عقارات
  { id: 'real-estate', label: 'عقارات', label_en: 'Real Estate', label_ur: 'رئیل اسٹیٹ', icon: 'Building2', emoji: '🏘️' },
  { id: 'property-mgmt', label: 'إدارة عقارات', label_en: 'Property Management', label_ur: 'جائیداد کا انتظام', icon: 'KeyRound', emoji: '🔐' },
  
  // حيوانات أليفة
  { id: 'pet-care', label: 'رعاية حيوانات', label_en: 'Pet Care', label_ur: 'پالتو جانوروں کی دیکھ بھال', icon: 'Cat', emoji: '🐱' },
  { id: 'pet-grooming', label: 'تجميل حيوانات', label_en: 'Pet Grooming', label_ur: 'پالتو جانوروں کی گرومنگ', icon: 'Sparkle', emoji: '✨' },
  
  // أمن وحماية
  { id: 'security', label: 'خدمات أمنية', label_en: 'Security Services', label_ur: 'سیکیورٹی خدمات', icon: 'Shield', emoji: '🛡️' },
  { id: 'cctv', label: 'كاميرات مراقبة', label_en: 'CCTV Installation', label_ur: 'سی سی ٹی وی', icon: 'Cctv', emoji: '📹' },
  
  // أخرى
  { id: 'other', label: 'أخرى', label_en: 'Other', label_ur: 'دیگر', icon: 'Grid3x3', emoji: '📦' },
];

export const MOCK_REQUESTS: Request[] = [
  {
    id: '1',
    title: 'تطوير متجر إلكتروني متكامل',
    description: 'أبحث عن مطور خبير لإنشاء متجر إلكتروني يدعم الدفع الإلكتروني والشحن باستخدام React و Node.js.',
    author: 'أحمد محمد',
    createdAt: new Date('2024-05-10'),
    status: 'active',
    isPublic: true,
    budgetType: 'fixed',
    budgetMin: '12000',
    budgetMax: '15000',
    location: 'الرياض',
    categories: ['tech', 'marketing'],
    deliveryTimeType: 'range',
    deliveryTimeFrom: '30 يوم',
    deliveryTimeTo: '45 يوم',
    messages: [],
    offers: [], // Offers are populated in MOCK_OFFERS linked by requestId
    images: ['https://picsum.photos/400/200?random=1', 'https://picsum.photos/400/200?random=10'],
    contactMethod: 'both',
    whatsappNumber: '966501234567'
  },

  {
    id: '4',
    title: 'تصميم داخلي لفيلا مودرن مساحة 400م - تفاصيل شاملة',
    description: `السلام عليكم، أبحث عن مهندس ديكور محترف لتصميم فيلا مودرن.
    
    التفاصيل المطلوبة بدقة:
    1. تصميم مجلس الرجال: أريد طابعاً رسمياً حديثاً مع دمج الخشب والرخام، الإضاءة تكون مخفية (Hidden Lights) مع نجفة مركزية.
    2. الصالة العائلية: مفتوحة على المطبخ (American Style)، الألوان فاتحة (بيج، رمادي فاتح)، وأحتاج استغلال المساحة تحت الدرج.
    3. غرف النوم: 
       - الماستر: تحتوي على ركن ملابس (Walk-in Closet) وحمام خاص بتصميم فندقي.
       - غرف الأطفال: عدد 2، ألوان مبهجة لكن غير مزعجة، مع مكاتب للدراسة.
    4. الحديقة الخارجية: جلسة شواء، مسبح صغير، وتشجير بسيط لا يحتاج صيانة كثيرة.
    
    المطلوب تسليمه:
    - مخططات 2D توزيع الأثاث.
    - مناظير 3D واقعية (Renders).
    - مخططات تنفيذية (كهرباء، سباكة، أسقف).
    - جدول كميات ومواصفات للمواد.
    
    ملاحظة: الميزانية مرنة للجودة العالية، وأفضل من لديه سابقة أعمال مشابهة.`,
    author: 'أحمد محمد',
    createdAt: new Date('2024-05-15'),
    status: 'active',
    isPublic: true,
    budgetType: 'negotiable',
    budgetMin: '5000',
    budgetMax: '8000',
    location: 'الرياض',
    categories: ['engineering', 'design'],
    deliveryTimeType: 'range',
    deliveryTimeFrom: '20 يوم',
    images: [
      'https://picsum.photos/400/300?random=100',
      'https://picsum.photos/400/300?random=101',
      'https://picsum.photos/400/300?random=102',
      'https://picsum.photos/400/300?random=103',
      'https://picsum.photos/400/300?random=104'
    ],
    messages: [],
    offers: [],
    contactMethod: 'chat',
    locationCoords: {
      lat: 24.7136,
      lng: 46.6753,
      address: 'حي العليا، الرياض'
    }
  },
  // New request with exact location
  {
    id: '5',
    title: 'تركيب كاميرات مراقبة للفيلا',
    description: 'أحتاج تركيب 8 كاميرات مراقبة خارجية وداخلية مع جهاز DVR وتطبيق للمتابعة عن بعد.',
    author: 'أحمد محمد',
    createdAt: new Date('2024-05-18'),
    status: 'active',
    isPublic: true,
    budgetType: 'negotiable',
    budgetMin: '2000',
    budgetMax: '4000',
    location: 'حي النرجس، الرياض',
    categories: ['tech', 'maintenance'],
    deliveryTimeType: 'range',
    deliveryTimeFrom: '3 أيام',
    deliveryTimeTo: '7 أيام',
    messages: [],
    offers: [],
    images: ['https://picsum.photos/400/300?random=30'],
    contactMethod: 'both',
    whatsappNumber: '966551112233',
    locationCoords: {
      lat: 24.8231,
      lng: 46.7183,
      address: 'حي النرجس، شارع الأمير محمد بن عبدالعزيز'
    }
  },


  {
    id: '2',
    title: 'صيانة مكيفات سبليت',
    description: 'عندي 3 مكيفات سبليت تحتاج تنظيف وتعبئة فريون.',
    author: 'أحمد محمد',
    createdAt: new Date('2024-05-12'),
    status: 'assigned',
    isPublic: true,
    acceptedOfferId: '102',
    acceptedOfferProvider: 'ورشة السلام',
    budgetType: 'negotiable',
    budgetMin: '300',
    budgetMax: '500',
    location: 'جدة',
    categories: ['maintenance'],
    deliveryTimeType: 'immediate',
    messages: [],
    offers: [],
    images: ['https://picsum.photos/400/200?random=2'],
    contactMethod: 'whatsapp',
    whatsappNumber: '966509876543',
    isCreatedViaWhatsApp: true
  },

  {
    id: '3',
    title: 'نقل عفش داخل الرياض',
    description: 'نقل غرفة نوم ومجلس من حي الملقا إلى حي الياسمين.',
    author: 'سارة أحمد',
    createdAt: new Date('2024-05-14'),
    status: 'active',
    isPublic: true,
    budgetType: 'fixed',
    budgetMin: '500',
    budgetMax: '800',
    location: 'الرياض',
    categories: ['transport'],
    deliveryTimeType: 'immediate',
    messages: [],
    offers: [],
    images: [],
    contactMethod: 'both',
    whatsappNumber: '966505551234'
  }

];

export const MOCK_OFFERS: Offer[] = [
  {
    id: '101',
    requestId: '1',
    providerName: 'سعيد التقني',
    title: 'عرض تطوير المتجر الشامل',
    description: 'يمكنني تنفيذ المتجر باستخدام أحدث التقنيات مع ضمان صيانة لمدة 3 أشهر.',
    price: '13000',
    deliveryTime: '40 يوم',
    status: 'pending',
    createdAt: new Date(),
    isNegotiable: true,
    location: 'الدمام',
    images: []
  },
  {
    id: '105',
    requestId: '1',
    providerName: 'شركة البناء السريع',
    title: 'عرض نهائي غير قابل للتفاوض',
    description: 'السعر يشمل الاستضافة والدومين. العرض نهائي وغير قابل للتغيير نظراً لضغط العمل.',
    price: '11000',
    deliveryTime: '30 يوم',
    status: 'pending',
    createdAt: new Date(),
    isNegotiable: false, // Non-negotiable
    location: 'الرياض'
  },
  {
    id: '102',
    requestId: '2',
    providerName: 'ورشة السلام',
    title: 'صيانة شاملة',
    description: 'سأقوم بالتنظيف والتعبئة وضمان شهر على التهريب.',
    price: '450',
    deliveryTime: 'اليوم',
    status: 'accepted',
    createdAt: new Date('2024-05-12'),
    isNegotiable: false,
    location: 'جدة'
  },
  {
    id: '103',
    requestId: '1',
    providerName: 'حلول الويب',
    title: 'متجر احترافي',
    description: 'عرض يشمل التصميم والاستضافة لمدة سنة.',
    price: '14500',
    deliveryTime: '35 يوم',
    status: 'negotiating',
    createdAt: new Date(),
    isNegotiable: true,
    location: 'الرياض',
    images: ['https://picsum.photos/400/300?random=50', 'https://picsum.photos/400/300?random=51']
  },
  // New offers with images
  {
    id: '104',
    requestId: '4',
    providerName: 'مكتب الإبداع للتصميم',
    title: 'تصميم فيلا مودرن كامل',
    description: 'خبرة 15 سنة في التصميم الداخلي. سأقدم لك تصميم 3D كامل مع جميع المخططات التنفيذية.',
    price: '7500',
    deliveryTime: '25 يوم',
    status: 'pending',
    createdAt: new Date('2024-05-16'),
    isNegotiable: true,
    location: 'الرياض',
    images: ['https://picsum.photos/400/300?random=60', 'https://picsum.photos/400/300?random=61', 'https://picsum.photos/400/300?random=62']
  },
  {
    id: '106',
    requestId: '4',
    providerName: 'شركة الديكور العصري',
    title: 'تصميم فاخر بأفضل المواد',
    description: 'نقدم تصميم فاخر مع استخدام أفضل الخامات الإيطالية. السعر يشمل الإشراف على التنفيذ.',
    price: '12000',
    deliveryTime: '45 يوم',
    status: 'pending',
    createdAt: new Date('2024-05-17'),
    isNegotiable: false,
    location: 'الرياض',
    images: ['https://picsum.photos/400/300?random=70', 'https://picsum.photos/400/300?random=71']
  }
];


// Link offers to requests for mock purposes
MOCK_REQUESTS.forEach(req => {
  req.offers = MOCK_OFFERS.filter(offer => offer.requestId === req.id);
});

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'system',
    title: 'مرحباً بك في منصة خدماتي',
    message: 'نتمنى لك تجربة موفقة في إنجاز أعمالك.',
    timestamp: new Date('2024-05-01'),
    isRead: true
  },
  {
    id: '2',
    type: 'offer',
    title: 'عرض جديد على طلبك',
    message: 'تلقيت عرضاً جديداً على طلب "تطوير متجر إلكتروني"',
    timestamp: new Date(),
    isRead: false
  }
];

export const MOCK_REVIEWS: Review[] = [
  {
    id: '1',
    authorName: 'سارة أحمد',
    rating: 5,
    comment: 'عمل ممتاز واحترافي جداً، أنصح بالتعامل معه.',
    date: new Date('2024-04-15'),
    role: 'requester'
  },
  {
    id: '2',
    authorName: 'شركة الأفق',
    rating: 4,
    comment: 'جودة جيدة والتزام بالوقت، لكن التواصل كان يمكن أن يكون أفضل.',
    date: new Date('2024-03-20'),
    role: 'requester'
  }
];