import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import { Offer, Request } from "../types";
import { AVAILABLE_CATEGORIES } from "../data";
import {
  ArrowRight,
  Bell,
  CheckCircle,
  Clock,
  Compass,
  DollarSign,
  Edit,
  Filter,
  MapPin,
  MessageCircle,
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  AlertCircle,
  Plus,
  ExternalLink,
  ImageIcon,
  Lock,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { AnimatePresence, motion } from "framer-motion";

interface MarketplaceProps {
  requests: Request[];
  interestsRequests?: Request[]; // طلبات اهتماماتي فقط
  unreadInterestsCount?: number; // عدد الطلبات غير المقروءة في اهتماماتي
  myOffers: Offer[]; // Pass myOffers to check application status
  onSelectRequest: (req: Request, scrollToOffer?: boolean) => void;
  userInterests: string[];
  onUpdateInterests: (interests: string[]) => void;
  savedScrollPosition?: number;
  onScrollPositionChange?: (pos: number) => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({
  requests,
  interestsRequests = [],
  unreadInterestsCount = 0,
  myOffers,
  onSelectRequest,
  userInterests,
  onUpdateInterests,
  savedScrollPosition: externalScrollPos = 0,
  onScrollPositionChange,
}) => {
  
  const [viewMode, setViewMode] = useState<"all" | "interests">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showOfferButtonPulse, setShowOfferButtonPulse] = useState(false);

  // Monitor requests prop changes
  useEffect(() => {
  }, [requests, viewMode]);

  // Scroll state for glass header animation
  const [isScrolled, setIsScrolled] = useState(false);

  // Offer button pulse animation every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShowOfferButtonPulse(true);
      setTimeout(() => setShowOfferButtonPulse(false), 2000);
    }, 8000); // Every 8 seconds

    return () => clearInterval(interval);
  }, []);

  // Search Page State
  const [isSearchPageOpen, setIsSearchPageOpen] = useState(false);
  const [iconToggle, setIconToggle] = useState(false);
  const [searchCategories, setSearchCategories] = useState<string[]>([]); // Multi-select
  const [searchCities, setSearchCities] = useState<string[]>([]);         // Multi-select
  const [isSearchCategoriesOpen, setIsSearchCategoriesOpen] = useState(true); // Accordion State
  const [isSearchCitiesOpen, setIsSearchCitiesOpen] = useState(true);         // Accordion State
  const [searchBudgetMin, setSearchBudgetMin] = useState<string>("");
  const [searchBudgetMax, setSearchBudgetMax] = useState<string>("");

  // Interest View States
  const [isManageInterestsOpen, setIsManageInterestsOpen] = useState(false);
  const [notifyOnInterest, setNotifyOnInterest] = useState(true);
  const [selectedCities, setSelectedCities] = useState<string[]>(["الرياض"]);

  // Temp state for Modal
  const [tempInterests, setTempInterests] = useState<string[]>(userInterests);
  const [tempCities, setTempCities] = useState<string[]>(selectedCities);
  const [tempCitySearch, setTempCitySearch] = useState("");
  const [tempCatSearch, setTempCatSearch] = useState("");
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [isCitiesExpanded, setIsCitiesExpanded] = useState(false);
  const [tempRadarWords, setTempRadarWords] = useState<string[]>([]);
  const [isRadarWordsExpanded, setIsRadarWordsExpanded] = useState(false);
  const [newRadarWord, setNewRadarWord] = useState("");

  const CITIES = [
    "الرياض", "جدة", "الدمام", "مكة", "المدينة", "الخبر", "أبها", "الطائف", "تبوك", "القصيم",
    "بريدة", "خميس مشيط", "الهفوف", "المبرز", "حفر الباطن", "حائل", "نجران", "الجبيل", "القطيف", "ينبع",
    "الخرج", "الثقبة", "ينبع البحر", "عرعر", "الحوية", "عنيزة", "سكاكا", "جيزان", "القريات", "الظهران",
    "الباحة", "الزلفي", "الرس", "وادي الدواسر", "بيشة", "القنفذة", "رابغ", "عفيف", "الليث"
  ];

  const marketplaceScrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollPosRef = useRef<number>(0);
  
  // Scroll Listener with debounced position save
  useEffect(() => {
    const container = marketplaceScrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      setIsScrolled(scrollTop > 20);
      lastScrollPosRef.current = scrollTop;
      
      // Debounce the parent notification to avoid jitter
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        if (onScrollPositionChange) {
          onScrollPositionChange(lastScrollPosRef.current);
        }
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [onScrollPositionChange]);

  // Track if initial scroll restoration happened
  const initialScrollRestored = useRef(false);
  
  // Restore scroll position IMMEDIATELY before browser paint using useLayoutEffect
  useLayoutEffect(() => {
    const container = marketplaceScrollRef.current;
    if (container && externalScrollPos > 0 && !initialScrollRestored.current) {
      initialScrollRestored.current = true;
      // Set scroll immediately - no delay
      container.scrollTop = externalScrollPos;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Save scroll position when component unmounts
  useEffect(() => {
    return () => {
      // Save final scroll position before unmount
      if (onScrollPositionChange && lastScrollPosRef.current > 0) {
        onScrollPositionChange(lastScrollPosRef.current);
      }
      initialScrollRestored.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Continuous icon toggle animation
  useEffect(() => {
    const interval = setInterval(() => {
      setIconToggle(prev => !prev);
    }, 2000); // Toggle every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const handleManageInterests = () => {
    setTempInterests(userInterests);
    setTempCities(selectedCities);
    setTempCitySearch("");
    setTempCatSearch("");
    setTempRadarWords([]); // Initialize radar words
    setIsManageInterestsOpen(true);
  };

  const handleSaveInterests = () => {
    onUpdateInterests(tempInterests);
    setSelectedCities(tempCities);
    setIsManageInterestsOpen(false);
  };

  const toggleInterest = (id: string) => {
    setTempInterests(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const toggleCity = (city: string) => {
    setTempCities(prev => 
      prev.includes(city)
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  const filteredCities = CITIES.filter(city => 
    city.toLowerCase().includes(tempCitySearch.toLowerCase())
  );

  const filteredCategories = AVAILABLE_CATEGORIES.filter(cat =>
    cat.label.toLowerCase().includes(tempCatSearch.toLowerCase())
  );

  const addRadarWord = () => {
    const trimmedWord = newRadarWord.trim();
    if (trimmedWord && !tempRadarWords.includes(trimmedWord)) {
      setTempRadarWords([...tempRadarWords, trimmedWord]);
      setNewRadarWord("");
    }
  };

  const removeRadarWord = (word: string) => {
    setTempRadarWords(tempRadarWords.filter(w => w !== word));
  };

  // Helper to get my offer on this request
  const getMyOffer = (reqId: string) => {
    return myOffers.find((o) => o.requestId === reqId);
  };

  // Check if any filter is active
  const hasActiveFilters = searchTerm || searchCategories.length > 0 || searchCities.length > 0 || searchBudgetMin || searchBudgetMax;

  // Reset all search filters
  const handleResetSearch = () => {
    setSearchTerm("");
    setSearchCategories([]);
    setSearchCities([]);
    setSearchBudgetMin("");
    setSearchBudgetMax("");
  };

  // Toggle Category Selection
  const toggleSearchCategory = (id: string) => {
    if (searchCategories.includes(id)) {
      setSearchCategories(searchCategories.filter(c => c !== id));
    } else {
      setSearchCategories([...searchCategories, id]);
    }
  };

  // Toggle City Selection
  const toggleSearchCity = (city: string) => {
    if (searchCities.includes(city)) {
      setSearchCities(searchCities.filter(c => c !== city));
    } else {
      setSearchCities([...searchCities, city]);
    }
  };

  // Apply search and close modal
  const handleApplySearch = () => {
    setIsSearchPageOpen(false);
  };

  // Use interestsRequests when in interests mode, otherwise use all requests
  const requestsToFilter = viewMode === "interests" ? interestsRequests : requests;

  const filteredRequests = requestsToFilter.filter((req) => {
    // Text search
    if (searchTerm) {
      const matchesSearch = req.title.includes(searchTerm) || req.description.includes(searchTerm);
      if (!matchesSearch) return false;
    }

    // Category filter (Multi-select)
    if (searchCategories.length > 0) {
      // If request has categories, check if any match selected categories
      if (!req.categories?.some(cat => searchCategories.includes(cat))) return false;
    }

    // City filter (Multi-select)
    if (searchCities.length > 0) {
      if (!searchCities.includes(req.location || "")) return false;
    }

    // Budget filter
    if (searchBudgetMin) {
      if (Number(req.budgetMax || 0) < parseInt(searchBudgetMin)) return false;
    }
    if (searchBudgetMax) {
      if (Number(req.budgetMin || 0) > parseInt(searchBudgetMax)) return false;
    }

    // In interests mode, all requests in interestsRequests are already filtered
    // So we just return true (no additional filtering needed)
    if (viewMode === "interests") {
      return true;
    }

    return true;
  });

  return (
    <div 
      ref={marketplaceScrollRef}
      className="h-full overflow-y-auto overflow-x-hidden container mx-auto max-w-6xl relative no-scrollbar"
    >
      {/* Sticky Header Wrapper - Consistent with RequestDetail Glass Style */}
      {/* Sticky Header Wrapper - Consistent with RequestDetail Glass Style */}
      <div 
        className={`sticky top-0 z-20 transition-all duration-300 px-4 ${
          isScrolled 
            ? "bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm" 
            : "bg-transparent"
        }`}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between py-3 gap-2">
            {/* Left Side - Tabs or Search Term */}
            {searchTerm ? (
              <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-xl border border-border shadow-md h-11">
                <span className="text-sm font-bold text-primary">{searchTerm}</span>
                <button
                  onClick={handleResetSearch}
                  className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  title="إلغاء البحث"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
             ) : (
               <div className="flex items-center gap-1 bg-card p-1 rounded-2xl border border-border shadow-md h-11">
                 <button
                   onClick={() => {
                     // If filters are active, clear them when clicking "الكل"
                     if (searchCategories.length > 0 || searchCities.length > 0 || searchBudgetMin || searchBudgetMax) {
                       handleResetSearch();
                     }
                     setViewMode("all");
                   }}
                   className={`h-full px-5 font-bold transition-all rounded-xl text-xs sm:text-sm flex items-center justify-center ${
                     viewMode === "all" && !hasActiveFilters
                       ? "bg-primary text-white shadow-md"
                       : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                   }`}
                 >
                   الكل
                 </button>
                 <button
                   onClick={() => {
                     // If filters are active, clear them when clicking "اهتماماتي"
                     if (searchCategories.length > 0 || searchCities.length > 0 || searchBudgetMin || searchBudgetMax) {
                       handleResetSearch();
                     }
                     setViewMode("interests");
                   }}
                   className={`h-full px-5 font-bold transition-all rounded-xl flex items-center gap-2 text-xs sm:text-sm justify-center ${
                     viewMode === "interests" && !hasActiveFilters
                       ? "bg-primary text-white shadow-md"
                       : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                   }`}
                 >
                   اهتماماتي
                   {unreadInterestsCount > 0 && (
                     <span className={`min-w-[18px] h-5 px-1 rounded-full text-[10px] flex items-center justify-center font-bold ${
                       viewMode === "interests" && !hasActiveFilters ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                     }`}>
                       {unreadInterestsCount}
                     </span>
                   )}
                   {unreadInterestsCount === 0 && interestsRequests.length > 0 && (
                     <span className={`min-w-[18px] h-5 px-1 rounded-full text-[10px] flex items-center justify-center font-bold ${
                       viewMode === "interests" && !hasActiveFilters ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                     }`}>
                       {interestsRequests.length}
                     </span>
                   )}
                 </button>
               </div>
             )}

          {/* Right Side - Search Icon with Sliding Animation */}
          <button
            onClick={() => setIsSearchPageOpen(true)}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-card border border-border text-muted-foreground hover:text-primary transition-all active:scale-95 shadow-md overflow-hidden"
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <motion.div
                animate={{ 
                  x: iconToggle ? 0 : -20,
                  opacity: iconToggle ? 1 : 0
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 25,
                  duration: 0.4
                }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Filter size={18} strokeWidth={2} />
              </motion.div>
              <motion.div
                animate={{ 
                  x: iconToggle ? 20 : 0,
                  opacity: iconToggle ? 0 : 1
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 25,
                  duration: 0.4
                }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Search size={18} strokeWidth={2} />
              </motion.div>
            </div>
            {hasActiveFilters && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse z-10" />
            )}
          </button>
          </div>

          {/* Active Filters Display - Second Row */}
          {(searchCategories.length > 0 || searchCities.length > 0 || searchBudgetMin || searchBudgetMax) && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <div className="flex items-center gap-1.5">
                {searchCategories.map(catId => {
                  const cat = AVAILABLE_CATEGORIES.find(c => c.id === catId);
                  return cat ? (
                    <motion.div
                      key={catId}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 text-primary border border-primary/20 text-xs font-medium shrink-0 hover:bg-primary/10 transition-colors"
                    >
                      <span>{cat.label}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSearchCategory(catId);
                        }}
                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors -mr-0.5"
                      >
                        <X size={11} strokeWidth={2.5} />
                      </button>
                    </motion.div>
                  ) : null;
                })}
                {searchCities.map(city => (
                  <motion.div
                    key={city}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 text-primary border border-primary/20 text-xs font-medium shrink-0 hover:bg-primary/10 transition-colors"
                  >
                    <MapPin size={11} strokeWidth={2} />
                    <span>{city}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSearchCity(city);
                      }}
                      className="hover:bg-primary/20 rounded-full p-0.5 transition-colors -mr-0.5"
                    >
                      <X size={11} strokeWidth={2.5} />
                    </button>
                  </motion.div>
                ))}
                {(searchBudgetMin || searchBudgetMax) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 text-primary border border-primary/20 text-xs font-medium shrink-0 hover:bg-primary/10 transition-colors"
                  >
                    <DollarSign size={11} strokeWidth={2} />
                    <span>{searchBudgetMin && searchBudgetMax ? `${searchBudgetMin} - ${searchBudgetMax}` : searchBudgetMin ? `من ${searchBudgetMin}` : `إلى ${searchBudgetMax}`}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchBudgetMin("");
                        setSearchBudgetMax("");
                      }}
                      className="hover:bg-primary/20 rounded-full p-0.5 transition-colors -mr-0.5"
                    >
                      <X size={11} strokeWidth={2.5} />
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search Page Full Screen Modal */}
      <AnimatePresence>
        {isSearchPageOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="h-full flex flex-col"
            >
              {/* Search Header */}
              <div className="shrink-0 p-4 border-b border-border bg-card/80 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsSearchPageOpen(false)}
                    className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-all"
                  >
                    <ArrowRight size={22} strokeWidth={2} />
                  </button>
                  <div className="flex-1 relative">
                    <Search
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none"
                      size={20}
                      strokeWidth={2}
                    />
                    <input
                      type="text"
                      placeholder="ابحث عن طلب..."
                      className="w-full pr-10 pl-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-none text-base"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      autoFocus
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Filters Section */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
                
                {/* Category Filter - Collapsible */}
                <div className="border-b border-border pb-4">
                  <button 
                    onClick={() => setIsSearchCategoriesOpen(!isSearchCategoriesOpen)}
                    className="flex items-center justify-between w-full mb-3 group"
                  >
                    <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                      <Filter size={18} strokeWidth={2.5} className="text-primary" />
                      التصنيف
                    </h3>
                    <ChevronDown size={18} className={`text-muted-foreground transition-transform duration-300 ${isSearchCategoriesOpen ? "rotate-180" : ""}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isSearchCategoriesOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            onClick={() => setSearchCategories([])}
                            className={`px-4 py-2 rounded-full text-sm border transition-all ${
                              searchCategories.length === 0
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary text-foreground border-transparent hover:bg-secondary/80"
                            }`}
                          >
                            الكل
                          </button>
                          {AVAILABLE_CATEGORIES.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => toggleSearchCategory(cat.id)}
                              className={`px-4 py-2 rounded-full text-sm border transition-all flex items-center gap-2 ${
                                searchCategories.includes(cat.id)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-secondary text-foreground border-transparent hover:bg-secondary/80"
                              }`}
                            >
                              <span>{cat.emoji}</span>
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* City Filter - Collapsible */}
                <div className="border-b border-border pb-4">
                  <button 
                    onClick={() => setIsSearchCitiesOpen(!isSearchCitiesOpen)}
                    className="flex items-center justify-between w-full mb-3 group"
                  >
                    <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                      <MapPin size={18} strokeWidth={2.5} className="text-red-500" />
                      المدينة
                    </h3>
                    <ChevronDown size={18} className={`text-muted-foreground transition-transform duration-300 ${isSearchCitiesOpen ? "rotate-180" : ""}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isSearchCitiesOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                         <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            onClick={() => setSearchCities([])}
                            className={`px-4 py-2 rounded-full text-sm border transition-all ${
                              searchCities.length === 0
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary text-foreground border-transparent hover:bg-secondary/80"
                            }`}
                          >
                            الكل
                          </button>
                          {CITIES.map((city) => (
                            <button
                              key={city}
                              onClick={() => toggleSearchCity(city)}
                              className={`px-4 py-2 rounded-full text-sm border transition-all ${
                                searchCities.includes(city)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-secondary text-foreground border-transparent hover:bg-secondary/80"
                              }`}
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Budget Filter */}
                <div>
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-foreground">
                    <DollarSign size={18} strokeWidth={2.5} className="text-green-600" />
                    الميزانية
                  </h3>
                  
                  {/* Custom Range Inputs */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        placeholder="أقل مبلغ"
                        className={`w-full px-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm text-center ${
                           searchBudgetMin && searchBudgetMax && Number(searchBudgetMin) > Number(searchBudgetMax) ? "border-red-500 focus:ring-red-500" : "border-border"
                        }`}
                        value={searchBudgetMin}
                        onChange={(e) => setSearchBudgetMin(e.target.value)}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">ر.س</span>
                    </div>
                    <span className="text-muted-foreground">-</span>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        placeholder="أعلى مبلغ"
                        className={`w-full px-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm text-center ${
                           searchBudgetMin && searchBudgetMax && Number(searchBudgetMin) > Number(searchBudgetMax) ? "border-red-500 focus:ring-red-500" : "border-border"
                        }`}
                        value={searchBudgetMax}
                        onChange={(e) => setSearchBudgetMax(e.target.value)}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">ر.س</span>
                    </div>
                  </div>
                  
                  {/* Validation Message */}
                  {searchBudgetMin && searchBudgetMax && Number(searchBudgetMin) > Number(searchBudgetMax) && (
                    <div className="flex items-center gap-2 mt-2 text-red-500 text-xs animate-in slide-in-from-top-1 fade-in">
                      <AlertCircle size={14} />
                      <span className="font-medium">المبلغ الأدنى يجب أن يكون أقل من الأعلى</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Bottom Area (Active Filters + Action Button) */}
              <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-xl z-20 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
                
                {/* Active Filters Summary - Sticky */}
                {hasActiveFilters && (
                  <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border/50">
                     <div className="flex flex-wrap gap-2 max-h-[60px] overflow-y-auto no-scrollbar">
                      {searchTerm && (
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 whitespace-nowrap">
                          {searchTerm}
                          <X size={10} className="cursor-pointer" onClick={() => setSearchTerm("")} />
                        </span>
                      )}
                      {searchCategories.map(catId => (
                        <span key={catId} className="bg-primary/10 text-primary px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 whitespace-nowrap">
                          {AVAILABLE_CATEGORIES.find(c => c.id === catId)?.label}
                          <X size={10} className="cursor-pointer" onClick={() => toggleSearchCategory(catId)} />
                        </span>
                      ))}
                      {searchCities.map(city => (
                        <span key={city} className="bg-primary/10 text-primary px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 whitespace-nowrap">
                          {city}
                          <X size={10} className="cursor-pointer" onClick={() => toggleSearchCity(city)} />
                        </span>
                      ))}
                      {(searchBudgetMin || searchBudgetMax) && (
                        <span className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 whitespace-nowrap ${
                           searchBudgetMin && searchBudgetMax && Number(searchBudgetMin) > Number(searchBudgetMax)
                             ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200"
                             : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200"
                        }`}>
                          {searchBudgetMin && searchBudgetMax && Number(searchBudgetMin) > Number(searchBudgetMax) && <AlertCircle size={10} />}
                          {searchBudgetMin || "0"} - {searchBudgetMax || "∞"}
                          <X size={10} className="cursor-pointer" onClick={() => { setSearchBudgetMin(""); setSearchBudgetMax(""); }} />
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleResetSearch}
                      className="text-xs text-red-500 hover:text-red-600 font-bold px-2 shrink-0"
                    >
                      مسح
                    </button>
                  </div>
                )}

                {/* Main Action Button */}
                <div className="p-4">
                  <Button
                    className="w-full h-12 text-base font-bold shadow-lg"
                    onClick={handleApplySearch}
                  >
                    عرض النتائج ({filteredRequests.length})
                  </Button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4">
        {/* Sub-Filters */}
        <div className="mb-6 animate-in fade-in slide-in-from-top-1">

          {/* Interests Panel - Clean Redesign */}
          {viewMode === "interests" && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Header */}
              <div className="p-4 border-b border-border/50 flex items-center justify-between bg-secondary/10">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">إدارة اهتماماتي</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManageInterests}
                  className="gap-2 h-9 rounded-xl border-primary/20 hover:bg-primary/5 text-primary text-xs font-bold"
                >
                  <Edit size={14} />
                  تعديل
                </Button>
              </div>

              <div className="p-4 space-y-5">
                {/* Categories - Collapsible */}
                <div className="space-y-3">
                  <div 
                    onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">التصنيفات المختارة</span>
                      <span className="bg-secondary px-1.5 py-0.5 rounded-md text-[10px] text-muted-foreground">{userInterests.length}</span>
                    </div>
                    <div className={`transition-transform duration-200 ${isCategoriesExpanded ? "rotate-180" : ""}`}>
                      <ChevronDown size={14} className="text-muted-foreground group-hover:text-primary" />
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {isCategoriesExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-2 pt-1">
                          {userInterests.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">لم تحدد تصنيفات بعد</span>
                          ) : (
                            userInterests.map((int) => {
                              const cat = AVAILABLE_CATEGORIES.find((c) => c.id === int);
                              return (
                                <div
                                  key={int}
                                  className="flex items-center gap-1.5 bg-secondary/50 border border-border/50 px-3 py-1.5 rounded-full text-xs font-medium"
                                >
                                  <span>{cat?.emoji}</span>
                                  {cat?.label}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Cities - Collapsible */}
                <div className="space-y-3">
                  <div 
                    onClick={() => setIsCitiesExpanded(!isCitiesExpanded)}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">المدن المغطاة</span>
                      <span className="bg-secondary px-1.5 py-0.5 rounded-md text-[10px] text-muted-foreground">{selectedCities.length || "الكل"}</span>
                    </div>
                    <div className={`transition-transform duration-200 ${isCitiesExpanded ? "rotate-180" : ""}`}>
                      <ChevronDown size={14} className="text-muted-foreground group-hover:text-primary" />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isCitiesExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-2 pt-1">
                          {selectedCities.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">جميع المدن</span>
                          ) : (
                            selectedCities.map((city) => (
                              <div
                                key={city}
                                className="flex items-center gap-1.5 bg-primary/5 border border-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold"
                              >
                                <MapPin size={12} />
                                {city}
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Notification Toggle - Always visible for easy access */}
                <div 
                  onClick={() => setNotifyOnInterest(!notifyOnInterest)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all group cursor-pointer ${
                    notifyOnInterest 
                      ? "bg-primary/5 border-primary/10 hover:bg-primary/10" 
                      : "bg-secondary/30 border-border/50 hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      notifyOnInterest ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"
                    }`}>
                      <Bell size={20} className={notifyOnInterest ? "animate-bounce" : ""} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">التنبيهات المباشرة</span>
                      <span className="text-[10px] text-muted-foreground">
                        {notifyOnInterest ? "سنقوم بإشعارك عند وجود فرص جديدة" : "فعل التنبيهات لتصلك الطلبات فوراً"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifyOnInterest(!notifyOnInterest)}
                    className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                      notifyOnInterest ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <motion.div
                      animate={{ x: notifyOnInterest ? -28 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="w-5 h-5 bg-white rounded-full shadow-lg"
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Modal logic for Interests - Simplified like Settings */}
        {isManageInterestsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-bold">إدارة الاهتمامات</h3>
                <button
                  onClick={() => setIsManageInterestsOpen(false)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {/* Notification Toggle - Moved to top */}
                <div className="p-4 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell size={18} className="text-primary" />
                      <div>
                        <h4 className="font-bold text-sm">إشعارات الاهتمامات</h4>
                        <p className="text-xs text-muted-foreground">تنبيهات فورية للطلبات التي تهمك</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setNotifyOnInterest(!notifyOnInterest)}
                      className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                        notifyOnInterest ? "bg-primary" : "bg-gray-300"
                      }`}
                    >
                      <motion.div
                        animate={{ x: notifyOnInterest ? -28 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-5 h-5 bg-white rounded-full shadow-lg"
                      />
                    </button>
                  </div>
                </div>

                {/* Categories - Collapsible */}
                <div className="bg-secondary/50 rounded-lg border border-border overflow-hidden">
                  <div 
                    onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/70 transition-all"
                  >
                    <h4 className="font-bold text-sm">التصنيفات والمهام</h4>
                    <ChevronDown 
                      size={18} 
                      className={`text-muted-foreground transition-transform duration-200 ${isCategoriesExpanded ? "rotate-180" : ""}`} 
                    />
                  </div>
                  <AnimatePresence>
                    {isCategoriesExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border"
                      >
                        <div className="p-3 space-y-3">
                          <input
                            type="text"
                            placeholder="بحث..."
                            value={tempCatSearch}
                            onChange={(e) => setTempCatSearch(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 rounded-lg border-2 border-[#1E968C]/30 bg-background focus:border-[#178075] focus:outline-none transition-all"
                          />
                          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto no-scrollbar">
                            {filteredCategories.map((cat) => (
                              <button
                                key={cat.id}
                                onClick={() => toggleInterest(cat.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                  tempInterests.includes(cat.id)
                                    ? 'bg-primary text-white'
                                    : 'bg-background text-foreground hover:bg-secondary/80 border border-border'
                                }`}
                              >
                                {cat.emoji} {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Cities - Collapsible */}
                <div className="bg-secondary/50 rounded-lg border border-border overflow-hidden">
                  <div 
                    onClick={() => setIsCitiesExpanded(!isCitiesExpanded)}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/70 transition-all"
                  >
                    <h4 className="font-bold text-sm">المدن والمناطق</h4>
                    <ChevronDown 
                      size={18} 
                      className={`text-muted-foreground transition-transform duration-200 ${isCitiesExpanded ? "rotate-180" : ""}`} 
                    />
                  </div>
                  <AnimatePresence>
                    {isCitiesExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border"
                      >
                        <div className="p-3 space-y-3">
                          <input
                            type="text"
                            placeholder="بحث..."
                            value={tempCitySearch}
                            onChange={(e) => setTempCitySearch(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 rounded-lg border-2 border-[#1E968C]/30 bg-background focus:border-[#178075] focus:outline-none transition-all"
                          />
                          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto no-scrollbar">
                            {filteredCities.map((city) => (
                              <button
                                key={city}
                                onClick={() => toggleCity(city)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                  tempCities.includes(city)
                                    ? 'bg-primary text-white'
                                    : 'bg-background text-foreground hover:bg-secondary/80 border border-border'
                                }`}
                              >
                                {city}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Radar Words - Collapsible */}
                <div className="bg-secondary/50 rounded-lg border border-border overflow-hidden">
                  <div 
                    onClick={() => setIsRadarWordsExpanded(!isRadarWordsExpanded)}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/70 transition-all"
                  >
                    <h4 className="font-bold text-sm">رادار الكلمات</h4>
                    <ChevronDown 
                      size={18} 
                      className={`text-muted-foreground transition-transform duration-200 ${isRadarWordsExpanded ? "rotate-180" : ""}`} 
                    />
                  </div>
                  <AnimatePresence>
                    {isRadarWordsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border"
                      >
                        <div className="p-3 space-y-3">
                          <p className="text-xs text-muted-foreground">
                            إذا كان الطلب يتضمن إحدى هذه الكلمات، سيتم إشعارك
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="اكتب الكلمة..."
                              value={newRadarWord}
                              onChange={(e) => setNewRadarWord(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addRadarWord();
                                }
                              }}
                              className="flex-1 text-xs px-3 py-1.5 rounded-lg border-2 border-[#1E968C]/30 bg-background focus:border-[#178075] focus:outline-none transition-all"
                            />
                            <button
                              onClick={addRadarWord}
                              disabled={!newRadarWord.trim()}
                              className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          {tempRadarWords.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {tempRadarWords.map((word) => (
                                <div
                                  key={word}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm"
                                >
                                  <span>{word}</span>
                                  <button
                                    onClick={() => removeRadarWord(word)}
                                    className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 p-4 border-t border-border">
                <button
                  onClick={() => setIsManageInterestsOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveInterests}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium"
                >
                  حفظ وتطبيق
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Grid */}
        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.08 } }
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredRequests.map((req, index) => {
            const myOffer = getMyOffer(req.id);
            return (
              <motion.div
                layoutId={`card-${req.id}`}
                key={req.id}
                variants={{
                  hidden: { opacity: 0, y: 30, scale: 0.95 },
                  show: { 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    transition: { type: "spring", stiffness: 400, damping: 30 }
                  }
                }}
                whileHover={{ y: -8, scale: 1.02, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
                whileTap={{ scale: 0.98 }}
                className="bg-card border border-border rounded-2xl overflow-hidden transition-colors flex flex-col group cursor-pointer relative shadow-sm"
                 onClick={() => {
                   onSelectRequest(req);
                 }}
              >
                {/* Image Section */}
                {req.images && req.images.length > 0 ? (
                  <motion.div
                    layoutId={`image-${req.id}`}
                    className="h-40 w-full bg-secondary overflow-hidden relative"
                  >
                    <motion.img
                      src={req.images[0]}
                      alt={req.title}
                      className="w-full h-full object-cover"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.4 }}
                      />
                      {req.images.length > 1 && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full font-medium"
                      >
                        +{req.images.length - 1} صور
                      </motion.span>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    layoutId={`image-${req.id}`}
                    className="h-40 w-full relative overflow-hidden"
                  >
                    {/* Simple Gray Background - Empty State */}
                    <div className="absolute inset-0 bg-muted/8" />
                    
                    {/* Very Subtle Dashed Pattern - Slow Rain Animation */}
                    <motion.div 
                      className="absolute inset-0 opacity-[0.06]"
                      style={{
                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 12px, currentColor 0.5px, currentColor 12.5px)`,
                        backgroundSize: '48px 48px',
                      }}
                      animate={{
                        y: [0, 48],
                      }}
                      transition={{
                        duration: 30,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    />
                    
                    {/* Icon in Center - No Image Indicator */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="relative w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                        <ImageIcon size={24} className="text-muted-foreground/50" strokeWidth={1.5} />
                        {/* Clear Diagonal Slash */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-full h-0.5 bg-muted-foreground/60 rotate-45 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Title & Description Below Image */}
                <div className="px-5 pt-3 pb-1">
                  <h3 className="text-base font-bold text-foreground line-clamp-1">
                    {req.title}
                  </h3>
                  <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed mt-1">
                    {req.description}
                  </p>
                </div>

                <div className="px-5 pb-5 flex-1 flex flex-col relative">

                  {/* Request Info - Clean Professional Layout with Floating Labels */}
                  <div className="mb-4 mt-4">
                    {/* Location, Budget, and Delivery Time - Grid Layout */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* City */}
                      <div className="relative isolate">
                        <label className="absolute -top-2 right-1.5 px-1 bg-card z-10 text-[10px] text-primary font-bold">
                          المدينة
                        </label>
                        <div className="relative h-9 rounded-md border border-border/60 bg-background flex items-center justify-center overflow-hidden transition-all hover:border-primary/40 group">
                          <div className="w-full h-full flex items-center justify-center px-2 overflow-hidden relative">
                            <span className="text-xs font-medium text-foreground whitespace-nowrap truncate">
                              {req.location ? (() => {
                                // Parse location: "حي النرجس، الرياض" or "الرياض"
                                const locationParts = req.location.split('،').map(s => s.trim());
                                const city = locationParts.length > 1 ? locationParts[locationParts.length - 1] : locationParts[0];
                                return city;
                              })() : "غير محددة"}
                            </span>
                            {req.location && req.locationCoords && (
                              <a
                                href={`https://www.google.com/maps?q=${req.locationCoords.lat},${req.locationCoords.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary hover:text-primary/80 transition-colors shrink-0 absolute left-2"
                                title="فتح الخريطة"
                              >
                                <ExternalLink size={10} strokeWidth={2.5} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Budget */}
                      <div className="relative isolate">
                        <label className="absolute -top-2 right-1.5 px-1 bg-card z-10 text-[10px] text-primary font-bold">
                          الميزانية
                        </label>
                        <div className="relative h-9 rounded-md border border-border/60 bg-background flex items-center justify-center overflow-hidden transition-all hover:border-primary/40 group">
                          <div className="w-full h-full flex items-center justify-center px-2 overflow-hidden">
                            <span className="text-xs font-medium text-foreground whitespace-nowrap truncate">
                              {req.budgetType === "fixed"
                                ? `${req.budgetMin}-${req.budgetMax}`
                                : "غير محددة"}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Delivery Time */}
                      <div className="relative isolate">
                        <label className="absolute -top-2 right-1.5 px-1 bg-card z-10 text-[10px] text-primary font-bold">
                          المدة
                        </label>
                        <div className="relative h-9 rounded-md border border-border/60 bg-background flex items-center justify-center overflow-hidden transition-all hover:border-primary/40 group">
                          <div className="w-full h-full flex items-center justify-center px-2 overflow-hidden">
                            <span className="text-xs font-medium text-foreground whitespace-nowrap truncate">
                              {req.deliveryTimeFrom || "غير محددة"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {req.source === 'whatsapp' || req.isCreatedViaWhatsApp ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground">طلب خارجي</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {req.authorFirstName && req.authorLastName 
                              ? `${req.authorFirstName.charAt(0)}${req.authorLastName.charAt(0)}`
                              : req.authorName 
                                ? req.authorName.split(' ').map(n => n.charAt(0)).slice(0, 2).join('')
                                : 'أ'}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {req.authorName || 'عبر منصة أبيلي'}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Action Area */}
                    {req.status === "assigned" || req.status === "completed" ? (
                      <div className="h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-2 bg-muted text-muted-foreground">
                        <Lock size={14} />
                        منتهي
                      </div>
                    ) : myOffer ? (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
                            myOffer.status === "accepted"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : myOffer.status === "negotiating"
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}
                        >
                          {myOffer.status === "accepted"
                            ? <CheckCircle size={16} />
                            : myOffer.status === "negotiating"
                            ? <MessageCircle size={16} />
                            : <CheckCircle size={16} />}

                          {myOffer.status === "accepted"
                            ? "تم قبول عرضك"
                            : myOffer.status === "negotiating"
                            ? "قيد التفاوض"
                            : "تم التقديم"}
                        </motion.div>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRequest(req, true); // true = scroll to offer section
                          }}
                          className={`h-9 px-4 text-xs font-bold rounded-xl bg-primary text-white shadow-md hover:shadow-lg transition-shadow ${
                            showOfferButtonPulse ? "animate-soft-pulse" : ""
                          }`}
                        >
                          تقديم عرض
                        </motion.button>
                      )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};
