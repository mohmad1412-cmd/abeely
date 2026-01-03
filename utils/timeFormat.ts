import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

/**
 * Formats time ago in Arabic without "تقريباً" (approximately)
 * @param date - Date to format
 * @param addSuffix - Whether to add "منذ" prefix (default: true)
 * @returns Formatted time string without "تقريباً"
 */
export const formatTimeAgo = (date: Date | string, addSuffix: boolean = true): string => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    
    // إذا كان أقل من ساعة، أرجع "قبل قليل"
    if (minutes < 60) {
      return addSuffix ? "قبل قليل" : "قبل قليل";
    }
    
    const formatted = formatDistanceToNow(d, { addSuffix, locale: ar });
    // Remove "تقريباً" or " تقريباً" from the string
    return formatted.replace(/\s*تقريباً\s*/g, '').trim();
  } catch {
    return "";
  }
};

