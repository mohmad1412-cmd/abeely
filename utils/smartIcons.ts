import * as LucideIcons from "lucide-react";
import { LucideIcon } from "lucide-react";

// Cache for performance
const iconCache: Record<string, string> = {};

/**
 * keywords mapping to icons
 * The order matters! higher priority keywords should be first.
 */
const KEYWORD_MAP: Record<string, string> = {
  // --- Maintenance & Home ---
  "plumb": "Droplet", // Plumbing
  "water": "Droplet",
  "سباك": "Droplet",
  "مياه": "Droplet",
  "electr": "Zap", // Electrical
  "كهرب": "Zap",
  "paint": "Paintbrush", // Painting
  "dehan": "Paintbrush",
  "دهان": "Paintbrush",
  "carpentry": "Hammer", // Carpentry
  "wood": "Hammer",
  "نجار": "Hammer",
  "clean": "Sparkles", // Cleaning
  "تنظيف": "Sparkles",
  "wash": "Droplets",
  "غسيل": "Droplets",
  "pest": "Bug", // Pest Control
  "حشرات": "Bug",
  "repair": "Wrench", // General Repair
  "fix": "Wrench",
  "home": "Home",
  "manzil": "Home",
  "house": "Home",
  "منزل": "Home",
  "بيت": "Home",

  // --- Cars ---
  "car": "Car",
  "vehicle": "Car",
  "auto": "Car",
  "سيار": "Car",
  "driver": "UserCheck",
  "sadiq": "UserCheck",
  "سائق": "UserCheck",
  "transport": "Truck",
  "truck": "Truck",
  "moving": "Truck",
  "shipping": "Package",
  "naql": "Truck",
  "نقل": "Truck",
  "delivery": "MapPin",
  "tawsil": "MapPin",
  "توصيل": "MapPin",

  // --- Tech ---
  "software": "Code",
  "develop": "Code",
  "program": "Code",
  "code": "Code",
  "app": "Smartphone",
  "web": "Globe",
  "site": "Globe",
  "design": "Palette",
  "ui": "Layout",
  "ux": "Layout",
  "تصميم": "Palette",
  "برمجة": "Code",
  "تطوير": "Code",
  "موقع": "Globe",
  "تطبيق": "Smartphone",
  "jawal": "Smartphone",
  "phone": "Smartphone",
  "جوال": "Smartphone",
  "laptop": "Monitor",
  "computer": "Monitor",
  "كمبيوتر": "Monitor",
  "internet": "Wifi",

  // --- Professional ---
  "account": "Calculator",
  "mohasba": "Calculator",
  "محاسب": "Calculator",
  "legal": "Scale",
  "law": "Scale",
  "qanoon": "Scale",
  "قانون": "Scale",
  "muhani": "Briefcase",
  "consult": "MessageSquare",
  "istishara": "MessageSquare",
  "استشار": "MessageSquare",
  "hr": "Users",
  "human": "Users",
  "teach": "GraduationCap",
  "tutor": "GraduationCap",
  "dars": "GraduationCap",
  "درس": "GraduationCap",
  "تعليم": "GraduationCap",
  "translat": "Languages",
  "tarjama": "Languages",
  "ترجم": "Languages",

  // --- Events & Media ---
  "event": "Calendar",
  "munasabat": "Calendar",
  "مناسب": "Calendar",
  "photo": "Camera",
  "taswir": "Camera",
  "تصوير": "Camera",
  "video": "Video",
  "fideo": "Video",
  "فيديو": "Video",
  "music": "Music",
  "musiqa": "Music",
  "صوت": "Music",
  "party": "PartyPopper",
  "hafla": "PartyPopper",
  "حفلة": "PartyPopper",

  // --- Food ---
  "food": "UtensilsCrossed",
  "cook": "ChefHat",
  "tabkh": "ChefHat",
  "طبخ": "ChefHat",
  "meal": "Utensils",
  "wajba": "Utensils",
  "وجبة": "Utensils",
  "restaurant": "Store",
  "mataam": "Store",
  "مطعم": "Store",
  "coffee": "Coffee",
  "qahwa": "Coffee",
  "قهوة": "Coffee",

  // --- Health & Beauty ---
  "health": "Heart",
  "seha": "Heart",
  "صحة": "Heart",
  "gym": "Dumbbell",
  "fitness": "Dumbbell",
  "sport": "Dumbbell",
  "riyada": "Dumbbell",
  "رياضة": "Dumbbell",
  "hair": "Scissors",
  "shaar": "Scissors",
  "شعر": "Scissors",
  "makeup": "Sparkles",
  "mikyaj": "Sparkles",
  "مكياج": "Sparkles",

  // --- Wholesale (Specific user request) ---
  "wholesale": "ShoppingCart",
  "jumla": "ShoppingCart",
  "جملة": "ShoppingCart",
  "buy": "ShoppingBag",
  "shira": "ShoppingBag",
  "شراء": "ShoppingBag",
  "market": "Store",
  "souq": "Store",
  "metjer": "Store",
  "سوق": "Store",
  "متجر": "Store",
};

export interface SmartIconResult {
  icon: string;
  emoji: string;
}

/**
 * Get a smart icon based on text analysis
 * @param text The category label or text to analyze
 * @param defaultIcon Default icon to return if no match found
 * @returns Object containing icon name and fallback emoji
 */
export function getSmartCategoryIcon(
  text: string,
  defaultIcon: string = "Grid3x3",
): SmartIconResult {
  if (!text) return { icon: defaultIcon, emoji: "📦" };

  const normalizedText = text.toLowerCase().trim();

  // 1. Check Cache
  if (iconCache[normalizedText]) {
    return { icon: iconCache[normalizedText], emoji: "📦" };
  }

  // 2. Direct name match (if the text is exactly an icon name)
  // Only valid if the text starts with uppercase to avoid false positives with common words
  if (/^[A-Z]/.test(text) && (LucideIcons as any)[text]) {
    return { icon: text, emoji: "📦" };
  }

  // 3. Keyword Search
  for (const [keyword, iconName] of Object.entries(KEYWORD_MAP)) {
    if (normalizedText.includes(keyword)) {
      // Cache the result
      iconCache[normalizedText] = iconName;
      return { icon: iconName, emoji: "📦" };
    }
  }

  // 4. Fallback
  return { icon: defaultIcon, emoji: "📦" };
}
