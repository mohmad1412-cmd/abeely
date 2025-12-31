import React, { useState, useRef, useMemo } from "react";
import { Request, Offer } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Clock,
  Calendar,
  CheckCircle
} from "lucide-react";
import { ServiceCard } from "./ServiceCard";
import { ViewModeToolbar, ViewMode } from "./ui/ViewModeToolbar";
import { TallCardView } from "./ui/TallCardView";
import { TextCardView } from "./ui/TextCardView";

type RequestFilter = "active" | "approved" | "all" | "completed";
type SortOrder = "updatedAt" | "createdAt";

interface MyRequestsProps {
  requests: Request[];
  archivedRequests?: Request[];
  receivedOffersMap?: Map<string, Offer[]>;
  onSelectRequest: (req: Request) => void;
  userId?: string;
  viewedRequestIds?: Set<string>;
}

export const MyRequests: React.FC<MyRequestsProps> = ({
  requests,
  archivedRequests = [],
  receivedOffersMap = new Map(),
  onSelectRequest,
  userId,
  viewedRequestIds = new Set(),
}) => {
  const [displayMode, setDisplayMode] = useState<ViewMode>("grid");
  const [touchHoveredCardId, setTouchHoveredCardId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Filter & Sort States
  const [reqFilter, setReqFilter] = useState<RequestFilter>("active");
  const [sortOrder, setSortOrder] = useState<SortOrder>("createdAt");
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
    const allReqs = [...requests, ...archivedRequests];
    return {
      all: allReqs.length,
      active: requests.filter(req => req.status === "active" || (req.status as any) === "draft").length,
      approved: requests.filter(req => req.status === "assigned").length,
      completed: allReqs.filter(req => req.status === "completed" || req.status === "archived").length
    };
  }, [requests, archivedRequests]);

  // Filtered & Sorted Requests
  const filteredRequests = useMemo(() => {
    const allReqs = [...requests, ...archivedRequests];
    let result: Request[] = [];
    
    if (reqFilter === "all") {
      result = allReqs;
    } else if (reqFilter === "active") {
      result = requests.filter(req => req.status === "active" || (req.status as any) === "draft");
    } else if (reqFilter === "approved") {
      result = requests.filter(req => req.status === "assigned");
    } else {
      result = allReqs.filter(req => req.status === "completed" || req.status === "archived");
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
  }, [requests, archivedRequests, reqFilter, sortOrder]);

  const getFilterLabel = () => {
    switch (reqFilter) {
      case "all": return "كل طلباتي";
      case "active": return "طلباتي النشطة";
      case "approved": return "طلباتي المعتمدة";
      case "completed": return "المكتملة والمؤرشفة";
    }
  };

  const getSortLabel = () => {
    return sortOrder === "updatedAt" ? "آخر تحديث" : "وقت الإنشاء";
  };

  const getMyOffer = (requestId: string) => {
    return null;
  };

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
                <FileText size={16} className="text-primary" />
                <span className="text-sm font-bold">{getFilterLabel()}</span>
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold bg-primary text-white">
                  {reqFilter === "active" ? counts.active : reqFilter === "approved" ? counts.approved : reqFilter === "all" ? counts.all : counts.completed}
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
                    { value: "all" as RequestFilter, label: "كل طلباتي", count: counts.all },
                    { value: "active" as RequestFilter, label: "طلباتي النشطة", count: counts.active },
                    { value: "approved" as RequestFilter, label: "طلباتي المعتمدة", count: counts.approved },
                    { value: "completed" as RequestFilter, label: "المكتملة والمؤرشفة", count: counts.completed },
                  ].map((item, idx) => (
                    <motion.button 
                      key={item.value}
                      whileTap={{ scale: 0.98, backgroundColor: "rgba(30, 150, 140, 0.15)" }}
                      onClick={() => { 
                        if (navigator.vibrate) navigator.vibrate(10); 
                        setReqFilter(item.value); 
                        setIsFilterDropdownOpen(false); 
                      }} 
                      className={`w-full text-right px-3 py-2.5 text-sm font-bold transition-colors flex items-center justify-between focus:outline-none ${
                        idx > 0 ? "border-t border-border" : ""
                      } ${reqFilter === item.value ? "bg-primary/10 text-primary" : "hover:bg-secondary/50"}`}
                    >
                      <span>{item.label}</span>
                      <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold ${
                        reqFilter === item.value ? "bg-primary text-white" : "bg-primary/10 text-primary"
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
                requests={filteredRequests}
                myOffers={[]}
                receivedOffersMap={receivedOffersMap}
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
                requests={filteredRequests}
                myOffers={[]}
                receivedOffersMap={receivedOffersMap}
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
              {filteredRequests.map((req, index) => {
                const requestAuthorId =
                  (req as any).authorId ||
                  (req as any).author_id ||
                  req.author;
                const isMyRequest = !!userId && requestAuthorId === userId;
                const isTouchHovered = touchHoveredCardId === req.id;
                const myOffer = getMyOffer(req.id);

                return (
                  <ServiceCard
                    key={req.id}
                    req={req}
                    user={{ id: userId }}
                    isMyRequest={isMyRequest}
                    viewedRequestIds={viewedRequestIds}
                    receivedOffersMap={receivedOffersMap}
                    myOffer={myOffer || undefined}
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

        {filteredRequests.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText size={24} className="text-primary" />
            </div>
            <p className="text-muted-foreground font-medium">
              لا توجد طلبات
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
