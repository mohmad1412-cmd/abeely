import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * Haptic Feedback Service
 * يوفر haptic feedback متوافق مع Capacitor (Android/iOS) والويب
 */
class HapticService {
  /**
   * Check if Capacitor is available (running in native app)
   */
  private isCapacitorAvailable(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Light tap feedback - للضغطات الخفيفة
   */
  async tap(): Promise<void> {
    if (this.isCapacitorAvailable()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    } else {
      // Fallback to web API
      if (navigator.vibrate) {
        navigator.vibrate(8);
      }
    }
  }

  /**
   * Medium impact feedback - للضغطات العادية
   */
  async impact(): Promise<void> {
    if (this.isCapacitorAvailable()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    } else {
      if (navigator.vibrate) {
        navigator.vibrate(15);
      }
    }
  }

  /**
   * Heavy impact feedback - للضغطات القوية
   */
  async heavyImpact(): Promise<void> {
    if (this.isCapacitorAvailable()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    } else {
      if (navigator.vibrate) {
        navigator.vibrate(25);
      }
    }
  }

  /**
   * Success feedback - للإجراءات الناجحة
   */
  async success(): Promise<void> {
    if (this.isCapacitorAvailable()) {
      try {
        await Haptics.notification({ type: 'success' });
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    } else {
      if (navigator.vibrate) {
        navigator.vibrate([10, 30, 15, 30, 20, 30, 25]);
      }
    }
  }

  /**
   * Error feedback - للأخطاء
   */
  async error(): Promise<void> {
    if (this.isCapacitorAvailable()) {
      try {
        await Haptics.notification({ type: 'error' });
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    } else {
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
    }
  }

  /**
   * Warning feedback - للتحذيرات
   */
  async warning(): Promise<void> {
    if (this.isCapacitorAvailable()) {
      try {
        await Haptics.notification({ type: 'warning' });
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    } else {
      if (navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }
    }
  }

  /**
   * Recording start pattern - لبدء التسجيل
   */
  async recordStart(): Promise<void> {
    if (this.isCapacitorAvailable()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    } else {
      if (navigator.vibrate) {
        navigator.vibrate([5, 20, 15, 20, 10]);
      }
    }
  }

  /**
   * Recording stop pattern - لإيقاف التسجيل
   */
  async recordStop(): Promise<void> {
    if (this.isCapacitorAvailable()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    } else {
      if (navigator.vibrate) {
        navigator.vibrate([12, 40, 20, 40, 12]);
      }
    }
  }

  /**
   * Selection feedback - عند الاختيار
   */
  async selection(): Promise<void> {
    if (this.isCapacitorAvailable()) {
      try {
        await Haptics.selectionStart();
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    } else {
      if (navigator.vibrate) {
        navigator.vibrate(5);
      }
    }
  }

  /**
   * Selection changed - عند تغيير الاختيار
   */
  async selectionChanged(): Promise<void> {
    if (this.isCapacitorAvailable()) {
      try {
        await Haptics.selectionChanged();
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    } else {
      if (navigator.vibrate) {
        navigator.vibrate(8);
      }
    }
  }

  /**
   * Custom vibration pattern - للأنماط المخصصة (ويب فقط)
   */
  async custom(pattern: number | number[]): Promise<void> {
    if (this.isCapacitorAvailable()) {
      // في Capacitor، نستخدم impact بدلاً من pattern
      const duration = Array.isArray(pattern) 
        ? pattern.reduce((a, b) => a + b, 0) 
        : pattern;
      if (duration < 20) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (duration < 40) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      }
    } else {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    }
  }
}

// Export singleton instance
export const hapticService = new HapticService();

