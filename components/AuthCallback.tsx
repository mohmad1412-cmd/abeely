import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Check, Loader2, X } from 'lucide-react';

interface AuthCallbackProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

/**
 * إرسال رسالة للنافذة الأصلية (opener)
 */
function notifyOpener(type: 'oauth_success' | 'oauth_error', error?: string) {
  if (window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage(
        { type, error },
        window.location.origin
      );
      console.log(`📤 Sent ${type} message to opener`);
    } catch (e) {
      console.error('Failed to send message to opener:', e);
    }
  }
}

export default function AuthCallback({ onSuccess, onError }: AuthCallbackProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('جاري تسجيل الدخول...');
  const [countdown, setCountdown] = useState(2);
  
  // كشف الـ popup من الـ URL parameter أو من window.opener
  const urlParams = new URLSearchParams(window.location.search);
  const isPopupFromUrl = urlParams.get("popup") === "true";
  const isPopup = isPopupFromUrl || !!window.opener;

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(errorDescription || error || 'حدث خطأ');
          
          if (isPopup) {
            notifyOpener('oauth_error', errorDescription || error);
            setTimeout(() => window.close(), 2000);
          } else {
            onError(errorDescription || error);
          }
          return;
        }

        if (code) {
          // استبدال الـ code بـ session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            setStatus('error');
            setMessage(exchangeError.message);
            
            if (isPopup) {
              notifyOpener('oauth_error', exchangeError.message);
              setTimeout(() => window.close(), 2000);
            } else {
              onError(exchangeError.message);
            }
            return;
          }

          if (data?.session) {
            setStatus('success');
            setMessage('تم تسجيل الدخول بنجاح!');
            
            // تنظيف URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            if (isPopup) {
              // إرسال رسالة نجاح للنافذة الأصلية
              notifyOpener('oauth_success');
              
              // عداد تنازلي ثم إغلاق
              let count = 2;
              const countdownInterval = setInterval(() => {
                count--;
                setCountdown(count);
                if (count <= 0) {
                  clearInterval(countdownInterval);
                  window.close();
                }
              }, 1000);
            } else {
              // إذا لسنا في popup، انتقل للصفحة الرئيسية
              setTimeout(() => onSuccess(), 1500);
            }
            return;
          }
        }

        // تحقق من وجود session موجودة
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          setStatus('success');
          setMessage('تم تسجيل الدخول بنجاح!');
          
          if (isPopup) {
            notifyOpener('oauth_success');
            let count = 2;
            const countdownInterval = setInterval(() => {
              count--;
              setCountdown(count);
              if (count <= 0) {
                clearInterval(countdownInterval);
                window.close();
              }
            }, 1000);
          } else {
            setTimeout(() => onSuccess(), 1500);
          }
          return;
        }

        setStatus('error');
        setMessage('لم يتم العثور على بيانات تسجيل الدخول');
        
        if (isPopup) {
          notifyOpener('oauth_error', 'لم يتم العثور على بيانات تسجيل الدخول');
          setTimeout(() => window.close(), 2000);
        } else {
          onError('لم يتم العثور على بيانات تسجيل الدخول');
        }
      } catch (err: any) {
        console.error('Callback error:', err);
        setStatus('error');
        setMessage('حدث خطأ غير متوقع');
        
        if (isPopup) {
          notifyOpener('oauth_error', err.message || 'حدث خطأ غير متوقع');
          setTimeout(() => window.close(), 2000);
        } else {
          onError(err.message || 'حدث خطأ غير متوقع');
        }
      }
    };

    handleCallback();
  }, [onSuccess, onError, isPopup]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-[#153659] via-[#0d9488] to-[#153659]">
      <div className="text-center p-10 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl max-w-sm border border-white/20">
        {/* Icon */}
        <div className={`
          w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center
          ${status === 'loading' ? 'bg-white/20' : ''}
          ${status === 'success' ? 'bg-green-500/90 shadow-lg shadow-green-500/30' : ''}
          ${status === 'error' ? 'bg-red-500/90 shadow-lg shadow-red-500/30' : ''}
        `}>
          {status === 'loading' && (
            <Loader2 size={48} className="text-white animate-spin" />
          )}
          {status === 'success' && (
            <Check size={48} className="text-white" strokeWidth={3} />
          )}
          {status === 'error' && (
            <X size={48} className="text-white" strokeWidth={3} />
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-3">
          {status === 'loading' && 'جاري تسجيل الدخول...'}
          {status === 'success' && 'تم بنجاح! ✅'}
          {status === 'error' && 'فشل تسجيل الدخول'}
        </h1>

        {/* Message */}
        <p className="text-white/90 text-lg mb-4">{message}</p>

        {/* Countdown for success in popup */}
        {status === 'success' && isPopup && (
          <div className="mt-4 space-y-2">
            <p className="text-white/70 text-sm">
              ستُغلق هذه النافذة تلقائياً...
            </p>
            <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">{countdown}</span>
            </div>
          </div>
        )}
        
        {/* Redirect message for non-popup */}
        {status === 'success' && !isPopup && (
          <p className="text-white/70 text-sm mt-4">
            جاري الانتقال للتطبيق...
          </p>
        )}
        
        {/* Error in popup */}
        {status === 'error' && isPopup && (
          <p className="text-white/70 text-sm mt-4">
            ستُغلق هذه النافذة تلقائياً...
          </p>
        )}
      </div>
    </div>
  );
}

