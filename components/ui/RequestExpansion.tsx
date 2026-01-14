import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, MessageCircle } from "lucide-react";
import { Category, Offer, Request, SupportedLocale } from "../../types.ts";
import { Button } from "./Button.tsx";
import { HighlightedText } from "./HighlightedText.tsx";
import { getOfferStatusConfig } from "../../utils/statusConfig.ts";
import { supabase } from "../../services/supabaseClient.ts";
import { logger } from "../../utils/logger.ts";
import { ImageViewerModal } from "./ImageViewerModal.tsx";

interface RequestExpansionProps {
  request: Request;
  isMyRequest: boolean;
  radarWords?: string[];
  onReport?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onBump?: () => void;
  receivedOffers?: Offer[];
  unreadMessagesPerOffer?: Map<string, number>;
  onOpenChat?: (offer: Offer) => void;
  onSelectOffer?: (offer: Offer) => void;
  children?: React.ReactNode;
  categories?: Category[];
  locale?: SupportedLocale;
  hasMyOffer?: boolean;
}

export const RequestExpansion: React.FC<RequestExpansionProps> = ({
  request,
  isMyRequest,
  radarWords = [],
  onReport: _onReport,
  onShare: _onShare,
  onEdit: _onEdit,
  onBump: _onBump,
  receivedOffers = [],
  unreadMessagesPerOffer = new Map(),
  onOpenChat,
  onSelectOffer,
  children,
  categories: _categories = [],
  locale: _locale = "ar",
  hasMyOffer: _hasMyOffer = false,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [isViewerOpen, setIsViewerOpen] = React.useState(false);
  const [providerNamesMap, setProviderNamesMap] = React.useState<
    Map<string, string>
  >(new Map());

  // Fetch provider names from profiles if providerName is "مزود خدمة"
  React.useEffect(() => {
    const fetchProviderNames = async () => {
      const offersNeedingNames = receivedOffers.filter(
        (offer) =>
          (!offer.providerName || offer.providerName === "مزود خدمة") &&
          offer.providerId,
      );

      if (offersNeedingNames.length === 0) return;

      const providerIds = offersNeedingNames
        .map((offer) => offer.providerId)
        .filter((id): id is string => !!id);

      if (providerIds.length === 0) return;

      try {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", providerIds);

        if (error) {
          logger.warn("Failed to fetch provider names:", error);
          return;
        }

        if (profiles) {
          const newMap = new Map<string, string>();
          profiles.forEach((profile) => {
            if (profile.display_name && profile.display_name.trim()) {
              newMap.set(profile.id, profile.display_name.trim());
            }
          });
          setProviderNamesMap(newMap);
        }
      } catch (err) {
        logger.error("Error fetching provider names:", err);
      }
    };

    fetchProviderNames();
  }, [receivedOffers]);

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
        deliveryLabel =
          `التنفيذ خلال (${request.deliveryTimeFrom} - ${request.deliveryTimeTo})`;
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
    if (e && "stopPropagation" in e) e.stopPropagation();
    if (request.images && request.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % request.images!.length);
    }
  };

  const prevImage = (e?: React.MouseEvent | React.PointerEvent) => {
    if (e && "stopPropagation" in e) e.stopPropagation();
    if (request.images && request.images.length > 1) {
      setCurrentImageIndex((prev) =>
        (prev - 1 + request.images!.length) % request.images!.length
      );
    }
  };

  return (
    <div className="pt-0 px-4 space-y-4">
      {deliveryInfo && (
        <div
          className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap text-right rounded-xl border border-border/40 bg-secondary/20 p-3 -mx-4 mt-2 shadow-sm"
          dir="rtl"
        >
          <div className="flex items-center gap-2 mb-1 text-primary">
            <Clock size={14} />
            <span className="font-bold text-[11px]">موعد التنفيذ المتوقع:</span>
          </div>
          {deliveryInfo.value}
        </div>
      )}

      {/* 2. Description */}
      <div
        className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap text-right rounded-xl border border-border/40 bg-secondary/20 pt-3 px-3 pb-4 -mx-4 mt-4 shadow-sm"
        dir="rtl"
      >
        <HighlightedText text={request.description || ""} words={radarWords} />
      </div>

      {/* 3. Images Slider */}
      {request.images && request.images.length > 0 && (
        <>
          <div
            className={`relative group rounded-2xl overflow-hidden bg-secondary/10 aspect-video -mx-4 shadow-inner border border-border/20`}
          >
            <motion.div
              className="h-full flex"
              drag={request.images.length > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                const threshold = 50;
                if (info.offset.x < -threshold) {
                  nextImage();
                } else if (info.offset.x > threshold) {
                  prevImage();
                }
              }}
              animate={{ x: `-${currentImageIndex * 100}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ width: `${request.images.length * 100}%` }}
            >
              {request.images.map((image, index) => (
                <div
                  key={index}
                  className="w-full h-full relative shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsViewerOpen(true);
                  }}
                >
                  <motion.img
                    src={image}
                    alt="Request content"
                    className="w-full h-full object-cover select-none pointer-events-none transition-all duration-300 group-hover:scale-105 cursor-pointer"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
                </div>
              ))}
            </motion.div>

            {request.images.length > 1 && (
              <>
                {/* Desktop arrows - small & neat */}
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all border border-white/10 hidden md:flex"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all border border-white/10 hidden md:flex"
                >
                  <ChevronRight size={18} />
                </button>

                {/* Pagination indicators - pill style */}
                <div className="absolute bottom-3 right-1/2 translate-x-1/2 flex gap-1.5 z-10 bg-black/25 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
                  {request.images.map((_, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(i);
                      }}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        i === currentImageIndex ? "bg-white w-4" : "bg-white/40"
                      }`}
                    />
                  ))}
                </div>

                {/* Photo Counter */}
                <div className="absolute top-3 left-3 z-10 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/5 text-[10px] font-bold text-white/95 shadow-sm">
                  {currentImageIndex + 1} / {request.images.length}
                </div>
              </>
            )}

            {currentImageIndex === 0 && (
              <div className="absolute top-3 right-3 z-10 bg-black/25 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/5 text-[9px] font-medium text-white/90 pointer-events-none">
                انقر للفتح
              </div>
            )}
          </div>

          <ImageViewerModal
            images={request.images ?? []}
            initialIndex={currentImageIndex}
            isOpen={isViewerOpen}
            onClose={() => setIsViewerOpen(false)}
          />
        </>
      )}

      {/* 5. Received Offers (My Requests Only) */}
      {isMyRequest && receivedOffers.length > 0 && (
        <>
          <div className="w-full h-px bg-border/20 my-4" />
          <div className="text-right" dir="rtl">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                العروض المستلمة ({receivedOffers.length})
              </span>
            </div>
            <div className="max-h-60 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
              {sortedOffers.map((offer) => {
                const isAccepted = offer.status === "accepted";
                const isNegotiating = offer.status === "negotiating";
                const unreadCount = unreadMessagesPerOffer.get(offer.id) || 0;
                const statusLabel = isAccepted
                  ? "مقبول"
                  : isNegotiating
                  ? "تفاوض"
                  : "قيد المراجعة";
                const statusConfig = getOfferStatusConfig(offer.status);
                const statusClass =
                  `${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor} border`;

                return (
                  <div
                    key={offer.id}
                    onClick={() => onSelectOffer?.(offer)}
                    className={`p-3.5 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer shadow-sm hover:shadow-md ${
                      isAccepted
                        ? "bg-primary/[0.03] border-primary/20 ring-1 ring-primary/5"
                        : "bg-secondary/20 border-border/40 hover:bg-secondary/30"
                    }`}
                  >
                    <div className="mb-1.5">
                      <span className="text-sm font-black text-foreground truncate block">
                        {(() => {
                          if (
                            (!offer.providerName ||
                              offer.providerName === "مزود خدمة") &&
                            offer.providerId
                          ) {
                            const cachedName = providerNamesMap.get(
                              offer.providerId,
                            );
                            return cachedName || offer.providerName ||
                              "مزود خدمة";
                          }
                          return offer.providerName || "مزود خدمة";
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-black text-primary text-[13px]">
                          {offer.price} ر.س
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full border font-black uppercase ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                        {offer.deliveryTime && (
                          <span className="flex items-center gap-1 opacity-80">
                            <Clock size={10} />
                            {offer.deliveryTime}
                          </span>
                        )}
                      </div>
                      {(isAccepted || isNegotiating) && onOpenChat && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            onOpenChat(offer);
                          }}
                          className="h-8.5 px-4 rounded-xl gap-2 relative shrink-0 font-bold shadow-sm"
                        >
                          <MessageCircle size={14} />
                          محادثة
                          {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] bg-destructive text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-background animate-bounce">
                              {unreadCount > 9 ? "9+" : unreadCount}
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
        </>
      )}

      {children && (
        <div className="mt-4 pt-4 border-t border-border/20 mb-4">
          {children}
        </div>
      )}
    </div>
  );
};
