/**
 * خدمة التعامل مع الروابط الديناميكية (Deep Linking)
 * تدعم كل صفحة بالتطبيق مع روابط فريدة
 */

import { ViewState, AppMode } from '../types';

export type RouteType = 
  | 'home'          // / - الصفحة الرئيسية
  | 'request'       // /request/:id
  | 'marketplace'   // /marketplace
  | 'create'        // /create
  | 'profile'       // /profile/:userId
  | 'messages'      // /messages
  | 'conversation'  // /messages/:conversationId
  | 'settings';     // /settings

export interface RouteParams {
  requestId?: string;
  userId?: string;
  conversationId?: string;
  view?: string;
}

export interface ParsedRoute {
  type: RouteType | null;
  params: RouteParams;
  viewState?: ViewState;
  mode?: AppMode;
}

/**
 * تحويل ViewState إلى RouteType
 */
export function viewStateToRouteType(view: ViewState): RouteType {
  switch (view) {
    case 'create-request':
      return 'create';
    case 'marketplace':
      return 'marketplace';
    case 'request-detail':
      return 'request';
    case 'settings':
      return 'settings';
    case 'profile':
      return 'profile';
    case 'messages':
      return 'messages';
    case 'conversation':
      return 'conversation';
    default:
      return 'home';
  }
}

/**
 * تحويل RouteType إلى ViewState
 */
export function routeTypeToViewState(type: RouteType): ViewState {
  switch (type) {
    case 'create':
      return 'create-request';
    case 'marketplace':
      return 'marketplace';
    case 'request':
      return 'request-detail';
    case 'settings':
      return 'settings';
    case 'profile':
      return 'profile';
    case 'messages':
      return 'messages';
    case 'conversation':
      return 'conversation';
    case 'home':
    default:
      return 'create-request';
  }
}

/**
 * إنشاء رابط لمشاركة طلب
 */
export function getRequestShareUrl(requestId: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/request/${requestId}`;
}

/**
 * إنشاء رابط لمشاركة صفحة
 */
export function getShareUrl(type: RouteType, params?: RouteParams): string {
  const baseUrl = window.location.origin;
  
  switch (type) {
    case 'request':
      return params?.requestId ? `${baseUrl}/request/${params.requestId}` : baseUrl;
    case 'marketplace':
      return `${baseUrl}/marketplace`;
    case 'create':
      return `${baseUrl}/create`;
    case 'profile':
      return params?.userId ? `${baseUrl}/profile/${params.userId}` : `${baseUrl}/profile`;
    case 'messages':
      return `${baseUrl}/messages`;
    case 'conversation':
      return params?.conversationId ? `${baseUrl}/messages/${params.conversationId}` : `${baseUrl}/messages`;
    case 'settings':
      return `${baseUrl}/settings`;
    case 'home':
    default:
      return baseUrl;
  }
}

/**
 * الحصول على المسار فقط (بدون origin)
 */
export function getRoutePath(type: RouteType, params?: RouteParams): string {
  switch (type) {
    case 'request':
      return params?.requestId ? `/request/${params.requestId}` : '/';
    case 'marketplace':
      return '/marketplace';
    case 'create':
      return '/create';
    case 'profile':
      return params?.userId ? `/profile/${params.userId}` : '/profile';
    case 'messages':
      return '/messages';
    case 'conversation':
      return params?.conversationId ? `/messages/${params.conversationId}` : '/messages';
    case 'settings':
      return '/settings';
    case 'home':
    default:
      return '/';
  }
}

/**
 * تحليل الرابط الحالي واستخراج المعلومات
 */
export function parseRoute(customUrl?: string): ParsedRoute {
  const url = customUrl ? new URL(customUrl, window.location.origin) : window.location;
  const path = url.pathname;
  const hash = url.hash || '';
  
  // تحليل المسار - /request/:id
  if (path.startsWith('/request/')) {
    const requestId = path.split('/request/')[1]?.split('/')[0]?.split('?')[0];
    if (requestId) {
      return { 
        type: 'request', 
        params: { requestId },
        viewState: 'request-detail',
        mode: 'offers'
      };
    }
  }
  
  // تحليل المسار - /profile/:userId
  if (path.startsWith('/profile/')) {
    const userId = path.split('/profile/')[1]?.split('/')[0]?.split('?')[0];
    return { 
      type: 'profile', 
      params: { userId },
      viewState: 'profile'
    };
  }
  
  // تحليل المسار - /profile (بدون userId)
  if (path === '/profile') {
    return { 
      type: 'profile', 
      params: {},
      viewState: 'profile'
    };
  }
  
  // تحليل المسار - /messages/:conversationId
  if (path.startsWith('/messages/')) {
    const conversationId = path.split('/messages/')[1]?.split('/')[0]?.split('?')[0];
    if (conversationId) {
      return { 
        type: 'conversation', 
        params: { conversationId },
        viewState: 'conversation'
      };
    }
  }
  
  // تحليل المسار - /marketplace
  if (path === '/marketplace' || hash.includes('marketplace')) {
    return { 
      type: 'marketplace', 
      params: {},
      viewState: 'marketplace',
      mode: 'offers'
    };
  }
  
  // تحليل المسار - /create
  if (path === '/create' || hash.includes('create')) {
    return { 
      type: 'create', 
      params: {},
      viewState: 'create-request',
      mode: 'requests'
    };
  }
  
  // تحليل المسار - /messages
  if (path === '/messages' || hash.includes('messages')) {
    return { 
      type: 'messages', 
      params: {},
      viewState: 'messages'
    };
  }
  
  // تحليل المسار - /settings
  if (path === '/settings' || hash.includes('settings')) {
    return { 
      type: 'settings', 
      params: {},
      viewState: 'settings'
    };
  }
  
  // الصفحة الرئيسية
  if (path === '/' || path === '') {
    return { 
      type: 'home', 
      params: {},
      viewState: 'create-request',
      mode: 'requests'
    };
  }
  
  return { type: null, params: {} };
}

/**
 * تحديث URL بدون إعادة تحميل الصفحة
 * يستخدم pushState للتنقل العادي و replaceState للتحديث بدون إضافة للـ history
 */
export function updateUrl(
  view: ViewState, 
  params?: RouteParams, 
  replace: boolean = false
): void {
  const routeType = viewStateToRouteType(view);
  const path = getRoutePath(routeType, params);
  
  // تجنب تحديث URL إذا كان نفس المسار
  if (window.location.pathname === path) {
    return;
  }
  
  if (replace) {
    window.history.replaceState({ view, ...params }, '', path);
  } else {
    window.history.pushState({ view, ...params }, '', path);
  }
}

/**
 * الانتقال لصفحة معينة مع تحديث URL
 */
export function navigateTo(
  type: RouteType, 
  params?: RouteParams, 
  callbacks?: {
    setView?: (view: ViewState) => void;
    setMode?: (mode: AppMode) => void;
    setSelectedRequest?: (request: any) => void;
  }
): void {
  const path = getRoutePath(type, params);
  
  // تحديث URL
  window.history.pushState({ type, ...params }, '', path);
  
  // تحديث حالة التطبيق
  if (callbacks?.setView) {
    const viewState = routeTypeToViewState(type);
    callbacks.setView(viewState);
  }
  
  // تحديث الوضع حسب نوع الصفحة
  if (callbacks?.setMode) {
    if (type === 'marketplace' || type === 'request') {
      callbacks.setMode('offers');
    } else if (type === 'create') {
      callbacks.setMode('requests');
    }
  }
}

/**
 * الرجوع للصفحة السابقة
 */
export function goBack(): void {
  window.history.back();
}

/**
 * نسخ رابط للمشاركة
 */
export async function copyShareUrl(type: RouteType, params?: RouteParams): Promise<boolean> {
  try {
    const url = getShareUrl(type, params);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (err) {
    console.error('Error copying URL:', err);
    return false;
  }
}

/**
 * مشاركة الرابط باستخدام Web Share API (للموبايل)
 */
export async function shareUrl(
  type: RouteType, 
  params?: RouteParams,
  shareData?: { title?: string; text?: string }
): Promise<boolean> {
  try {
    const url = getShareUrl(type, params);
    
    if (navigator.share) {
      await navigator.share({
        title: shareData?.title || 'عبيلي',
        text: shareData?.text || '',
        url: url,
      });
      return true;
    } else {
      // Fallback to clipboard
      return copyShareUrl(type, params);
    }
  } catch (err) {
    // User cancelled share or error
    console.error('Error sharing URL:', err);
    return false;
  }
}
