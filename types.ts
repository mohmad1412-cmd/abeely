export interface Request {
  id: string;
  title: string;
  description: string;
  author: string;
  authorId?: string; // معرف صاحب الطلب للتحقق من الملكية
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

export interface AppNotification {
  id: string;
  type:
    | "offer"
    | "message"
    | "status"
    | "system"
    | "interest"
    | "offer_accepted"
    | "view_request"
    | "view_offer"
    | "negotiation"
    | "request_completed";
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
  | "conversation"
  | "my-requests"
  | "my-offers";

export type AppView =
  | "splash"
  | "auth"
  | "onboarding"
  | "main"
  | "connection-error";

export type RequestInsert = {
  id?: string;
  author_id?: string;
  title: string;
  description: string;
  status: "active" | "assigned" | "completed" | "archived";
  is_public: boolean;
  budget_min?: string;
  budget_max?: string;
  budget_type?: "not-specified" | "negotiable" | "fixed";
  location?: string;
  delivery_type?: "not-specified" | "pickup" | "delivery" | "both";
  delivery_from?: string;
  delivery_to?: string;
  seriousness?: number;
  images?: string[]; // صور الطلب
};

export type OfferInsert = {
  id?: string;
  request_id: string;
  provider_id: string;
  provider_name: string;
  title: string;
  description: string;
  price?: string;
  delivery_time?: string;
  status:
    | "pending"
    | "accepted"
    | "rejected"
    | "negotiating"
    | "cancelled"
    | "completed";
  is_negotiable: boolean;
  location?: string;
  images?: string[];
};

export interface UserProfile {
  id: string;
  updated_at?: Date;
  created_at?: string;
  username?: string;
  full_name?: string;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  website?: string;
  phone?: string | null;
  email?: string | null;
  role?: "admin" | "user" | "moderator" | "provider";
  rating?: number;
  reviews_count?: number;
  is_verified?: boolean;
  bio?: string | null;
  is_guest?: boolean;

  // تفضيلات المستخدم
  has_onboarded?: boolean;
  interested_categories?: string[] | null;
  interested_cities?: string[] | null;
  preferred_categories?: string[];
  preferred_cities?: string[];

  // metavs user fields for compatibility
  app_metadata?: any;
  user_metadata?: any;
  aud?: string;
}
