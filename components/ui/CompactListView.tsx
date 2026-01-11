import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  Check,
  ChevronLeft,
  Copy,
  Edit,
  Eye,
  EyeOff,
  Flag,
  MapPin,
  MoreVertical,
  RefreshCw,
  Share2,
  Sparkles,
} from "lucide-react";
import {
  Category,
  getCategoryLabel,
  Offer,
  Request,
  SupportedLocale,
} from "../../types";
import { AVAILABLE_CATEGORIES } from "../../data";
import { getCurrentLocale } from "../../services/categoriesService";
import { getKnownCategoryColor } from "../../utils/categoryColors";
import { CategoryIcon } from "./CategoryIcon";
import { DropdownMenu, DropdownMenuItem } from "./DropdownMenu";
import {
  copyShareUrl,
  getRequestShareUrl,
} from "../../services/routingService";
import { logger } from "../../utils/logger";

interface CompactListViewProps {
  requests: Request[];
  onSelectRequest: (request: Request) => void;
  myOffers?: Offer[];
  userId?: string;
  isGuest?: boolean;
  viewedRequestIds?: Set<string>;
  isLoadingViewedRequests?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  // External scroll position (from parent)
  externalScrollY?: number;
  // New request IDs for special animation
  newRequestIds?: Set<string>;
  // Request action handlers for dropdown menu
  onBumpRequest?: (requestId: string) => void;
  onEditRequest?: (request: Request) => void;
  onHideRequest?: (requestId: string) => void;
  onUnhideRequest?: (requestId: string) => void;
  onArchiveRequest?: (requestId: string) => void;
  onReportRequest?: (requestId: string) => void;
  onRefresh?: () => void; // Callback for refresh after actions
}

// ============================================
// Single List Item - Ultra Simple
// ============================================
const ListItem: React.FC<{
  request: Request;
  onTap: () => void;
  myOffer?: Offer;
  isViewed: boolean;
  index: number;
  isNew?: boolean; // طلب جديد وصل للتو
  categories?: Category[]; // التصنيفات من الباك اند
  locale?: SupportedLocale; // اللغة الحالية
  userId?: string;
  isMyRequest?: boolean;
  // Request action handlers
  onBumpRequest?: (requestId: string) => void;
  onEditRequest?: (request: Request) => void;
  onHideRequest?: (requestId: string) => void;
  onUnhideRequest?: (requestId: string) => void;
  onArchiveRequest?: (requestId: string) => void;
  onReportRequest?: (requestId: string) => void;
  onRefresh?: () => void;
  // Action states
  actionState?: { isBumping: boolean; isHiding: boolean; isArchiving: boolean };
  availableAfterHours?: number | null;
}> = (
  {
    request,
    onTap,
    myOffer,
    isViewed,
    index,
    isNew = false,
    categories = AVAILABLE_CATEGORIES,
    locale = "ar",
    userId,
    isMyRequest = false,
    onBumpRequest,
    onEditRequest,
    onHideRequest,
    onUnhideRequest,
    onArchiveRequest,
    onReportRequest,
    onRefresh,
    actionState = { isBumping: false, isHiding: false, isArchiving: false },
    availableAfterHours = null,
  },
) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isIdCopied, setIsIdCopied] = useState(false);

  const handleCopyRequestId = async () => {
    try {
      await navigator.clipboard.writeText(request.id);
      setIsIdCopied(true);
      setTimeout(() => setIsIdCopied(false), 1500);
    } catch (err) {
      logger.error("Failed to copy ID:", err);
    }
  };

  const handleShareRequest = async () => {
    const shareUrl = getRequestShareUrl(request.id);
    try {
      if (navigator.share) {
        await navigator.share({
          title: request.title,
          text: `${request.title}\n${
            request.description?.substring(0, 100) || ""
          }...\n\nشاهد الطلب على أبيلي`,
          url: shareUrl,
        });
      } else {
        const copied = await copyShareUrl("request", { requestId: request.id });
        if (copied) {
          // Could show a toast here, or simplified alert
          // alert("تم نسخ رابط المشاركة");
        }
      }
    } catch (err) {
      logger.error("Share failed", err);
    }
  };

  // Status
  const hasOffer = !!myOffer;
  const offerAccepted = myOffer?.status === "accepted";

  // Calculate if bump is available
  const canBump = availableAfterHours === null;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      className={`w-full text-right p-4 rounded-2xl border transition-all mb-3 overflow-hidden shadow-sm flex items-start gap-3 relative cursor-pointer ${
        isPressed
          ? "bg-primary/5 border-primary/20 scale-[0.98]"
          : "bg-card hover:bg-secondary/10 border-border/40 hover:border-primary/20"
      } ${!isViewed ? "border-primary/20 bg-primary/[0.01]" : ""} ${
        isNew
          ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
          : ""
      }`}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTap?.();
        }
      }}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      initial={isNew
        ? { opacity: 0, scale: 0.9, y: -20 }
        : { opacity: 0, y: 10 }}
      animate={isNew
        ? {
          opacity: 1,
          scale: 1,
          y: 0,
        }
        : { opacity: 1, y: 0 }}
      transition={isNew
        ? {
          type: "spring",
          stiffness: 300,
          damping: 20,
          mass: 1,
        }
        : {
          delay: Math.min(index * 0.03, 0.3),
          type: "spring",
          stiffness: 400,
          damping: 30,
        }}
    >
      {/* New Request Glow Animation */}
      {isNew && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 pointer-events-none"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
      {/* New Request Badge */}
      {isNew && (
        <motion.div
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center gap-1 shadow-lg z-10"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
        >
          <Sparkles size={10} />
          جديد
        </motion.div>
      )}
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <h3
          className={`font-bold text-sm mb-2 line-clamp-1 ${
            !isViewed ? "text-foreground" : "text-foreground/80"
          }`}
        >
          {request.title || request.description?.slice(0, 40) || "طلب"}
        </h3>

        {/* المدينة والتصنيفات في سطر واحد - التصنيفات تمتد لأسطر متعددة إذا لزم */}
        <div className="flex items-center flex-wrap gap-2 mt-2 text-xs">
          {/* المدينة */}
          {request.location && (
            <span className="flex items-center gap-1.5 text-muted-foreground/70 font-medium">
              <MapPin size={13} className="text-primary/60" />
              {request.location}
            </span>
          )}

          {/* فاصل بين المدينة والتصنيفات */}
          {request.location && request.categories &&
            request.categories.length > 0 && (
            <span className="text-muted-foreground/30">•</span>
          )}

          {/* التصنيفات - تبدأ بعد المدينة وتمتد لأسطر */}
          {request.categories && request.categories.length > 0 && (
            request.categories.map((catLabel, idx) => {
              const categoryObj = categories.find((c) =>
                c.label === catLabel || c.id === catLabel
              );
              const displayLabel = categoryObj
                ? getCategoryLabel(categoryObj, locale)
                : catLabel;
              const categoryId = categoryObj?.id || catLabel;

              return (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    getKnownCategoryColor(categoryId)
                  }`}
                >
                  <CategoryIcon
                    icon={categoryObj?.icon}
                    emoji={categoryObj?.emoji}
                    size={12}
                  />
                  <span className="truncate max-w-[80px]">
                    {displayLabel}
                  </span>
                </span>
              );
            })
          )}
        </div>
      </div>

      {/* Dropdown Menu - للجميع */}
      <div className="absolute top-3 right-3 z-[100]">
        {(() => {
          const dropdownItems: DropdownMenuItem[] = isMyRequest
            ? [
              {
                id: "bump",
                label: actionState.isBumping
                  ? "جاري التحديث..."
                  : canBump
                  ? "تحديث الطلب"
                  : `متاح بعد ${availableAfterHours} س`,
                icon: (
                  <RefreshCw
                    size={16}
                    className={actionState.isBumping ? "animate-spin" : ""}
                  />
                ),
                onClick: () => {
                  if (canBump && !actionState.isBumping && onBumpRequest) {
                    onBumpRequest(request.id);
                  }
                },
                disabled: !canBump || actionState.isBumping,
                keepOpenOnClick: !canBump, // Keep open if disabled (showing "متاح بعد")
              },
              {
                id: "edit",
                label: "تعديل الطلب",
                icon: <Edit size={16} />,
                onClick: () => {
                  if (onEditRequest) {
                    onEditRequest(request);
                  }
                },
              },
              {
                id: request.isPublic === false ? "unhide" : "hide",
                label: request.isPublic === false
                  ? actionState.isHiding ? "جاري الإظهار..." : "إظهار الطلب"
                  : actionState.isHiding
                  ? "جاري الإخفاء..."
                  : "إخفاء الطلب",
                icon: request.isPublic === false
                  ? <Eye size={16} />
                  : <EyeOff size={16} />,
                onClick: request.isPublic === false
                  ? () => {
                    if (onUnhideRequest && !actionState.isHiding) {
                      onUnhideRequest(request.id);
                    }
                  }
                  : () => {
                    if (onHideRequest && !actionState.isHiding) {
                      onHideRequest(request.id);
                    }
                  },
                disabled: actionState.isHiding,
              },
              {
                id: "archive",
                label: actionState.isArchiving
                  ? "جاري الأرشفة..."
                  : "أرشفة الطلب",
                icon: <Archive size={16} />,
                onClick: () => {
                  if (onArchiveRequest && !actionState.isArchiving) {
                    if (confirm("هل أنت متأكد من أرشفة هذا الطلب؟")) {
                      onArchiveRequest(request.id);
                    }
                  }
                },
                variant: "danger",
                disabled: actionState.isArchiving,
                showDivider: true,
              },
            ]
            : [
              {
                id: "copy-id",
                label: isIdCopied
                  ? "✓ تم النسخ!"
                  : `رقم الطلب: ${request.id.slice(0, 8)}...`,
                icon: isIdCopied
                  ? <Check size={16} className="text-primary" />
                  : <Copy size={16} />,
                keepOpenOnClick: true,
                onClick: handleCopyRequestId,
              },
              {
                id: "share",
                label: "مشاركة الطلب",
                icon: <Share2 size={16} className="text-primary" />,
                onClick: handleShareRequest,
                showDivider: true,
              },
              {
                id: "report",
                label: "الإبلاغ عن الطلب",
                icon: <Flag size={16} />,
                onClick: () => {
                  if (onReportRequest) {
                    onReportRequest(request.id);
                  }
                },
                variant: "danger",
                showDivider: true,
              },
            ];

          return (
            <div
              onClick={(e) => {
                e.stopPropagation();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
              }}
            >
              <DropdownMenu
                trigger={
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                    }}
                    className="p-1 rounded transition-colors hover:bg-secondary/80 text-muted-foreground hover:text-foreground relative z-[100]"
                    title="خيارات الطلب"
                  >
                    <MoreVertical size={18} />
                  </button>
                }
                items={dropdownItems}
                align="right"
              />
            </div>
          );
        })()}
      </div>

      {/* Right Side - Status & Arrow */}
      <div className="flex flex-col items-end gap-3 flex-shrink-0 self-center">
        {hasOffer && (
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm ${
              offerAccepted
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-accent/15 text-accent-foreground border border-accent/25"
            }`}
          >
            {offerAccepted ? "✓ معتمد" : "بانتظار"}
          </span>
        )}

        <div className="w-8 h-8 rounded-full bg-secondary/30 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <ChevronLeft
            size={16}
            className="text-muted-foreground/50 group-hover:text-primary/70"
          />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// Main Component
// ============================================
export const CompactListView: React.FC<CompactListViewProps> = ({
  requests,
  onSelectRequest,
  myOffers = [],
  userId,
  isGuest = false,
  viewedRequestIds = new Set(),
  isLoadingViewedRequests = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  externalScrollY = 0,
  newRequestIds = new Set(),
  onBumpRequest,
  onEditRequest,
  onHideRequest,
  onUnhideRequest,
  onArchiveRequest,
  onReportRequest,
  onRefresh,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // استخدام AVAILABLE_CATEGORIES كمصدر موحد - نفس القائمة المستخدمة في OnboardingScreen
  const [categories, setCategories] = useState<Category[]>(
    AVAILABLE_CATEGORIES,
  );
  const [locale, setLocale] = useState<SupportedLocale>("ar");

  // State tracking for request actions (bump, hide, archive) per request
  const [requestActionStates, setRequestActionStates] = useState<
    Map<string, { isBumping: boolean; isHiding: boolean; isArchiving: boolean }>
  >(new Map());

  const updateRequestActionState = (
    requestId: string,
    updates: Partial<{
      isBumping: boolean;
      isHiding: boolean;
      isArchiving: boolean;
    }>,
  ) => {
    setRequestActionStates((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(requestId) || {
        isBumping: false,
        isHiding: false,
        isArchiving: false,
      };
      newMap.set(requestId, { ...current, ...updates });
      return newMap;
    });
  };

  // Helper to calculate available after time (5 hours cooldown for bump)
  const calculateAvailableAfter = (
    updatedAt?: Date | string,
  ): number | null => {
    if (!updatedAt) return null;
    const lastUpdated = typeof updatedAt === "string"
      ? new Date(updatedAt)
      : updatedAt;
    const fiveHoursMs = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
    const elapsedSinceUpdate = Date.now() - lastUpdated.getTime();
    const remainingMs = fiveHoursMs - elapsedSinceUpdate;

    if (remainingMs > 0) {
      const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
      return remainingHours;
    }
    return null;
  };

  // Handlers for request actions
  const handleBumpRequestInCompact = async (requestId: string) => {
    if (!onBumpRequest) return;
    const actionState = requestActionStates.get(requestId);
    if (actionState?.isBumping) return; // Prevent double-click

    updateRequestActionState(requestId, { isBumping: true });
    try {
      const success = await onBumpRequest(requestId);
      if (success && onRefresh) {
        setTimeout(() => {
          onRefresh();
        }, 500);
      }
    } catch (error) {
      console.error("Failed to bump request in compact view:", error);
    } finally {
      setTimeout(() => {
        updateRequestActionState(requestId, { isBumping: false });
      }, 300);
    }
  };

  const handleEditRequestInCompact = (request: Request) => {
    if (!onEditRequest) return;
    onEditRequest(request);
  };

  const handleHideRequestInCompact = async (requestId: string) => {
    if (!onHideRequest) return;
    const actionState = requestActionStates.get(requestId);
    if (actionState?.isHiding) return; // Prevent double-click

    updateRequestActionState(requestId, { isHiding: true });
    try {
      const success = await onHideRequest(requestId);
      if (success && onRefresh) {
        setTimeout(() => {
          onRefresh();
        }, 500);
      } else {
        updateRequestActionState(requestId, { isHiding: false });
      }
    } catch (error) {
      console.error("Failed to hide request in compact view:", error);
      updateRequestActionState(requestId, { isHiding: false });
    }
  };

  const handleUnhideRequestInCompact = async (requestId: string) => {
    if (!onUnhideRequest) return;
    const actionState = requestActionStates.get(requestId);
    if (actionState?.isHiding) return; // Prevent double-click

    updateRequestActionState(requestId, { isHiding: true });
    try {
      const success = await onUnhideRequest(requestId);
      if (success && onRefresh) {
        setTimeout(() => {
          onRefresh();
        }, 500);
      } else {
        updateRequestActionState(requestId, { isHiding: false });
      }
    } catch (error) {
      console.error("Failed to unhide request in compact view:", error);
      updateRequestActionState(requestId, { isHiding: false });
    }
  };

  const handleArchiveRequestInCompact = async (requestId: string) => {
    if (!onArchiveRequest) return;
    const actionState = requestActionStates.get(requestId);
    if (actionState?.isArchiving) return; // Prevent double-click

    updateRequestActionState(requestId, { isArchiving: true });
    try {
      const success = await onArchiveRequest(requestId);
      if (success && onRefresh) {
        setTimeout(() => {
          onRefresh();
        }, 500);
      } else {
        updateRequestActionState(requestId, { isArchiving: false });
      }
    } catch (error) {
      console.error("Failed to archive request in compact view:", error);
      updateRequestActionState(requestId, { isArchiving: false });
    }
  };

  // استخدام AVAILABLE_CATEGORIES كمصدر موحد
  useEffect(() => {
    // دائماً استخدام القائمة الشاملة من data.ts
    setCategories(AVAILABLE_CATEGORIES);
    setLocale(getCurrentLocale());

    // الاستماع لتغييرات اللغة
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "locale" && e.newValue) {
        const newLocale = e.newValue as SupportedLocale;
        if (newLocale === "ar" || newLocale === "en" || newLocale === "ur") {
          setLocale(newLocale);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Get my offer for a request
  const getMyOffer = useCallback((requestId: string) => {
    return myOffers.find((o) => o.requestId === requestId);
  }, [myOffers]);

  // Handle infinite scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    // Load more trigger
    if (!onLoadMore || isLoadingMore || !hasMore) return;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      onLoadMore();
    }
  }, [onLoadMore, isLoadingMore, hasMore]);

  // Empty state
  if (requests.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full"
    >
      {/* List Content - بدون سكرول داخلي */}
      <div className="pr-4 pl-2 pt-4 pb-[1px] relative z-[1] w-full">
        {requests.map((request, index) => {
          const isViewed = isLoadingViewedRequests ||
            viewedRequestIds.has(request.id);
          const isUnread = !isLoadingViewedRequests &&
            !viewedRequestIds.has(request.id);
          return (
            <div key={request.id} className="relative w-full">
              {/* نقطة غير مقروء - خارج الكرت على اليمين - فقط للجوالات */}
              {isUnread && (
                <motion.div
                  className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 block md:hidden"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 25,
                    delay: Math.min(index * 0.03, 0.3),
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(30,150,140,0.6)]" />
                </motion.div>
              )}
              {/* الكرت - في مكانه الطبيعي */}
              <ListItem
                request={request}
                onTap={() => onSelectRequest(request)}
                myOffer={getMyOffer(request.id)}
                isViewed={isViewed}
                index={index}
                isNew={newRequestIds.has(request.id)}
                categories={categories}
                locale={locale}
                userId={userId}
                isMyRequest={userId && request.author_id === userId}
                onBumpRequest={handleBumpRequestInCompact}
                onEditRequest={handleEditRequestInCompact}
                onHideRequest={handleHideRequestInCompact}
                onUnhideRequest={handleUnhideRequestInCompact}
                onArchiveRequest={handleArchiveRequestInCompact}
                onReportRequest={onReportRequest}
                onRefresh={onRefresh}
                actionState={requestActionStates.get(request.id) || {
                  isBumping: false,
                  isHiding: false,
                  isArchiving: false,
                }}
                availableAfterHours={calculateAvailableAfter(
                  request.updatedAt || request.createdAt,
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {isLoadingMore && (
        <div className="py-4 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default CompactListView;
