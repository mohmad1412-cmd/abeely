import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  CheckCircle,
  ChevronDown,
  Copy,
  Edit,
  Eye,
  EyeOff,
  Flag,
  MapPin,
  MessageCircle,
  MoreVertical,
  RefreshCw,
  Share2,
} from "lucide-react";
import { Button } from "./Button.tsx";
import { HighlightedText } from "./HighlightedText.tsx";
import { RequestExpansion } from "./RequestExpansion.tsx";
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
}

const getStatusConfig = (request: Request) => {
  if (request.status === "archived") {
    return {
      text: "مؤرشف",
      icon: <Archive size={12} />,
      textColor: "text-muted-foreground",
      borderColor: "border-muted-foreground/20",
    };
  }
  if (!request.isPublic) {
    return {
      text: "مخفي",
      icon: <EyeOff size={12} />,
      textColor: "text-orange-500",
      borderColor: "border-orange-500/20",
    };
  }
  return {
    text: "نشط",
    icon: <CheckCircle size={12} />,
    textColor: "text-primary",
    borderColor: "border-primary/20",
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
  onReportRequest?: (requestId: string) => void;
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
    onReportRequest,
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
        await copyShareUrl("request", { requestId: request.id });
      }
    } catch (err) {
      logger.error("Share failed", err);
    }
  };

  const canBump = availableAfterHours === null;
  const mainCategory = request.categories?.[0] || "";

  return (
    <motion.div
      layout
      role="button"
      tabIndex={0}
      className={`w-full text-right p-4 rounded-2xl border transition-all mb-3 overflow-hidden shadow-sm flex flex-col relative cursor-pointer ${
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
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {isMyOffersView && myOffer ? (
            <>
              {/* Offer Title and Price */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3
                  className={`font-bold text-sm truncate ${
                    !isViewed ? "text-primary" : "text-foreground"
                  }`}
                >
                  {myOffer.title || "عرضي"}
                </h3>
                <span className="text-lg font-black text-primary shrink-0">
                  {myOffer.price} ر.س
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                {/* Offer Status */}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    myOffer.status === "accepted"
                      ? "bg-green-500/20 text-green-600"
                      : myOffer.status === "negotiating"
                      ? "bg-primary/20 text-primary"
                      : myOffer.status === "rejected"
                      ? "bg-red-500/20 text-red-600"
                      : "bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  {myOffer.status === "accepted"
                    ? "مقبول ✓"
                    : myOffer.status === "negotiating"
                    ? "جاري التفاوض"
                    : myOffer.status === "rejected"
                    ? "مرفوض"
                    : "قيد الانتظار"}
                </span>

                {/* Offer Location */}
                {myOffer.location && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
                    <MapPin size={12} className="text-primary/60" />
                    <span className="truncate max-w-[100px]">
                      {myOffer.location}
                    </span>
                  </div>
                )}

                {unreadMessagesPerOffer.get(myOffer.id)
                  ? (
                    <div className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {unreadMessagesPerOffer.get(myOffer.id)}
                    </div>
                  )
                  : null}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3
                  className={`font-bold text-sm truncate ${
                    !isViewed ? "text-primary" : "text-foreground"
                  }`}
                >
                  <HighlightedText text={request.title} words={radarWords} />
                </h3>
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
                {request.budgetType === "fixed" && request.budgetMin && request.budgetMax && (
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

                {unreadMessagesPerRequest.get(request.id)
                  ? (
                    <div className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
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
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="mt-0 pt-0 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {isMyOffersView && myOffer ? (
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
                      <HighlightedText text={request.description} words={radarWords} />
                    </div>
                  )}
                </div>

                {/* Offer Details and Actions */}
                {(myOffer.description || myOffer.deliveryTime) && (
                  <div className="mt-2 p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-col gap-3">
                    {myOffer.description && (
                      <div className="text-sm text-foreground/80 leading-relaxed">
                        {myOffer.description}
                      </div>
                    )}
                    {myOffer.deliveryTime && (
                      <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap text-right rounded-xl border border-border/40 bg-secondary/20 p-3">
                        {myOffer.deliveryTime}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleShareRequest();
                      }}
                      variant="secondary"
                      size="icon"
                      className="w-10 h-10 rounded-2xl shrink-0"
                      title="مشاركة"
                    >
                      <Share2 size={18} />
                    </Button>
                    <Button
                      type="button"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onReportRequest?.(request.id);
                      }}
                      variant="outline"
                      size="icon"
                      className="w-10 h-10 rounded-2xl shrink-0 border-border/60"
                      title="إبلاغ"
                    >
                      <Flag size={18} className="text-muted-foreground" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      onOpenChat?.(request.id, myOffer);
                    }}
                    variant="primary"
                    size="icon"
                    className="w-10 h-10 rounded-2xl shrink-0 relative"
                    title="فتح المحادثة"
                  >
                    <MessageCircle size={18} />
                    {unreadMessagesPerOffer.get(myOffer.id) && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full animate-bounce">
                        {unreadMessagesPerOffer.get(myOffer.id)}
                      </span>
                    )}
                  </Button>
                </div>
              </>
            ) : (
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
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const CompactListView: React.FC<CompactListViewProps> = ({
  requests,
  myOffers = [],
  userId,
  viewedRequestIds = new Set(),
  isLoadingMore = false,
  newRequestIds = new Set(),
  onBumpRequest,
  onEditRequest,
  onHideRequest,
  onUnhideRequest,
  onArchiveRequest,
  onReportRequest,
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
}) => {
  const [internalExpandedId, setInternalExpandedId] = useState<string | null>(
    null,
  );
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
              isMyRequest={userId === request.author}
              onBumpRequest={onBumpRequest}
              onEditRequest={onEditRequest}
              onHideRequest={onHideRequest}
              onUnhideRequest={onUnhideRequest}
              onArchiveRequest={onArchiveRequest}
              onReportRequest={onReportRequest}
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
            />
          </div>
        );
      })}

      {isLoadingMore && (
        <div className="py-4 flex justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
};

export default CompactListView;
