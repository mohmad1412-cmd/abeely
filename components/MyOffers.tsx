import React, { useState, useRef, useMemo, useEffect } from "react";
import { Offer, Request } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  MapPin,
  Calendar,
  Archive,
  MessageCircle,
  ArrowUpDown,
  Clock,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FloatingFilterIsland } from "./ui/FloatingFilterIsland";

type OfferFilter = "all" | "accepted" | "pending" | "completed";
type SortOrder = "updatedAt" | "createdAt";

interface MyOffersProps {
  offers: Offer[];
  archivedOffers?: Offer[];
  allRequests: Request[];
  onSelectRequest: (req: Request) => void;
  onSelectOffer?: (offer: Offer) => void;
  onArchiveOffer?: (offerId: string) => void;
  onUnarchiveOffer?: (offerId: string) => void;
  onOpenWhatsApp?: (phoneNumber: string, offer: Offer) => void;
  onOpenChat?: (requestId: string, offer: Offer) => void;
  userId?: string;
  viewedRequestIds?: Set<string>;
  // Profile dropdown props
  user?: any;
  isGuest?: boolean;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  onSignOut?: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  onOpenLanguagePopup?: () => void;
  // Create Request navigation
  onCreateRequest?: () => void;
  // Is this page currently active
  isActive?: boolean;
}

export const MyOffers: React.FC<MyOffersProps> = ({
  offers,
  archivedOffers = [],
  allRequests,
  onSelectRequest,
  onSelectOffer,
  onArchiveOffer,
  onUnarchiveOffer,
  onOpenWhatsApp,
  onOpenChat,
  userId,
  viewedRequestIds = new Set(),
  user,
  isGuest = false,
  onNavigateToProfile,
  onNavigateToSettings,
  onSignOut,
  isDarkMode = false,
  toggleTheme,
  onOpenLanguagePopup,
  onCreateRequest,
  isActive = true,
}) => {
  // Header compression state - for smooth scroll animations
  const [isHeaderCompressed, setIsHeaderCompressed] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Filter & Sort States
  const [offerFilter, setOfferFilter] = useState<OfferFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("createdAt");
  const [hideRejected, setHideRejected] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Scroll Listener for header compression - same logic as Marketplace
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollDelta = scrollTop - lastScrollY.current;
      
      if (scrollTop < 50) {
        // Always show when near top
        setIsHeaderCompressed(false);
      } else if (scrollDelta > 10) {
        // Scrolling down - compress header
        setIsHeaderCompressed(true);
      } else if (scrollDelta < -10) {
        // Scrolling up - expand header
        setIsHeaderCompressed(false);
      }
      lastScrollY.current = scrollTop;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Counts
  const counts = useMemo(() => {
    const allOffers = [...offers, ...archivedOffers];
    return {
      all: allOffers.length,
      pending: offers.filter(offer => offer.status === "pending" || offer.status === "negotiating").length,
      accepted: offers.filter(offer => offer.status === "accepted").length,
      completed: allOffers.filter(offer => offer.status === "archived").length
    };
  }, [offers, archivedOffers]);

  // Filtered & Sorted Offers
  const filteredOffers = useMemo(() => {
    const allOffers = [...offers, ...archivedOffers];
    let result: Offer[] = [];
    
    if (offerFilter === "all") {
      result = allOffers;
      if (hideRejected) {
        result = result.filter(offer => offer.status !== "rejected");
      }
    } else if (offerFilter === "pending") {
      result = offers.filter(offer => offer.status === "pending" || offer.status === "negotiating");
    } else if (offerFilter === "accepted") {
      result = offers.filter(offer => offer.status === "accepted");
    } else {
      result = allOffers.filter(offer => offer.status === "archived");
    }

    // Sort
    return result.sort((a, b) => {
      if (sortOrder === "updatedAt") {
        const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bDate - aDate;
      } else {
        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
        return bDate - aDate;
      }
    });
  }, [offers, archivedOffers, offerFilter, sortOrder, hideRejected]);

  // Filter configurations for FloatingFilterIsland
  const filterConfigs = useMemo(() => [
    // Removed sortOrder filter - hiding "تاريخ التقديم" and "تاريخ الإنشاء" options
    {
      id: "offerFilter",
      icon: <Briefcase size={14} />,
      options: [
        { value: "all", label: "كل عروضي", count: counts.all },
        { value: "pending", label: "عروضي قيد الانتظار", count: counts.pending },
        { value: "accepted", label: "عروضي المقبولة", count: counts.accepted },
        { value: "completed", label: "عروضي المكتملة والمؤرشفة", count: counts.completed },
      ],
      value: offerFilter,
      onChange: (value: string) => setOfferFilter(value as OfferFilter),
      getLabel: () => {
        switch (offerFilter) {
          case "all": return "كل عروضي";
          case "pending": return "عروضي قيد الانتظار";
          case "accepted": return "عروضي المقبولة";
          case "completed": return "عروضي المكتملة والمؤرشفة";
        }
      },
      showCount: true,
    },
  ], [offerFilter, counts]);

  const getContactStatus = (offer: Offer) => {
    if (offer.status === "accepted") {
      return { text: "عرضك مقبول، ابدأ التواصل", color: "bg-primary/15 text-primary", icon: "✅" };
    } else if (offer.status === "negotiating") {
      return { text: "صاحب الطلب بدأ التفاوض معك", color: "bg-primary/15 text-primary", icon: "💬" };
    }
    if (offer.isNegotiable) {
      return { text: "انتظر قبول الطلب أو بدء التفاوض", color: "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400", icon: "⏳" };
    }
    return { text: "انتظر قبول الطلب", color: "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400", icon: "⏳" };
  };

  return (
    <div 
      ref={scrollContainerRef}
      className="h-full overflow-x-hidden container mx-auto max-w-6xl relative no-scrollbar overflow-y-auto"
    >
      {/* Sticky Header Wrapper - Unified with main header - same structure as Marketplace */}
      <div 
        ref={headerRef}
        className="sticky top-0 z-[60] overflow-visible"
      >
        {/* طبقة متدرجة خلف عناصر الهيدر - تعزل الكروت */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: '-50px',
            height: 'calc(100% + 100px)',
            background: `linear-gradient(to bottom,
              hsl(var(--background)) 0%,
              hsl(var(--background)) 60%,
              hsl(var(--background) / 0.8) 75%,
              hsl(var(--background) / 0) 100%
            )`,
            zIndex: -1,
          }}
        />
        {/* Container for header and filter island - fixed compact size */}
        <div 
          className="flex flex-col overflow-visible origin-top"
          style={{
            transform: 'scale(0.92) translateY(4px)',
          }}
        >
          {/* Filter Island - inside scaled container */}
          <FloatingFilterIsland 
            filters={filterConfigs}
            scrollContainerRef={scrollContainerRef}
            isActive={isActive}
          />
        </div>
      </div>


      {/* Content */}
      <div className="px-4 pb-24">
        <div key={offerFilter} className="grid grid-cols-1 gap-6 min-h-[100px] pt-2">
          {filteredOffers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center min-h-[50vh]">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
                {offerFilter === "all" ? (
                  <Briefcase className="text-muted-foreground" size={24} />
                ) : (
                  <Search className="text-muted-foreground" size={24} />
                )}
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {offerFilter === "all" 
                  ? "لا توجد عروض" 
                  : offerFilter === "pending"
                  ? "لا توجد عروض قيد الانتظار"
                  : offerFilter === "accepted"
                  ? "لا توجد عروض مقبولة"
                  : "لا توجد عروض مكتملة"}
              </h3>
              <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed">
                {offerFilter === "all"
                  ? "لم تقم بتقديم أي عروض بعد. تصفح الطلبات المتاحة وقدم عروضك للعملاء."
                  : offerFilter === "pending"
                  ? "لا توجد عروض قيد الانتظار حالياً. العروض التي تنتظر قبول صاحب الطلب ستظهر هنا."
                  : offerFilter === "accepted"
                  ? "لا توجد عروض مقبولة بعد. عندما يقبل عميل أحد عروضك، سيظهر هنا ويمكنك البدء بالتواصل."
                  : "لا توجد عروض مكتملة أو مؤرشفة. العروض المكتملة أو المؤرشفة ستظهر هنا."}
              </p>
            </div>
          )}
          {filteredOffers.map((offer, index) => {
            const relatedReq = allRequests.find((r) => r.id === offer.requestId);
            const contactStatus = getContactStatus(offer);
            const requestNumber = relatedReq?.requestNumber || relatedReq?.id?.slice(-4).toUpperCase() || '';
            const shouldShowName = offer.status === 'accepted' && relatedReq?.showAuthorName !== false && relatedReq?.authorName;

            return (
              <motion.div
                key={offer.id}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => {
                  if (onSelectOffer) {
                    onSelectOffer(offer);
                  } else if (relatedReq) {
                    onSelectRequest(relatedReq);
                  }
                }}
                className="bg-card border border-border rounded-2xl p-4 pt-5 transition-colors cursor-pointer relative shadow-sm group text-right"
              >
                <span className="absolute -top-3 right-4 bg-card px-2 py-0.5 text-[11px] font-bold text-primary rounded-full border border-border">
                  عرضي
                </span>
                
                <div className="flex items-start justify-between mb-2">
                  <span className="font-bold text-base truncate text-primary max-w-[70%]">
                    {offer.title}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        offer.status === "pending"
                          ? "bg-orange-100 text-orange-700"
                          : offer.status === "accepted"
                          ? "bg-primary/15 text-primary"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {offer.status === "pending"
                        ? "انتظار"
                        : offer.status === "accepted"
                        ? "مقبول"
                        : "تفاوض"}
                    </span>
                    {onArchiveOffer && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchiveOffer(offer.id);
                        }}
                        className="p-1 hover:bg-secondary/80 rounded transition-colors text-muted-foreground hover:text-foreground"
                        title="أرشفة العرض"
                      >
                        <Archive size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 flex-wrap">
                  {offer.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {offer.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {format(offer.createdAt, "dd MMM", { locale: ar })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm mb-2 flex-wrap">
                  <span className="text-muted-foreground">سعر عرضي:</span>
                  <span className="font-bold text-foreground">{offer.price} ر.س</span>
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                    offer.isNegotiable 
                      ? "bg-primary/10 text-primary" 
                      : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                  }`}>
                    {offer.isNegotiable ? "قابل للتفاوض" : "غير قابل للتفاوض"}
                  </span>
                </div>

                {relatedReq && (
                  <div className="mt-5 p-2.5 pt-3 rounded-lg bg-secondary/50 border border-border/50 space-y-1.5 relative">
                    <span className="absolute -top-2.5 right-3 bg-card px-2 text-[11px] font-bold text-muted-foreground">
                      {shouldShowName 
                        ? `طلب رقم (${requestNumber}) من ${relatedReq.authorName}`
                        : `طلب (${requestNumber})`
                      }
                    </span>

                    <div className="flex items-center gap-1 text-sm text-foreground">
                      <span className="font-bold truncate max-w-[180px]">
                        {relatedReq.title}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {relatedReq.location && (
                        <span className="flex items-center gap-0.5">
                          <MapPin size={12} />
                          {relatedReq.location}
                        </span>
                      )}
                      {relatedReq.budgetMin && relatedReq.budgetMax && (
                        <span className="flex items-center gap-0.5">
                          💰 {relatedReq.budgetMin}-{relatedReq.budgetMax} ر.س
                        </span>
                      )}
                      {relatedReq.deliveryTimeFrom && (
                        <span className="flex items-center gap-0.5">
                          ⏰ {relatedReq.deliveryTimeFrom}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      {offer.status === 'pending' && (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground">التواصل:</span>
                          <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${contactStatus.color}`}>
                            {contactStatus.icon} {contactStatus.text}
                          </span>
                        </div>
                      )}
                      {(offer.status === 'accepted' || offer.status === 'negotiating') && (
                        <div className="flex items-center gap-1.5 w-full justify-end">
                          {(relatedReq.isCreatedViaWhatsApp || relatedReq.contactMethod === 'whatsapp' || relatedReq.contactMethod === 'both') && relatedReq.whatsappNumber && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenWhatsApp && relatedReq.whatsappNumber) {
                                  onOpenWhatsApp(relatedReq.whatsappNumber, offer);
                                } else {
                                  window.open(`https://wa.me/${relatedReq.whatsappNumber}`, '_blank');
                                }
                              }}
                              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-primary hover:bg-primary/90 active:scale-95 text-white transition-all shadow-sm"
                              title="تواصل عبر واتساب"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                              </svg>
                              واتساب
                            </button>
                          )}
                          {!relatedReq.isCreatedViaWhatsApp && (relatedReq.contactMethod === 'chat' || relatedReq.contactMethod === 'both' || !relatedReq.contactMethod) && onOpenChat && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenChat(relatedReq.id, offer);
                              }}
                              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-primary hover:bg-primary/90 active:scale-95 active:bg-primary/80 text-primary-foreground transition-all shadow-sm"
                              title="فتح المحادثة"
                            >
                              <MessageCircle size={12} />
                              محادثة
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

