import type { Offer, Request } from "../types";

/**
 * Unified status configuration for offers and requests
 * This ensures consistent colors, styles, and labels across all components
 */

export type OfferStatus = Offer["status"];
export type RequestStatus = Request["status"];

export interface StatusConfig {
  text: string;
  label: string; // Arabic label
  bgColor: string;
  textColor: string;
  borderColor: string;
}

/**
 * Unified status configuration for offers
 */
export const getOfferStatusConfig = (
  status: OfferStatus
): StatusConfig => {
  const configs: Record<OfferStatus, StatusConfig> = {
    accepted: {
      text: "مقبول",
      label: "مقبول",
      bgColor: "bg-primary/15",
      textColor: "text-primary",
      borderColor: "border-primary/30",
    },
    negotiating: {
      text: "جاري التفاوض",
      label: "جاري التفاوض",
      bgColor: "bg-primary/15",
      textColor: "text-primary",
      borderColor: "border-primary/30",
    },
    pending: {
      text: "قيد الانتظار",
      label: "قيد الانتظار",
      bgColor:
        "bg-orange-100 dark:bg-orange-900/30",
      textColor: "text-orange-700 dark:text-orange-400",
      borderColor: "border-orange-200 dark:border-orange-800",
    },
    rejected: {
      text: "مرفوض",
      label: "مرفوض",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      textColor: "text-red-700 dark:text-red-400",
      borderColor: "border-red-200 dark:border-red-800",
    },
    completed: {
      text: "مكتمل",
      label: "مكتمل",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      textColor: "text-green-700 dark:text-green-400",
      borderColor: "border-green-200 dark:border-green-800",
    },
    cancelled: {
      text: "ملغى",
      label: "ملغى",
      bgColor: "bg-gray-100 dark:bg-gray-800/50",
      textColor: "text-gray-600 dark:text-gray-400",
      borderColor: "border-gray-200 dark:border-gray-700",
    },
  };

  return configs[status];
};

/**
 * Get status configuration for requests
 */
export const getRequestStatusConfig = (
  status: RequestStatus,
  isPublic?: boolean
): StatusConfig => {
  if (status === "archived") {
    return {
      text: "مؤرشف",
      label: "مؤرشف",
      bgColor: "bg-gray-100 dark:bg-gray-800/50",
      textColor: "text-gray-600 dark:text-gray-400",
      borderColor: "border-gray-200 dark:border-gray-700",
    };
  }

  if (isPublic === false) {
    return {
      text: "مخفي",
      label: "مخفي",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      textColor: "text-orange-600 dark:text-orange-400",
      borderColor: "border-orange-200 dark:border-orange-800",
    };
  }

  if (status === "assigned" || status === "completed") {
    return {
      text: "تم اعتماد عرض",
      label: "تم اعتماد عرض",
      bgColor: "bg-primary/15",
      textColor: "text-primary",
      borderColor: "border-primary/30",
    };
  }

  return {
    text: "نشط",
    label: "نشط",
    bgColor: "bg-primary/15",
    textColor: "text-primary",
    borderColor: "border-primary/20",
  };
};

/**
 * Get status badge classes as a single string (for inline styles)
 */
export const getOfferStatusClasses = (
  status: OfferStatus
): { className: string; label: string } => {
  const config = getOfferStatusConfig(status);
  return {
    className: `${config.bgColor} ${config.textColor} ${config.borderColor} border`,
    label: config.label,
  };
};

/**
 * Get request status badge classes as a single string (for inline styles)
 */
export const getRequestStatusClasses = (
  status: RequestStatus,
  isPublic?: boolean
): { className: string; label: string } => {
  const config = getRequestStatusConfig(status, isPublic);
  return {
    className: `${config.bgColor} ${config.textColor} ${config.borderColor} border`,
    label: config.label,
  };
};
