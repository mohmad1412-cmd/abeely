import React from "react";
import * as LucideIcons from "lucide-react";
import { Grid3x3, LucideIcon } from "lucide-react";
import { getSmartCategoryIcon } from "../../utils/smartIcons.ts";

interface CategoryIconProps {
  icon?: string;
  emoji?: string;
  size?: number;
  className?: string;
  categoryLabel?: string; // New prop for smart lookup
}

/**
 * مكون لعرض أيقونة التصنيف
 * يستخدم lucide-react للأيقونات مع fallback للإيموجي
 * يدعم جميع أيقونات المكتبة ديناميكياً + البحث الذكي
 */
export const CategoryIcon: React.FC<CategoryIconProps> = ({
  icon,
  emoji,
  size = 14,
  className = "",
  categoryLabel,
}: CategoryIconProps) => {
  // 1. Try direct icon name
  let IconComponent = icon && (icon in LucideIcons)
    ? (LucideIcons as unknown as Record<string, LucideIcon>)[icon]
    : null;

  // 2. If no icon or invalid, try smart lookup using label
  if (!IconComponent && categoryLabel) {
    const smartResult = getSmartCategoryIcon(categoryLabel);
    if (smartResult.icon && (smartResult.icon in LucideIcons)) {
      IconComponent =
        (LucideIcons as unknown as Record<string, LucideIcon>)[
          smartResult.icon
        ];
    }
  }

  // 3. Render Icon if found
  if (IconComponent) {
    return (
      <IconComponent size={size} className={className} strokeWidth={1.5} />
    );
  }

  // 4. Fallback to Emoji
  if (emoji) {
    return (
      <span
        className={`flex items-center justify-center leading-none ${className}`}
        style={{ fontSize: size * 0.9 }}
      >
        {emoji}
      </span>
    );
  }

  // 5. Final Default
  return <Grid3x3 size={size} className={className} strokeWidth={1.5} />;
};

/**
 * دالة للحصول على أيقونة بالاسم
 */
export function getIconComponent(iconName: string): LucideIcon | null {
  return (iconName in LucideIcons)
    ? (LucideIcons as unknown as Record<string, LucideIcon>)[iconName]
    : null;
}

export default CategoryIcon;
