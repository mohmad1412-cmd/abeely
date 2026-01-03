import React from 'react';
import {
  Code,
  Globe,
  Smartphone,
  Headphones,
  BarChart,
  Brain,
  Palette,
  Layout,
  Figma,
  Sofa,
  Building2,
  FileText,
  PenTool,
  Languages,
  Mic,
  Check,
  TrendingUp,
  Share2,
  Search,
  Megaphone,
  Scale,
  Calculator,
  MessageSquare,
  Users,
  GraduationCap,
  Monitor,
  BookOpen,
  Target,
  Stethoscope,
  Apple,
  Dumbbell,
  Heart,
  Droplet,
  Zap,
  Wind,
  Hammer,
  Settings,
  Paintbrush,
  Axe,
  Truck,
  Package,
  MapPin,
  Car,
  Droplets,
  Key,
  UserCheck,
  Calendar,
  UtensilsCrossed,
  Camera,
  Video,
  Music,
  Flower,
  Scissors,
  Sparkles,
  Flower2,
  Hand,
  Home,
  Building,
  Shirt,
  Bug,
  ChefHat,
  Cake,
  Soup,
  KeyRound,
  Cat,
  Sparkle,
  Shield,
  Cctv,
  Grid3x3,
  LucideIcon,
} from 'lucide-react';

// Map of icon names to lucide components
const iconMap: Record<string, LucideIcon> = {
  Code,
  Globe,
  Smartphone,
  Headphones,
  BarChart,
  Brain,
  Palette,
  Layout,
  Figma,
  Sofa,
  Building2,
  FileText,
  PenTool,
  Languages,
  Mic,
  Check,
  TrendingUp,
  Share2,
  Search,
  Megaphone,
  Scale,
  Calculator,
  MessageSquare,
  Users,
  GraduationCap,
  Monitor,
  BookOpen,
  Target,
  Stethoscope,
  Apple,
  Dumbbell,
  Heart,
  Droplet,
  Zap,
  Wind,
  Hammer,
  Settings,
  Paintbrush,
  Axe,
  Truck,
  Package,
  MapPin,
  Car,
  Droplets,
  Key,
  UserCheck,
  Calendar,
  UtensilsCrossed,
  Camera,
  Video,
  Music,
  Flower,
  Scissors,
  Sparkles,
  Flower2,
  Hand,
  Home,
  Building,
  Shirt,
  Bug,
  ChefHat,
  Cake,
  Soup,
  KeyRound,
  Cat,
  Sparkle,
  Shield,
  Cctv,
  Grid3x3,
};

interface CategoryIconProps {
  icon?: string;
  emoji?: string;
  size?: number;
  className?: string;
}

/**
 * مكون لعرض أيقونة التصنيف
 * يستخدم lucide-react للأيقونات مع fallback للإيموجي
 */
export const CategoryIcon: React.FC<CategoryIconProps> = ({
  icon,
  emoji,
  size = 14,
  className = '',
}) => {
  // إذا كان هناك أيقونة lucide
  if (icon && iconMap[icon]) {
    const IconComponent = iconMap[icon];
    return <IconComponent size={size} className={className} />;
  }

  // Fallback للإيموجي
  if (emoji) {
    return (
      <span 
        className={className} 
        style={{ fontSize: size * 0.9, lineHeight: 1 }}
      >
        {emoji}
      </span>
    );
  }

  // Default icon
  return <Grid3x3 size={size} className={className} />;
};

/**
 * دالة للحصول على أيقونة بالاسم
 */
export function getIconComponent(iconName: string): LucideIcon | null {
  return iconMap[iconName] || null;
}

export default CategoryIcon;

