import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface AuthCallbackProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

export default function AuthCallback({ onSuccess, onError }: AuthCallbackProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('جاري تسجيل الدخول...');

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
          onError(errorDescription || error);
          return;
        }

        if (code) {
          // استبدال الـ code بـ session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            setStatus('error');
            setMessage(exchangeError.message);
            onError(exchangeError.message);
            return;
          }

          if (data?.session) {
            setStatus('success');
            setMessage('تم تسجيل الدخول بنجاح!');
            
            // تنظيف URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // إذا كنا في popup، أغلق النافذة
            if (window.opener) {
              setTimeout(() => {
                window.close();
              }, 1500);
            } else {
              // إذا لسنا في popup، انتقل للصفحة الرئيسية
              setTimeout(() => {
                onSuccess();
              }, 1500);
            }
            return;
          }
        }

        // تحقق من وجود session موجودة
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          setStatus('success');
          setMessage('تم تسجيل الدخول بنجاح!');
          
          if (window.opener) {
            setTimeout(() => window.close(), 1500);
          } else {
            setTimeout(() => onSuccess(), 1500);
          }
          return;
        }

        setStatus('error');
        setMessage('لم يتم العثور على بيانات تسجيل الدخول');
        onError('لم يتم العثور على بيانات تسجيل الدخول');
      } catch (err: any) {
        console.error('Callback error:', err);
        setStatus('error');
        setMessage('حدث خطأ غير متوقع');
        onError(err.message || 'حدث خطأ غير متوقع');
      }
    };

    handleCallback();
  }, [onSuccess, onError]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800">
      <div className="text-center p-10 bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl max-w-sm animate-fade-in">
        {/* Icon */}
        <div className={`
          w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center text-4xl
          ${status === 'loading' ? 'bg-white/20 animate-pulse' : ''}
          ${status === 'success' ? 'bg-green-500 animate-bounce' : ''}
          ${status === 'error' ? 'bg-red-500' : ''}
        `}>
          {status === 'loading' && '⏳'}
          {status === 'success' && '✓'}
          {status === 'error' && '✗'}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-3">
          {status === 'loading' && 'جاري تسجيل الدخول...'}
          {status === 'success' && 'تم بنجاح!'}
          {status === 'error' && 'فشل تسجيل الدخول'}
        </h1>

        {/* Message */}
        <p className="text-white/90 text-lg">{message}</p>

        {/* Countdown for success */}
        {status === 'success' && (
          <p className="text-white/70 text-sm mt-4">
            {window.opener ? 'ستغلق النافذة تلقائياً...' : 'جاري الانتقال...'}
          </p>
        )}
      </div>
    </div>
  );
}

