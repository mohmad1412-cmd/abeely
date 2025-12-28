/**
 * خدمة التعامل مع الروابط الديناميكية (Deep Linking)
 */

export type RouteType = 
  | 'request'      // /request/:id
  | 'marketplace'  // /marketplace
  | 'create'       // /create
  | 'profile'      // /profile/:userId
  | 'messages'     // /messages
  | 'settings';    // /settings

export interface RouteParams {
  requestId?: string;
  userId?: string;
  view?: string;
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
      return `${baseUrl}/request/${params?.requestId}`;
    case 'marketplace':
      return `${baseUrl}/marketplace`;
    case 'create':
      return `${baseUrl}/create`;
    case 'profile':
      return `${baseUrl}/profile/${params?.userId}`;
    case 'messages':
      return `${baseUrl}/messages`;
    case 'settings':
      return `${baseUrl}/settings`;
    default:
      return baseUrl;
  }
}

/**
 * تحليل الرابط الحالي واستخراج المعلومات
 */
export function parseRoute(): { type: RouteType | null; params: RouteParams } {
  const path = window.location.pathname;
  const hash = window.location.hash;
  
  // تحليل المسار
  if (path.startsWith('/request/')) {
    const requestId = path.split('/request/')[1]?.split('/')[0];
    return { type: 'request', params: { requestId } };
  }
  
  if (path.startsWith('/profile/')) {
    const userId = path.split('/profile/')[1]?.split('/')[0];
    return { type: 'profile', params: { userId } };
  }
  
  if (path === '/marketplace' || hash.includes('marketplace')) {
    return { type: 'marketplace', params: {} };
  }
  
  if (path === '/create' || hash.includes('create')) {
    return { type: 'create', params: {} };
  }
  
  if (path === '/messages' || hash.includes('messages')) {
    return { type: 'messages', params: {} };
  }
  
  if (path === '/settings' || hash.includes('settings')) {
    return { type: 'settings', params: {} };
  }
  
  return { type: null, params: {} };
}

/**
 * الانتقال لصفحة معينة
 */
export function navigateTo(type: RouteType, params?: RouteParams, setView?: (view: string) => void): void {
  const url = getShareUrl(type, params);
  
  // تحديث URL بدون إعادة تحميل
  window.history.pushState({}, '', url);
  
  // إذا كان هناك setView function (من App.tsx)
  if (setView) {
    switch (type) {
      case 'request':
        setView('request-detail');
        break;
      case 'marketplace':
        setView('marketplace');
        break;
      case 'create':
        setView('create-request');
        break;
      case 'profile':
        setView('profile');
        break;
      case 'messages':
        setView('messages');
        break;
      case 'settings':
        setView('settings');
        break;
    }
  }
  
  // إرسال حدث للتنقل
  window.dispatchEvent(new PopStateEvent('popstate'));
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

