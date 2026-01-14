import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Archive,
  CheckCircle,
  ChevronDown,
  Copy,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Flag,
  Loader2,
  MapPin,
  MessageCircle,
  MoreVertical,
  Plus,
  RefreshCw,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "./Button.tsx";
import { HighlightedText } from "./HighlightedText.tsx";
import { RequestExpansion } from "./RequestExpansion.tsx";
import { QuickOfferForm } from "./QuickOfferForm.tsx";
import { ReportModal } from "./ReportModal.tsx";
import {
  Category,
  getCategoryLabel,
  Offer,
  Request,
  SupportedLocale,
} from "../../types.ts";
import { AVAILABLE_CATEGORIES } from "../../data.ts";
import { getKnownCategoryColor } from "../../utils/categoryColors.ts";
import { CategoryIcon } from "./CategoryIcon.tsx";
import {
  copyShareUrl,
  getRequestShareUrl,
} from "../../services/routingService.ts";
import { getCurrentLocale } from "../../services/categoriesService.ts";
import { logger } from "../../utils/logger.ts";
import { createOffer } from "../../services/requestsService.ts";
import {
  getOfferStatusClasses,
  getRequestStatusConfig,
} from "../../utils/statusConfig.ts";

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
  newRequestIds?: Set<string>;
  onBumpRequest?: (requestId: string) => void;
  onEditRequest?: (request: Request) => void;
  onHideRequest?: (requestId: string) => void;
  onUnhideRequest?: (requestId: string) => void;
  onArchiveRequest?: (requestId: string) => void;
  onReportRequest?: (requestId: string) => void;
  onRefresh?: () => void;
  radarWords?: string[];
  expandedRequestId?: string | null;
  onToggleExpand?: (requestId: string) => void;
  receivedOffersMap?: Map<string, Offer[]>;
  unreadMessagesPerRequest?: Map<string, number>;
  unreadMessagesPerOffer?: Map<string, number>;
  requestsWithNewOffers?: Set<string>;
  onClearNewOfferHighlight?: (requestId: string) => void;
  onOpenChat?: (requestId: string, offer: Offer) => void;
  onSelectOffer?: (offer: Offer) => void;
  isMyRequestsView?: boolean;
  isMyOffersView?: boolean;
  showCategoriesInStatus?: boolean;
  disablePadding?: boolean;
  onCancelOffer?: (offerId: string) => Promise<void> | void;
}

const getStatusConfig = (request: Request) => {
  const config = getRequestStatusConfig(request.status, request.isPublic);
  const icon = request.status === "archived"
    ? <Archive size={12} />
    : !request.isPublic
    ? <EyeOff size={12} />
    : <CheckCircle size={12} />;

  return {
    text: config.text,
    icon: icon,
    textColor: config.textColor,
    borderColor: config.borderColor,
  };
};

const ListItem: React.FC<{
  request: Request;
  myOffer?: Offer;
  isViewed: boolean;
  isNew?: boolean;
  categories?: Category[];
  locale?: SupportedLocale;
  userId?: string;
  isMyRequest?: boolean;
  onBumpRequest?: (requestId: string) => void;
  onEditRequest?: (request: Request) => void;
  onHideRequest?: (requestId: string) => void;
  onUnhideRequest?: (requestId: string) => void;
  onArchiveRequest?: (requestId: string) => void;
  onUnarchiveRequest?: (requestId: string) => void;
  onReportRequest?: (requestId: string) => void;
  onSelectRequest?: (request: Request) => void;
  onOpenOfferPopup?: (request: Request) => void;
  actionState?: { isBumping: boolean; isHiding: boolean; isArchiving: boolean };
  availableAfterHours?: number | null;
  radarWords?: string[];
  isExpanded?: boolean;
  onToggle?: (e: React.MouseEvent) => void;
  receivedOffers?: Offer[];
  unreadMessagesPerRequest?: Map<string, number>;
  unreadMessagesPerOffer?: Map<string, number>;
  hasNewOffer?: boolean;
  onOpenChat?: (requestId: string, offer: Offer) => void;
  onSelectOffer?: (offer: Offer) => void;
  isMyOffersView?: boolean;
  showCategoriesInStatus?: boolean;
  isGuest?: boolean;
  isMyRequestsView?: boolean;
  onRefresh?: () => void | Promise<void>;
  onCancelOffer?: (offerId: string) => Promise<void> | void;
}> = (
  {
    request,
    myOffer,
    isViewed,
    isNew = false,
    categories = AVAILABLE_CATEGORIES,
    userId,
    isMyRequest = false,
    onBumpRequest,
    onEditRequest,
    onHideRequest,
    onUnhideRequest,
    onArchiveRequest,
    onUnarchiveRequest,
    onReportRequest,
    onSelectRequest,
    onOpenOfferPopup,
    actionState = { isBumping: false, isHiding: false, isArchiving: false },
    availableAfterHours = null,
    radarWords = [],
    isExpanded = false,
    onToggle,
    receivedOffers = [],
    unreadMessagesPerRequest = new Map(),
    unreadMessagesPerOffer = new Map(),
    hasNewOffer = false,
    onOpenChat,
    onSelectOffer,
    isMyOffersView = false,
    locale = getCurrentLocale(),
    showCategoriesInStatus = false,
    isGuest = false,
    isMyRequestsView = false,
    onRefresh,
    onCancelOffer,
  },
) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isIdCopied, setIsIdCopied] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancellingOffer, setIsCancellingOffer] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [isUnhiding, setIsUnhiding] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // هل يمكن لمقدم العرض فتح المحادثة؟
  // ملاحظة مهمة: مقدم العرض لا يمكنه فتح المحادثة إلا إذا:
  // 1. تم قبول عرضه (accepted)
  // 2. أو بدأ صاحب الطلب التفاوض (negotiating)
  // لا يمكن لمقدم العرض فتح المحادثة إذا كان العرض في حالة pending
  const canProviderChat = React.useMemo(() => {
    if (!isMyOffersView || !myOffer) {
      return false;
    }
    // يمكنه المحادثة فقط إذا تم اعتماد عرضه أو بدأ صاحب الطلب التفاوض
    // لا يمكنه فتح المحادثة إذا كان العرض في حالة pending
    return myOffer.status === "accepted" || myOffer.status === "negotiating";
  }, [isMyOffersView, myOffer]);

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
        await copyShareUrl("request", { requestId: request.id });
      }
    } catch (err) {
      logger.error("Share failed", err);
    }
  };

  const canBump = availableAfterHours === null;
  const mainCategory = request.categories?.[0] || "";

  // Calculate remaining time in seconds
  const getRemainingTime = (): string => {
    if (availableAfterHours === null) return "00:00:00";
    const lastUpdated = request.updatedAt || request.createdAt;
    if (!lastUpdated) return "00:00:00";

    const lastUpdatedDate = typeof lastUpdated === "string"
      ? new Date(lastUpdated)
      : lastUpdated;
    const sixHoursMs = 6 * 60 * 60 * 1000;
    const elapsed = currentTime - lastUpdatedDate.getTime();
    const remaining = sixHoursMs - elapsed;

    if (remaining <= 0) return "00:00:00";

    const totalSeconds = Math.floor(remaining / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${
      s.toString().padStart(2, "0")
    }`;
  };

  // Update time every second when button is disabled
  useEffect(() => {
    if (!canBump && availableAfterHours !== null) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [canBump, availableAfterHours]);

  // Debug: Log when showArchiveConfirm changes
  useEffect(() => {
    console.log("showArchiveConfirm state changed:", showArchiveConfirm);
    if (showArchiveConfirm) {
      console.log(
        "Popup should be visible now, onArchiveRequest:",
        !!onArchiveRequest,
      );
    }
  }, [showArchiveConfirm, onArchiveRequest]);

  return (
    <motion.div
      layout
      role="button"
      tabIndex={0}
      className={`w-full text-right rounded-2xl border transition-all mb-6 overflow-hidden shadow-sm flex flex-col relative cursor-pointer box-border ${
        isPressed
          ? "bg-primary/5 border-primary/20 scale-[0.98]"
          : isExpanded
          ? "bg-primary/5 border-primary/20"
          : "bg-card hover:bg-secondary/10 border-border/40 hover:border-primary/20"
      } ${!isViewed ? "border-primary/20 bg-primary/[0.01]" : ""} ${
        isNew || hasNewOffer
          ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
          : ""
      } ${hasNewOffer ? "bg-primary/5 border-primary/20 shadow-md" : ""}`}
      onClick={(e) => onToggle?.(e)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle?.(e as any);
        }
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
    >
      <div className="flex items-start gap-4 p-4">
        <div className="flex-1 min-w-0">
          {isMyOffersView && myOffer
            ? (
              <>
                {/* Offer Description and Price */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3
                    className={`font-bold text-sm truncate ${
                      !isViewed ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {myOffer.description || myOffer.title || "عرضي"}
                  </h3>
                  <span className="text-lg font-black text-primary shrink-0">
                    {myOffer.price} ر.س
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {/* Offer Status */}
                  {(() => {
                    const statusConfig = getOfferStatusClasses(myOffer.status);
                    const displayText = myOffer.status === "accepted"
                      ? "مقبول ✓"
                      : statusConfig.label;
                    return (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusConfig.className}`}
                      >
                        {displayText}
                      </span>
                    );
                  })()}

                  {/* Offer Location */}
                  {myOffer.location && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
                      <MapPin size={12} className="text-primary/60" />
                      <span className="truncate max-w-[100px]">
                        {myOffer.location}
                      </span>
                    </div>
                  )}

                  {!isExpanded && unreadMessagesPerOffer.get(myOffer.id)
                    ? (
                      <div className="bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center aspect-square">
                        {unreadMessagesPerOffer.get(myOffer.id)}
                      </div>
                    )
                    : null}
                </div>
              </>
            )
            : (
              <>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3
                    className={`font-bold text-sm truncate flex-1 min-w-0 ${
                      !isViewed ? "text-primary" : "text-foreground"
                    }`}
                  >
                    <HighlightedText text={request.title} words={radarWords} />
                  </h3>
                  {/* Status Badge - Archived or Hidden - At the end (left side in RTL) */}
                  {(request.status === "archived" || !request.isPublic) && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                        request.status === "archived"
                          ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700"
                      }`}
                    >
                      {request.status === "archived"
                        ? (
                          <>
                            <Archive size={10} />
                            مؤرشف
                          </>
                        )
                        : (
                          <>
                            <EyeOff size={10} />
                            مخفي
                          </>
                        )}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {request.location && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
                      <MapPin size={12} className="text-primary/60" />
                      <span className="truncate max-w-[100px]">
                        {request.location}
                      </span>
                    </div>
                  )}

                  {/* Show categories instead of status badge in "discover" and "my offers" views */}
                  {showCategoriesInStatus && request.categories &&
                    request.categories.length > 0 && (
                      request.categories.slice(0, 2).map((catLabel, idx) => {
                        const categoryObj = categories.find(
                          (c) => c.label === catLabel || c.id === catLabel,
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
                            <span className="truncate max-w-[60px]">
                              {displayLabel}
                            </span>
                          </span>
                        );
                      })
                    )}

                  {/* Budget badge */}
                  {request.budgetType === "fixed" && request.budgetMin &&
                    request.budgetMax && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/30 text-gray-700 dark:text-gray-300">
                      (ميزانية: {request.budgetMin} - {request.budgetMax} ر.س)
                    </span>
                  )}

                  {/* Show status badge only if not showing categories */}
                  {!showCategoriesInStatus && (() => {
                    const statusConfig = getStatusConfig(request);
                    // Only show status badge if status is not "active" (i.e., archived or hidden)
                    if (statusConfig.text === "نشط") return null;
                    return (
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusConfig.borderColor} ${statusConfig.textColor}`}
                      >
                        {statusConfig.icon}
                        {statusConfig.text}
                      </div>
                    );
                  })()}

                  {!isExpanded && unreadMessagesPerRequest.get(request.id)
                    ? (
                      <div className="bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center aspect-square">
                        {unreadMessagesPerRequest.get(request.id)}
                      </div>
                    )
                    : null}
                </div>
              </>
            )}
        </div>

        <div className="flex flex-col items-center gap-2">
          {/* Dot badge - show when not viewed */}
          {!isViewed && (
            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-sm shrink-0" />
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className="text-muted-foreground/40"
          >
            <ChevronDown size={20} />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="mt-0 pt-0 px-4 pb-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {isMyOffersView && myOffer
              ? (
                <>
                  {/* Request Info Box */}
                  <div className="mt-2 p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-foreground">
                        {request.title}
                      </h4>
                    </div>
                    {request.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin size={12} />
                        <span>{request.location}</span>
                      </div>
                    )}
                    {showCategoriesInStatus && request.categories &&
                      request.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {request.categories.slice(0, 2).map((catLabel, idx) => {
                          const categoryObj = categories.find(
                            (c) => c.label === catLabel || c.id === catLabel,
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
                              <span>{displayLabel}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {request.description && (
                      <div className="text-sm text-foreground/80 leading-relaxed">
                        <HighlightedText
                          text={request.description}
                          words={radarWords}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleShareRequest();
                        }}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        title="مشاركة"
                      >
                        <Share2 size={20} />
                      </button>
                      {onCancelOffer && myOffer &&
                        (myOffer.status === "pending" ||
                          myOffer.status === "negotiating") &&
                        (
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowCancelConfirm(true);
                            }}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            title="حذف العرض"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={(e: React.MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsReportModalOpen(true);
                        }}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        title="إبلاغ"
                      >
                        <Flag size={20} />
                      </button>
                    </div>
                    {canProviderChat
                      ? (
                        <Button
                          type="button"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            onOpenChat?.(request.id, myOffer);
                          }}
                          variant="primary"
                          className="relative gap-2"
                        >
                          <MessageCircle size={18} className="shrink-0" />
                          {(() => {
                            const unreadCount =
                              unreadMessagesPerOffer.get(myOffer.id) || 0;
                            // إذا كان هناك رسائل غير مقروءة
                            if (unreadCount > 0) {
                              return "تابع التفاوض";
                            }
                            // إذا لم تكن هناك رسائل غير مقروءة وكان العرض مقبولاً (أول مرة)
                            if (myOffer.status === "accepted") {
                              return "ابدأ التفاوض";
                            }
                            // إذا لم تكن هناك رسائل غير مقروءة وكان التفاوض بدأ
                            return "تواصل";
                          })()}
                          {unreadMessagesPerOffer.get(myOffer.id) && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full animate-bounce">
                              {unreadMessagesPerOffer.get(myOffer.id)}
                            </span>
                          )}
                        </Button>
                      )
                      : (
                        <div className="text-xs text-muted-foreground text-center px-3 py-2">
                          انتظر قبول العرض، أو بدء التفاوض
                        </div>
                      )}
                  </div>
                </>
              )
              : (
                <>
                  <RequestExpansion
                    request={request}
                    isMyRequest={isMyRequest}
                    radarWords={radarWords}
                    onReport={() => onReportRequest?.(request.id)}
                    onEdit={() => onEditRequest?.(request)}
                    onBump={() => onBumpRequest?.(request.id)}
                    onShare={handleShareRequest}
                    receivedOffers={receivedOffers}
                    unreadMessagesPerOffer={unreadMessagesPerOffer}
                    onOpenChat={(offer) => onOpenChat?.(request.id, offer)}
                    onSelectOffer={onSelectOffer}
                    categories={categories}
                    locale={locale}
                    hasMyOffer={!!myOffer}
                  />
                  {/* Action Buttons for My Requests - Only visible inside accordion */}
                  {isMyRequestsView && isMyRequest && !isMyOffersView && (
                    <div
                      className="flex items-center gap-2 mt-4 flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onBumpRequest && (
                        <Button
                          type="button"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (canBump) {
                              onBumpRequest(request.id);
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={!canBump || actionState.isBumping}
                          isLoading={actionState.isBumping}
                        >
                          <RefreshCw size={16} />
                          {canBump ? "تحديث" : `متاح بعد ${getRemainingTime()}`}
                        </Button>
                      )}
                      {(onHideRequest || onUnhideRequest) && (
                        <Button
                          type="button"
                          onClick={async (e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (request.isPublic) {
                              setIsHiding(true);
                              try {
                                await onHideRequest?.(request.id);
                              } finally {
                                setIsHiding(false);
                              }
                            } else {
                              setIsUnhiding(true);
                              try {
                                await onUnhideRequest?.(request.id);
                              } finally {
                                setIsUnhiding(false);
                              }
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          isLoading={isHiding || isUnhiding}
                          disabled={isHiding || isUnhiding}
                        >
                          {request.isPublic
                            ? <EyeOff size={16} />
                            : <Eye size={16} />}
                          {request.isPublic ? "إخفاء" : "إظهار"}
                        </Button>
                      )}
                      {onEditRequest && (
                        <Button
                          type="button"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            onEditRequest(request);
                          }}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <Edit size={16} />
                          تعديل
                        </Button>
                      )}
                      {(onArchiveRequest || onUnarchiveRequest) && (
                        <>
                          {request.status === "archived" && onUnarchiveRequest
                            ? (
                              <Button
                                type="button"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  onUnarchiveRequest(request.id);
                                }}
                                variant="outline"
                                size="sm"
                                className="gap-2 text-primary hover:text-primary hover:bg-primary/10"
                              >
                                <RefreshCw size={16} />
                                إلغاء الأرشفة
                              </Button>
                            )
                            : onArchiveRequest
                            ? (
                              <Button
                                type="button"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  console.log("Archive button clicked", {
                                    onArchiveRequest: !!onArchiveRequest,
                                    requestId: request.id,
                                    currentState: showArchiveConfirm,
                                  });
                                  setShowArchiveConfirm(true);
                                  console.log(
                                    "After setShowArchiveConfirm(true)",
                                  );
                                }}
                                variant="outline"
                                size="sm"
                                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={isArchiving}
                                isLoading={isArchiving}
                              >
                                <Archive size={16} />
                                أرشفة
                              </Button>
                            )
                            : null}
                        </>
                      )}
                    </div>
                  )}
                  {/* Action Buttons - Only visible inside accordion */}
                  {!isMyRequest && !isMyOffersView && (
                    <div
                      className="flex items-center gap-2 mt-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleShareRequest();
                        }}
                        variant="ghost"
                        size="icon"
                        className="w-auto h-auto p-2 shrink-0 bg-transparent hover:bg-transparent border-0"
                        title="مشاركة"
                      >
                        <Share2
                          size={20}
                          className="text-muted-foreground hover:text-foreground"
                        />
                      </Button>
                      <Button
                        type="button"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onReportRequest?.(request.id);
                        }}
                        variant="ghost"
                        size="icon"
                        className="w-auto h-auto p-2 shrink-0 bg-transparent hover:bg-transparent border-0"
                        title="إبلاغ"
                      >
                        <Flag
                          size={20}
                          className="text-muted-foreground hover:text-foreground"
                        />
                      </Button>
                      {!myOffer && (
                        <Button
                          type="button"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            onOpenOfferPopup?.(request);
                          }}
                          variant="primary"
                          size="md"
                          className="flex-1 h-11 text-sm font-medium"
                        >
                          <Plus size={18} />
                          تقديم عرض
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Archive Request Confirmation Modal */}
      <AnimatePresence mode="wait">
        {showArchiveConfirm && ReactDOM.createPortal(
          <motion.div
            key="archive-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={() => {
              console.log("Closing archive confirm modal");
              setShowArchiveConfirm(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
                  <Archive className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-lg font-bold mb-2">
                  أرشفة الطلب
                </h3>
                <p className="text-muted-foreground text-sm">
                  هل أنت متأكد من أرشفة هذا الطلب؟ يمكنك إلغاء الأرشفة لاحقاً.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowArchiveConfirm(false)}
                >
                  تراجع
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="flex-1"
                  isLoading={isArchiving}
                  onClick={async () => {
                    if (onArchiveRequest) {
                      setIsArchiving(true);
                      try {
                        await onArchiveRequest(request.id);
                        setShowArchiveConfirm(false);
                        // Haptic feedback
                        if (navigator.vibrate) {
                          navigator.vibrate(100);
                        }
                      } catch (error) {
                        logger.error(
                          "Error archiving request:",
                          error,
                          "CompactListView",
                        );
                      } finally {
                        setIsArchiving(false);
                      }
                    }
                  }}
                >
                  نعم، أرشفة
                </Button>
              </div>
            </motion.div>
          </motion.div>,
          document.body,
        )}
      </AnimatePresence>

      {/* Cancel Offer Confirmation Modal */}
      <AnimatePresence>
        {showCancelConfirm && myOffer && ReactDOM.createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={() => setShowCancelConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold mb-2">
                  إلغاء العرض
                </h3>
                <p className="text-muted-foreground text-sm">
                  هل أنت متأكد من إلغاء هذا العرض؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  تراجع
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="flex-1"
                  isLoading={isCancellingOffer}
                  onClick={async () => {
                    if (onCancelOffer && myOffer) {
                      setIsCancellingOffer(true);
                      try {
                        await onCancelOffer(myOffer.id);
                        setShowCancelConfirm(false);
                        // Haptic feedback
                        if (navigator.vibrate) {
                          navigator.vibrate(100);
                        }
                      } catch (error) {
                        logger.error(
                          "Error cancelling offer:",
                          error,
                          "CompactListView",
                        );
                      } finally {
                        setIsCancellingOffer(false);
                      }
                    }
                  }}
                >
                  نعم، إلغاء العرض
                </Button>
              </div>
            </motion.div>
          </motion.div>,
          document.body,
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetId={request.id}
        targetType="request"
      />
    </motion.div>
  );
};

export const CompactListView: React.FC<CompactListViewProps> = ({
  requests,
  myOffers = [],
  userId,
  isGuest = false,
  viewedRequestIds = new Set(),
  isLoadingMore = false,
  newRequestIds = new Set(),
  onBumpRequest,
  onEditRequest,
  onHideRequest,
  onUnhideRequest,
  onArchiveRequest,
  onUnarchiveRequest,
  onReportRequest,
  onSelectRequest,
  onRefresh,
  radarWords = [],
  expandedRequestId: externalExpandedId,
  onToggleExpand: externalOnToggle,
  receivedOffersMap = new Map(),
  unreadMessagesPerRequest = new Map(),
  unreadMessagesPerOffer = new Map(),
  requestsWithNewOffers = new Set(),
  onClearNewOfferHighlight,
  onOpenChat,
  onSelectOffer,
  isMyOffersView = false,
  showCategoriesInStatus = false,
  disablePadding = false,
  isMyRequestsView = false,
  onCancelOffer,
}) => {
  const [internalExpandedId, setInternalExpandedId] = useState<string | null>(
    null,
  );
  const [offerPopupRequest, setOfferPopupRequest] = useState<Request | null>(
    null,
  );
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const expandedId = externalExpandedId !== undefined
    ? externalExpandedId
    : internalExpandedId;

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (externalOnToggle) {
      externalOnToggle(id);
    } else {
      setInternalExpandedId((prev) => (prev === id ? null : id));
    }
  };

  const getMyOffer = (requestId: string) => {
    return myOffers.find((o) => o.requestId === requestId);
  };

  const calculateAvailableAfter = (
    updatedAt?: Date | string,
  ): number | null => {
    if (!updatedAt) return null;
    const lastUpdated = typeof updatedAt === "string"
      ? new Date(updatedAt)
      : updatedAt;
    const fiveHoursMs = 5 * 60 * 60 * 1000;
    const elapsed = Date.now() - lastUpdated.getTime();
    const remaining = fiveHoursMs - elapsed;
    return remaining > 0 ? Math.ceil(remaining / (60 * 60 * 1000)) : null;
  };

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "locale" && e.newValue) {
        // Handle locale change if needed
      }
    };
    globalThis.addEventListener("storage", handleStorage);
    return () => globalThis.removeEventListener("storage", handleStorage);
  }, []);

  const handleOpenOfferPopup = (request: Request) => {
    setOfferPopupRequest(request);
  };

  const handleCloseOfferPopup = () => {
    setOfferPopupRequest(null);
  };

  const handleSubmitOffer = async (offer: {
    price: string;
    duration: string;
    location: string;
    title: string;
    description: string;
    isNegotiable?: boolean;
  }): Promise<boolean> => {
    if (!offerPopupRequest || !userId) {
      logger.error("Cannot submit offer: missing request or userId");
      return false;
    }

    if (isGuest) {
      logger.warn("Guest user attempted to submit offer");
      return false;
    }

    setIsSubmittingOffer(true);
    try {
      const result = await createOffer({
        requestId: offerPopupRequest.id,
        providerId: userId,
        title: offer.title.trim(),
        description: offer.description.trim() || undefined,
        price: offer.price.trim(),
        deliveryTime: offer.duration.trim() || undefined,
        location: offer.location.trim() || undefined,
        isNegotiable: offer.isNegotiable ?? true,
      });

      if (result) {
        logger.log("Offer created successfully:", result.id);
        handleCloseOfferPopup();
        // Refresh the list or notify parent
        onRefresh?.();
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Error creating offer:", error);
      return false;
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  if (requests.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`w-full pt-4 pb-20 ${disablePadding ? "" : "px-4"}`}
    >
      {requests.map((request) => {
        const isViewed = viewedRequestIds.has(request.id);
        const receivedOffers = receivedOffersMap.get(request.id) || [];
        const hasNewOffer = requestsWithNewOffers.has(request.id);
        const myOffer = getMyOffer(request.id);
        const isExpanded = expandedId === request.id;

        return (
          <div key={request.id} className="relative">
            <ListItem
              request={request}
              myOffer={myOffer}
              isViewed={isViewed}
              isNew={newRequestIds.has(request.id)}
              categories={AVAILABLE_CATEGORIES}
              userId={userId}
              isMyRequest={userId === request.authorId ||
                userId === request.author}
              onBumpRequest={onBumpRequest}
              onEditRequest={onEditRequest}
              onHideRequest={onHideRequest}
              onUnhideRequest={onUnhideRequest}
              onArchiveRequest={onArchiveRequest}
              onUnarchiveRequest={onUnarchiveRequest}
              onReportRequest={onReportRequest}
              onSelectRequest={onSelectRequest}
              onOpenOfferPopup={handleOpenOfferPopup}
              availableAfterHours={calculateAvailableAfter(
                request.updatedAt || request.createdAt,
              )}
              radarWords={radarWords}
              isExpanded={isExpanded}
              onToggle={(e) => {
                if (hasNewOffer && onClearNewOfferHighlight) {
                  onClearNewOfferHighlight(request.id);
                }
                toggleExpand(request.id, e);
              }}
              receivedOffers={receivedOffers}
              unreadMessagesPerRequest={unreadMessagesPerRequest}
              unreadMessagesPerOffer={unreadMessagesPerOffer}
              hasNewOffer={hasNewOffer}
              onOpenChat={onOpenChat}
              onSelectOffer={onSelectOffer}
              isMyOffersView={isMyOffersView}
              showCategoriesInStatus={showCategoriesInStatus}
              isGuest={isGuest}
              isMyRequestsView={isMyRequestsView}
              onRefresh={onRefresh}
              onCancelOffer={onCancelOffer}
            />
          </div>
        );
      })}

      {isLoadingMore && (
        <div className="py-4 flex justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* Offer Popup */}
      {offerPopupRequest &&
        ReactDOM.createPortal(
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseOfferPopup}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
            />
            {/* Bottom Sheet */}
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{
                type: "spring",
                damping: 35,
                stiffness: 400,
                mass: 0.8,
              }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.3 }}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                const velocityThreshold = 800;
                const offsetThreshold = 150;
                const shouldClose = info.offset.y > offsetThreshold ||
                  info.velocity.y > velocityThreshold;

                if (shouldClose) {
                  handleCloseOfferPopup();
                }
              }}
              className="fixed inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 max-w-md w-full mx-auto bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl z-[10000] max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle - Mobile Only */}
              <div className="sm:hidden flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none shrink-0">
                <div className="w-20 h-1 bg-muted-foreground/40 dark:bg-muted-foreground/50 rounded-full transition-colors duration-200 active:bg-muted-foreground/60" />
              </div>
              {/* Header */}
              <div className="px-4 pt-4 pb-4 border-b border-border bg-secondary/30 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">تقديم عرض</h3>
                  <button
                    onClick={handleCloseOfferPopup}
                    className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                {/* Request Info Box */}
                <div className="bg-background border border-border rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-primary shrink-0" />
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {offerPopupRequest.title}
                    </p>
                  </div>
                  {offerPopupRequest.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin size={12} className="shrink-0" />
                      <p className="text-xs">{offerPopupRequest.location}</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Form */}
              <div className="px-4 pt-4 pb-4 overflow-y-auto flex-1">
                <QuickOfferForm
                  requestTitle={offerPopupRequest.title}
                  requestLocation={offerPopupRequest.location}
                  onSubmit={handleSubmitOffer}
                  isSubmitting={isSubmittingOffer}
                  isGuest={isGuest}
                  onLoginRequired={() => {
                    handleCloseOfferPopup();
                    // You can add navigation to login here if needed
                  }}
                />
              </div>
            </motion.div>
          </>,
          document.body,
        )}
    </div>
  );
};

export default CompactListView;
