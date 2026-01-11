export interface Request {
  id: string;
  title: string;
  description: string;
  author: string;
  createdAt: Date;
  updatedAt?: Date;
  status: "active" | "assigned" | "completed" | "archived";
  messages: Message[];
  offers: Offer[];
  isPublic?: boolean;
  acceptedOfferId?: string;
  acceptedOfferProvider?: string;
  budgetMin?: string;
  budgetMax?: string;
  budgetType?: "not-specified" | "negotiable" | "fixed";
  location?: string;
  categories?: string[];
  deliveryTimeType?: "immediate" | "range" | "not-specified";
  deliveryTimeFrom?: string;
  deliveryTimeTo?: string;
  seriousness?: number; // 1 منخفض - 5 مرتفع جداً
  images?: string[]; // Changed from single image to array
  // Contact method preferences
  contactMethod?: "whatsapp" | "chat" | "both";
  whatsappNumber?: string;
  isCreatedViaWhatsApp?: boolean; // If created via WhatsApp agent, only WhatsApp contact is available
  // Author details
  source?: "platform" | "whatsapp"; // Where the request originated
  authorName?: string; // Display name of the author
  authorFirstName?: string; // First name initial
  authorLastName?: string; // Last name initial
  showAuthorName?: boolean; // هل يريد صاحب الطلب إظهار اسمه لمقدمي العروض المعتمدين
  requestNumber?: string; // رقم الطلب للعرض (آخر 4 أرقام من ID)
  // Location coordinates
  locationCoords?: {
    lat: number;
    lng: number;
    address?: string;
  };
  // Stats
  viewCount?: number;
  offersCount?: number;
}

export interface Offer {
  id: string;
  requestId: string;
  providerId?: string; // معرف مقدم الخدمة في قاعدة البيانات
  providerName: string;
  providerAvatar?: string;
  title: string;
  description: string;
  price: string;
  deliveryTime: string;
  status:
    | "pending"
    | "accepted"
    | "rejected"
    | "negotiating"
    | "cancelled"
    | "completed";
  createdAt: Date;
  updatedAt?: Date;
  isNegotiable?: boolean;
  location?: string;
  images?: string[];
  relatedRequest?: Request;
}

export interface Message {
  id: string;
  content: string;
  sender: "user" | "system" | "ai" | "provider" | "requester";
  timestamp: Date;
  // For AI draft generation
  isDraftPreview?: boolean;
  draftData?: Partial<Request>;
}

export interface Category {
  id: string;
  label: string; // العربية (الافتراضي)
  label_en?: string; // الإنجليزية
  label_ur?: string; // الأوردية
  icon?: string; // اسم أيقونة lucide
  emoji?: string; // fallback للإيموجي
  description?: string;
  group?: string; // لتقسيم التصنيفات في شاشة البداية
}

// اللغات المدعومة
export type SupportedLocale = "ar" | "en" | "ur";

// دالة للحصول على label بناءً على اللغة
export function getCategoryLabel(
  category: Category,
  locale: SupportedLocale = "ar",
): string {
  switch (locale) {
    case "en":
      return category.label_en || category.label;
    case "ur":
      return category.label_ur || category.label;
    default:
      return category.label;
  }
}

export interface Notification {
  id: string;
  type: "offer" | "message" | "status" | "system" | "interest";
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  linkTo?: string;
  // بيانات إضافية للربط بالأسماء الحقيقية
  relatedRequest?: {
    id: string;
    title: string;
    authorName?: string;
  };
  relatedOffer?: {
    id: string;
    title: string;
    providerName: string;
  };
  relatedMessage?: {
    id: string;
    senderName: string;
    preview: string;
  };
}

export interface Review {
  id: string;
  requestId: string;
  reviewerId: string;
  revieweeId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: Date;
  updatedAt?: Date;
  requestTitle?: string;
  requestStatus?: string;
  // Legacy fields for compatibility
  authorName?: string;
  authorAvatar?: string;
  date?: Date;
  role?: "provider" | "requester";
}

export interface UserRating {
  userId: string;
  averageRating: number; // 0.00 - 5.00
  totalReviews: number;
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
  updatedAt: Date;
}

export type CreateReviewInput = {
  requestId: string;
  revieweeId: string;
  rating: number; // 1-5
  comment?: string; // 10-1000 characters
};

export type UpdateReviewInput = {
  rating?: number; // 1-5
  comment?: string; // 10-1000 characters
};

export type ReviewFilters = {
  minRating?: number; // 1-5
  maxRating?: number; // 1-5
  searchQuery?: string;
  sortBy?: "newest" | "oldest" | "highest" | "lowest";
  page?: number;
  pageSize?: number; // default: 10
};

export type HomePageConfig =
  | "marketplace:all" // السوق (كل الطلبات)
  | "marketplace:interests" // السوق (اهتماماتي)
  | "my-requests:all" // طلباتي (كل طلباتي)
  | "my-requests:active" // طلباتي (الطلبات النشطة)
  | "my-requests:approved" // طلباتي (الطلبات المعتمدة)
  | "my-offers:all" // عروضي (كل عروضي)
  | "my-offers:pending" // عروضي (عروضي قيد الانتظار)
  | "my-offers:accepted"; // عروضي (عروضي المقبولة)

export interface UserPreferences {
  interestedCategories: string[];
  interestedCities: string[];
  radarWords: string[];
  notifyOnInterest: boolean;
  roleMode: "requester" | "provider"; // Profile toggle
  showNameToApprovedProvider: boolean; // إظهار الاسم لمقدم العرض المعتمد
  homePage?: HomePageConfig; // صفحة البداية المخصصة
}

export type AppMode = "requests" | "offers";
export type ViewState =
  | "dashboard"
  | "marketplace"
  | "request-detail"
  | "offer-detail"
  | "profile"
  | "settings"
  | "create-request"
  | "messages"
  | "conversation";
