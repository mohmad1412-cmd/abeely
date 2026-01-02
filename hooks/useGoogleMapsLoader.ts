/**
 * Hook لتحميل Google Maps API
 * يتم تحميل API مرة واحدة فقط عند الحاجة
 */

import { useState, useEffect, useCallback } from 'react';

interface UseGoogleMapsLoaderReturn {
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
  loadGoogleMaps: () => Promise<boolean>;
}

// حالة التحميل العالمية
let globalLoadingPromise: Promise<boolean> | null = null;
let isGlobalLoaded = false;
let globalLoadError: Error | null = null;

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

/**
 * تحميل Google Maps API script
 */
const loadGoogleMapsScript = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    // التحقق إذا كان محملاً مسبقاً
    if (window.google && window.google.maps && window.google.maps.places) {
      resolve(true);
      return;
    }

    // التحقق من وجود مفتاح API
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not found. Using fallback city list.');
      resolve(false);
      return;
    }

    // التحقق من وجود script مسبقاً
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );
    if (existingScript) {
      // انتظار تحميل الـ script الموجود
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkLoaded);
          resolve(true);
        }
      }, 100);
      return;
    }

    // إنشاء script جديد
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=ar`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // التأكد من تحميل Places library
      const checkPlaces = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkPlaces);
          resolve(true);
        }
      }, 50);
      
      // timeout بعد 5 ثوان
      setTimeout(() => {
        clearInterval(checkPlaces);
        if (window.google && window.google.maps && window.google.maps.places) {
          resolve(true);
        } else {
          reject(new Error('Places library not loaded'));
        }
      }, 5000);
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps API'));
    };

    document.head.appendChild(script);
  });
};

/**
 * Hook لتحميل Google Maps
 */
export const useGoogleMapsLoader = (): UseGoogleMapsLoaderReturn => {
  const [isLoaded, setIsLoaded] = useState(isGlobalLoaded);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(globalLoadError);

  const loadGoogleMaps = useCallback(async (): Promise<boolean> => {
    // إذا محمل مسبقاً
    if (isGlobalLoaded) {
      return true;
    }

    // إذا يوجد promise تحميل جاري
    if (globalLoadingPromise) {
      try {
        const result = await globalLoadingPromise;
        setIsLoaded(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        return false;
      }
    }

    // بدء التحميل
    setIsLoading(true);
    globalLoadingPromise = loadGoogleMapsScript();

    try {
      const result = await globalLoadingPromise;
      isGlobalLoaded = result;
      setIsLoaded(result);
      setIsLoading(false);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      globalLoadError = error;
      setError(error);
      setIsLoading(false);
      globalLoadingPromise = null;
      return false;
    }
  }, []);

  // محاولة التحميل تلقائياً عند mount
  useEffect(() => {
    // التحقق السريع إذا كان محملاً
    if (window.google && window.google.maps && window.google.maps.places) {
      isGlobalLoaded = true;
      setIsLoaded(true);
      return;
    }

    // تحميل lazy عند الحاجة
    if (GOOGLE_MAPS_API_KEY && !isGlobalLoaded && !globalLoadingPromise) {
      loadGoogleMaps();
    }
  }, [loadGoogleMaps]);

  return {
    isLoaded,
    isLoading,
    error,
    loadGoogleMaps,
  };
};

export default useGoogleMapsLoader;

