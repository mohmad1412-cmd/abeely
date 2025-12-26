export interface Request {
  id: string;
  title: string;
  description: string;
  author: string;
  createdAt: Date;
  status: 'draft' | 'active' | 'assigned' | 'completed' | 'archived';
  messages: Message[];
  offers: Offer[];
  isPublic?: boolean;
  acceptedOfferId?: string;
  acceptedOfferProvider?: string;
  budgetMin?: string;
  budgetMax?: string;
  budgetType?: 'not-specified' | 'negotiable' | 'fixed';
  location?: string;
  categories?: string[];
  deliveryTimeType?: 'immediate' | 'range' | 'not-specified';
  deliveryTimeFrom?: string;
  deliveryTimeTo?: string;
  seriousness?: number; // 1 منخفض - 3 مرتفع
  images?: string[]; // Changed from single image to array
  // Contact method preferences
  contactMethod?: 'whatsapp' | 'chat' | 'both';
  whatsappNumber?: string;
  isCreatedViaWhatsApp?: boolean; // If created via WhatsApp agent, only WhatsApp contact is available
  // Author details
  source?: 'platform' | 'whatsapp'; // Where the request originated
  authorName?: string; // Display name of the author
  authorFirstName?: string; // First name initial
  authorLastName?: string; // Last name initial
  // Location coordinates
  locationCoords?: {
    lat: number;
    lng: number;
    address?: string;
  };
}


export interface Offer {
  id: string;
  requestId: string;
  providerName: string;
  providerAvatar?: string;
  title: string;
  description: string;
  price: string;
  deliveryTime: string;
  status: 'pending' | 'accepted' | 'rejected' | 'negotiating' | 'archived';
  createdAt: Date;
  isNegotiable?: boolean;
  location?: string;
  images?: string[];
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'system' | 'ai' | 'provider' | 'requester';
  timestamp: Date;
  // For AI draft generation
  isDraftPreview?: boolean;
  draftData?: Partial<Request>;
}

export interface Category {
  id: string;
  label: string;
  emoji: string;
}

export interface Notification {
  id: string;
  type: 'offer' | 'message' | 'status' | 'system' | 'interest';
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
  authorName: string;
  authorAvatar?: string;
  rating: number; 
  comment: string;
  date: Date;
  role: 'provider' | 'requester'; 
}

export interface UserPreferences {
  interestedCategories: string[];
  interestedCities: string[];
  radarWords: string[];
  notifyOnInterest: boolean;
  roleMode: 'requester' | 'provider'; // Profile toggle
}

export type AppMode = 'requests' | 'offers';
export type ViewState = 'dashboard' | 'marketplace' | 'request-detail' | 'offer-detail' | 'profile' | 'settings' | 'create-request' | 'messages' | 'conversation';
