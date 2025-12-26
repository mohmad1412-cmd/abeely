import { Category, Request, Offer, Notification, Review } from './types';

export const AVAILABLE_CATEGORIES: Category[] = [
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