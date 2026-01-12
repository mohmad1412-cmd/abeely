import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Flag,
  Hash,
  MapPin,
  MessageCircle,
  Send,
  Share2,
} from "lucide-react";
import { Category, Offer, Request, SupportedLocale, getCategoryLabel } from "../../types.ts";
import { Button } from "./Button.tsx";
import { HighlightedText } from "./HighlightedText.tsx";
import { getKnownCategoryColor } from "../../utils/categoryColors.ts";
import { CategoryIcon } from "./CategoryIcon.tsx";

interface RequestExpansionProps {
  request: Request;
  isMyRequest: boolean;
  radarWords?: string[];
  onMakeOffer?: () => void;
  onReport?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onBump?: () => void;
  _onArchive?: () => void;
  receivedOffers?: Offer[];
  unreadMessagesPerOffer?: Map<string, number>;
  onOpenChat?: (offer: Offer) => void;
  onSelectOffer?: (offer: Offer) => void;
  children?: React.ReactNode; // For additional content
  categories?: Category[];
  locale?: SupportedLocale;
  hasMyOffer?: boolean; // If user already made an offer
}

export const RequestExpansion: React.FC<RequestExpansionProps> = ({
  request,
  isMyRequest,
  radarWords = [],
  onMakeOffer,
  onReport,
  onShare,
  onEdit,
  onBump,
  receivedOffers = [],
  unreadMessagesPerOffer = new Map(),
  onOpenChat,
  onSelectOffer,
  children,
  categories = [],
  locale = "ar",
  hasMyOffer = false,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [isZoomed, setIsZoomed] = React.useState(false);
  const imageRef = React.useRef<HTMLImageElement>(null);

  // Reset zoom when image changes
  React.useEffect(() => {
    setIsZoomed(false);
  }, [currentImageIndex]);

  const categoriesDisplay = React.useMemo(() => {
    if (!request.categories || request.categories.length === 0) return [];

    return request.categories.slice(0, 3).map((catLabel, idx) => {
      const categoryObj = categories.find((c) =>
        c.label === catLabel || c.id === catLabel
      );
      const displayLabel = categoryObj
        ? getCategoryLabel(categoryObj, locale)
        : catLabel;
      const categoryId = categoryObj?.id || catLabel;

      return {
        id: categoryId,
        label: displayLabel,
        icon: categoryObj?.icon,
        emoji: categoryObj?.emoji,
        color: getKnownCategoryColor(categoryId),
        key: `${categoryId}-${idx}`,
      };
    });
  }, [request.categories, categories, locale]);

  const deliveryInfo = React.useMemo(() => {
    if (!request.deliveryTimeFrom && request.deliveryTimeType !== "immediate") {
      return null;
    }

    let deliveryLabel = "";
    const timeFrom = request.deliveryTimeFrom?.toLowerCase() || "";
    
    if (request.deliveryTimeType === "immediate" || timeFrom.includes("فوراً")) {
      deliveryLabel = "التنفيذ فوراً";
    } else if (timeFrom.includes("يوم واحد")) {
      deliveryLabel = "التنفيذ خلال يوم واحد";
    } else if (request.deliveryTimeFrom) {
      if (request.deliveryTimeTo) {
        deliveryLabel = `التنفيذ خلال (${request.deliveryTimeFrom} - ${request.deliveryTimeTo})`;
      } else {
        deliveryLabel = `التنفيذ خلال (${request.deliveryTimeFrom})`;
      }
    }

    if (!deliveryLabel) return null;

    return {
      key: "delivery",
      label: "التنفيذ",
      value: deliveryLabel,
      icon: Clock,
    };
  }, [
    request.deliveryTimeFrom,
    request.deliveryTimeTo,
    request.deliveryTimeType,
  ]);

  const sortedOffers = React.useMemo(() => {
    if (receivedOffers.length === 0) return [];

    const statusPriority: Record<Offer["status"], number> = {
      accepted: 0,
      negotiating: 1,
      pending: 2,
      completed: 3,
      rejected: 4,
      cancelled: 5,
    };

    return [...receivedOffers].sort((a, b) => {
      const statusDiff = (statusPriority[a.status] ?? 99) -
        (statusPriority[b.status] ?? 99);
      if (statusDiff !== 0) return statusDiff;

      const unreadA = unreadMessagesPerOffer.get(a.id) || 0;
      const unreadB = unreadMessagesPerOffer.get(b.id) || 0;
      if (unreadA !== unreadB) return unreadB - unreadA;

      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdB - createdA;
    });
  }, [receivedOffers, unreadMessagesPerOffer]);

  const nextImage = (e?: React.MouseEvent | React.PointerEvent) => {
    if (e) e.stopPropagation();
    if (request.images) {
      setIsZoomed(false);
      setCurrentImageIndex((prev) => (prev + 1) % request.images!.length);
    }
  };

  const prevImage = (e?: React.MouseEvent | React.PointerEvent) => {
    if (e) e.stopPropagation();
    if (request.images) {
      setIsZoomed(false);
      setCurrentImageIndex((prev) =>
        (prev - 1 + request.images!.length) % request.images!.length
      );
    }
  };

  return (
    <div className="pt-0 px-4 space-y-4">
      {deliveryInfo && (
        <div
          className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap text-right rounded-xl border border-border/40 bg-secondary/20 p-3 -mx-4 mt-4"
          dir="rtl"
        >
          {deliveryInfo.value}
        </div>
      )}

      {/* 2. Description */}
      <div
        className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap text-right rounded-xl border border-border/40 bg-secondary/20 pt-3 px-3 pb-4 -mx-4 mt-4"
        dir="rtl"
      >
        <HighlightedText text={request.description || ""} words={radarWords} />
      </div>

      {/* 3. Images & Attachments Slider */}
      {request.images && request.images.length > 0 && (
        <div className={`relative group rounded-xl ${isZoomed ? "overflow-auto" : "overflow-hidden"} bg-secondary/20 aspect-video -mx-4`}>
          <motion.div
            className="relative w-full h-full flex"
            animate={{ x: `-${currentImageIndex * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag={!isZoomed ? "x" : false}
            dragDirectionLock
            dragElastic={0.15}
            dragMomentum={false}
            onDragEnd={(e, { offset, velocity }) => {
              if (isZoomed) return;
              const threshold = 80;
              const velocityThreshold = 300;
              if (offset.x < -threshold || velocity.x < -velocityThreshold) {
                nextImage(e as any);
              } else if (offset.x > threshold || velocity.x > velocityThreshold) {
                prevImage(e as any);
              }
            }}
          >
            {request.images.map((image, index) => (
              <motion.img
                key={index}
                ref={index === currentImageIndex ? imageRef : null}
                src={image}
                alt="Request image"
                className={`w-full h-full shrink-0 object-cover ${isZoomed ? "cursor-zoom-out" : "cursor-grab active:cursor-grabbing"}`}
                animate={{
                  scale: isZoomed && index === currentImageIndex ? 2 : 1,
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (index === currentImageIndex) {
                    setIsZoomed(!isZoomed);
                  }
                }}
                style={{ transformOrigin: "center center" }}
                draggable={false}
              />
            ))}
          </motion.div>

          {request.images.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight size={20} />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {request.images.map((_, i: number) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === currentImageIndex ? "bg-white w-3" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 5. Received Offers (My Requests Only) */}
      {isMyRequest && receivedOffers.length > 0 && (
        <div
          className="mt-4 pt-4 border-t border-border/40 text-right"
          dir="rtl"
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold text-muted-foreground">
              العروض المستلمة ({receivedOffers.length})
            </span>
          </div>
          <div className="max-h-60 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            {sortedOffers.map((offer) => {
              const isAccepted = offer.status === "accepted";
              const isNegotiating = offer.status === "negotiating";
              const unreadCount = unreadMessagesPerOffer.get(offer.id) || 0;
              const statusLabel = isAccepted
                ? "مقبول"
                : isNegotiating
                ? "تفاوض"
                : "قيد المراجعة";
              const statusClass = isAccepted
                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                : isNegotiating
                ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                : "bg-secondary/70 text-muted-foreground border-border/40";

              return (
                <div
                  key={offer.id}
                  onClick={() => onSelectOffer?.(offer)}
                  className={`p-3 rounded-xl border transition-all active:scale-[0.98] ${
                    isAccepted
                      ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10"
                      : "bg-secondary/40 border-border/40 hover:bg-secondary/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-foreground truncate">
                          {offer.providerName || "مزود خدمة"}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-bold text-primary">
                          {offer.price} ر.س
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {offer.deliveryTime}
                        </span>
                      </div>
                    </div>

                    {(isAccepted || isNegotiating) && onOpenChat && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onOpenChat(offer);
                        }}
                        className="h-8 px-3 rounded-lg gap-1.5 relative shrink-0"
                      >
                        <MessageCircle size={14} />
                        محادثة
                        {unreadCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                            {unreadCount > 9 ? "+9" : unreadCount}
                          </span>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {children && (
        <div className="mt-4 pt-4 border-t border-border/40 mb-4">
          {children}
        </div>
      )}
    </div>
  );
};
