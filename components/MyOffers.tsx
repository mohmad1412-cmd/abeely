import React, { useState, useRef, useMemo } from "react";
import { Offer, Request } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Briefcase, 
  ChevronDown,
  ArrowUpDown,
  Clock,
  Calendar,
  CheckCircle
} from "lucide-react";
import { ServiceCard } from "./ServiceCard";
import { ViewModeToolbar, ViewMode } from "./ui/ViewModeToolbar";
import { TallCardView } from "./ui/TallCardView";
import { TextCardView } from "./ui/TextCardView";

type OfferFilter = "all" | "accepted" | "pending" | "completed";
type SortOrder = "updatedAt" | "createdAt";

interface MyOffersProps {
  offers: Offer[];
  archivedOffers?: Offer[];
  allRequests: Request[];
  onSelectRequest: (req: Request) => void;
  userId?: string;
  viewedRequestIds?: Set<string>;
}

export const MyOffers: React.FC<MyOffersProps> = ({
  offers,
  archivedOffers = [],
  allRequests,
  onSelectRequest,
  userId,
  viewedRequestIds = new Set(),
}) => {
  const [displayMode, setDisplayMode] = useState<ViewMode>("grid");
  const [touchHoveredCardId, setTouchHoveredCardId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Filter & Sort States
  const [offerFilter, setOfferFilter] = useState<OfferFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("createdAt");
  const [hideRejected, setHideRejected] = useState(true);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node) && isFilterDropdownOpen) {
        setIsFilterDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node) && isSortDropdownOpen) {
        setIsSortDropdownOpen(false);
      }
    };
    if (isFilterDropdownOpen || isSortDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isFilterDropdownOpen, isSortDropdownOpen]);

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

  const getFilterLabel = () => {
    switch (offerFilter) {
      case "all": return "كل عروضي";
      case "pending": return "عروضي قيد الانتظار";
      case "accepted": return "عروضي المقبولة";
      case "completed": return "المكتملة والمؤرشفة";
    }
  };

  const getSortLabel = () => {
    return sortOrder === "updatedAt" ? "آخر تحديث" : "وقت الإنشاء";
  };

  // تحويل العروض إلى طلبات للعرض
  const requestsFromOffers = useMemo(() => {
    return filteredOffers
      .map((offer) => {
        const relatedRequest = allRequests.find((r) => r.id === offer.requestId);
        return relatedRequest;
      })
      .filter((req): req is Request => req !== undefined);
  }, [filteredOffers, allRequests]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Filters Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border space-y-3">
        {/* Filter & Sort Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Dropdown */}
          <div className="relative flex-1 min-w-[140px]" ref={filterDropdownRef}>
            <button 
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                setIsFilterDropdownOpen(!isFilterDropdownOpen);
                setIsSortDropdownOpen(false);
              }} 
              className={`w-full text-right flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                isFilterDropdownOpen 
                  ? "bg-primary/10 border-primary text-primary" 
                  : "bg-secondary/50 border-border text-foreground hover:bg-secondary"
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-primary" />
                <span className="text-sm font-bold">{getFilterLabel()}</span>
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold bg-primary text-white">
                  {offerFilter === "pending" ? counts.pending : offerFilter === "accepted" ? counts.accepted : offerFilter === "all" ? counts.all : counts.completed}
                </span>
              </div>
              <motion.div 
                animate={{ rotate: isFilterDropdownOpen ? 180 : 0 }} 
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <ChevronDown size={18} className="text-muted-foreground" />
              </motion.div>
            </button>
            
            <AnimatePresence>
              {isFilterDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  {[
                    { value: "all" as OfferFilter, label: "كل عروضي", count: counts.all },
                    { value: "pending" as OfferFilter, label: "عروضي قيد الانتظار", count: counts.pending },
                    { value: "accepted" as OfferFilter, label: "عروضي المقبولة", count: counts.accepted },
                    { value: "completed" as OfferFilter, label: "المكتملة والمؤرشفة", count: counts.completed },
                  ].map((item, idx) => (
                    <motion.button 
                      key={item.value}
                      whileTap={{ scale: 0.98, backgroundColor: "rgba(30, 150, 140, 0.15)" }}
                      onClick={() => { 
                        if (navigator.vibrate) navigator.vibrate(10); 
                        setOfferFilter(item.value); 
                        setIsFilterDropdownOpen(false); 
                      }} 
                      className={`w-full text-right px-3 py-2.5 text-sm font-bold transition-colors flex items-center justify-between focus:outline-none ${
                        idx > 0 ? "border-t border-border" : ""
                      } ${offerFilter === item.value ? "bg-primary/10 text-primary" : "hover:bg-secondary/50"}`}
                    >
                      <span>{item.label}</span>
                      <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold ${
                        offerFilter === item.value ? "bg-primary text-white" : "bg-primary/10 text-primary"
                      }`}>
                        {item.count}
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sort Dropdown */}
          <div className="relative min-w-[130px]" ref={sortDropdownRef}>
            <button 
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                setIsSortDropdownOpen(!isSortDropdownOpen);
                setIsFilterDropdownOpen(false);
              }} 
              className={`w-full text-right flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                isSortDropdownOpen 
                  ? "bg-primary/10 border-primary text-primary" 
                  : "bg-secondary/50 border-border text-foreground hover:bg-secondary"
              }`}
            >
              <div className="flex items-center gap-2">
                <ArrowUpDown size={16} className="text-primary" />
                <span className="text-sm font-bold">{getSortLabel()}</span>
              </div>
              <motion.div 
                animate={{ rotate: isSortDropdownOpen ? 180 : 0 }} 
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <ChevronDown size={18} className="text-muted-foreground" />
              </motion.div>
            </button>
            
            <AnimatePresence>
              {isSortDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  {[
                    { value: "createdAt" as SortOrder, label: "وقت الإنشاء", icon: <Calendar size={14} /> },
                    { value: "updatedAt" as SortOrder, label: "آخر تحديث", icon: <Clock size={14} /> },
                  ].map((item, idx) => (
                    <motion.button 
                      key={item.value}
                      whileTap={{ scale: 0.98, backgroundColor: "rgba(30, 150, 140, 0.15)" }}
                      onClick={() => { 
                        if (navigator.vibrate) navigator.vibrate(10); 
                        setSortOrder(item.value); 
                        setIsSortDropdownOpen(false); 
                      }} 
                      className={`w-full text-right px-3 py-2.5 text-sm font-bold transition-colors flex items-center justify-between focus:outline-none ${
                        idx > 0 ? "border-t border-border" : ""
                      } ${sortOrder === item.value ? "bg-primary/10 text-primary" : "hover:bg-secondary/50"}`}
                    >
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      {sortOrder === item.value && (
                        <CheckCircle size={14} className="text-primary" />
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* View Mode Toolbar */}
        <ViewModeToolbar
          currentMode={displayMode}
          onChange={setDisplayMode}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20">
        <AnimatePresence mode="wait">
          {displayMode === "tall" ? (
            <motion.div
              key="tall-view"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="py-4"
            >
              <TallCardView
                requests={requestsFromOffers}
                myOffers={filteredOffers}
                receivedOffersMap={new Map()}
                userId={userId}
                viewedRequestIds={viewedRequestIds}
                onSelectRequest={onSelectRequest}
                onLoadMore={() => {}}
                hasMore={false}
                isLoadingMore={false}
              />
            </motion.div>
          ) : displayMode === "text" ? (
            <motion.div
              key="text-view"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <TextCardView
                requests={requestsFromOffers}
                myOffers={filteredOffers}
                receivedOffersMap={new Map()}
                userId={userId}
                viewedRequestIds={viewedRequestIds}
                onSelectRequest={onSelectRequest}
                onLoadMore={() => {}}
                hasMore={false}
                isLoadingMore={false}
              />
            </motion.div>
          ) : (
            <motion.div
              key="grid-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {requestsFromOffers.map((req, index) => {
                const relatedOffer = filteredOffers.find((o) => o.requestId === req.id);
                const requestAuthorId =
                  (req as any).authorId ||
                  (req as any).author_id ||
                  req.author;
                const isMyRequest = !!userId && requestAuthorId === userId;
                const isTouchHovered = touchHoveredCardId === req.id;

                return (
                  <ServiceCard
                    key={req.id}
                    req={req}
                    user={{ id: userId }}
                    isMyRequest={isMyRequest}
                    viewedRequestIds={viewedRequestIds}
                    receivedOffersMap={new Map()}
                    myOffer={relatedOffer}
                    onSelectRequest={onSelectRequest}
                    index={index}
                    isTouchHovered={isTouchHovered}
                    setTouchHoveredCardId={setTouchHoveredCardId}
                    isGuest={!userId}
                    setGuestViewedIds={() => {}}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {requestsFromOffers.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Briefcase size={24} className="text-primary" />
            </div>
            <p className="text-muted-foreground font-medium">
              لا توجد عروض
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
