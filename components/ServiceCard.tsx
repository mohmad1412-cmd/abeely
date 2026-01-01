import React from "react";
import { Request, Offer } from "../types";
import { AVAILABLE_CATEGORIES } from "../data";
import {
  User,
  Eye,
  ExternalLink,
  Lock,
  CheckCircle,
  MessageCircle,
  Clock,
  MapPin,
  DollarSign,
} from "lucide-react";
import { motion } from "framer-motion";

interface ServiceCardProps {
  req: Request;
  user: any;
  isMyRequest: boolean;
  viewedRequestIds: Set<string>;
  receivedOffersMap: Map<string, Offer[]>;
  myOffer?: Offer;
  onSelectRequest: (req: Request, scrollToOffer?: boolean) => void;
  index: number;
  isTouchHovered: boolean;
  setTouchHoveredCardId: (id: string | null) => void;
  isGuest: boolean;
  setGuestViewedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  req,
  user,
  isMyRequest,
  viewedRequestIds,
  receivedOffersMap,
  myOffer,
  onSelectRequest,
  index,
  isTouchHovered,
  setTouchHoveredCardId,
  isGuest,
  setGuestViewedIds,
}) => {
  return (
    <motion.div
      data-request-id={req.id}
      initial={{ opacity: 0, y: 15 }}
      animate={
        isTouchHovered
          ? { opacity: 1, y: -8, scale: 1.02 }
          : { opacity: 1, y: 0, scale: 1 }
      }
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
        delay: index < 9 ? index * 0.03 : 0,
      }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`bg-card border border-border rounded-2xl overflow-hidden transition-colors flex flex-col cursor-pointer relative shadow-sm ${
        isTouchHovered ? "" : "group"
      }`}
      onClick={() => {
        if (isGuest) {
          setGuestViewedIds((prev) => {
            const newSet = new Set(prev);
            newSet.add(req.id);
            try {
              localStorage.setItem(
                "guestViewedRequestIds",
                JSON.stringify([...newSet])
              );
            } catch (e) {
              console.error("Error saving guest viewed requests:", e);
            }
            return newSet;
          });
        }
        onSelectRequest(req);
      }}
      onMouseEnter={() => setTouchHoveredCardId(req.id)}
      onMouseLeave={() => setTouchHoveredCardId(null)}
      onTouchStart={() => setTouchHoveredCardId(req.id)}
      onTouchEnd={() => setTimeout(() => setTouchHoveredCardId(null), 300)}
    >
      {/* My Request Indicator */}
      {isMyRequest && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-3 left-3 z-20 w-7 h-7 rounded-full bg-teal-600 backdrop-blur-sm flex items-center justify-center shadow-md border border-white/30"
          title="هذا طلبك"
        >
          <User size={14} className="text-white" />
        </motion.div>
      )}
      
      {/* Viewed Indicator */}
      {!isMyRequest && viewedRequestIds.has(req.id) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-3 left-3 z-20 px-2 py-1.5 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center gap-1.5"
          title="فتحت هذا الطلب سابقاً"
        >
          <Eye size={14} className="text-white/80" />
          <span className="text-white/80 text-xs font-medium whitespace-nowrap">تمت المشاهدة</span>
        </motion.div>
      )}

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
              className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[11px] px-2.5 py-1 rounded-full font-medium"
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
          <div className="absolute inset-0 bg-muted/8" />
          <motion.div
            className="absolute -inset-20 opacity-[0.08]"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, currentColor, currentColor 0.5px, transparent 0.5px, transparent 11.5px)`,
              backgroundSize: "40px 40px",
            }}
            animate={{
              backgroundPosition: ["0px 0px", "40px 40px"],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </motion.div>
      )}

      {/* Title & Description */}
      <div className="px-5 pt-3 pb-1">
        <h3 className="text-base font-bold text-foreground line-clamp-1">
          {req.title}
        </h3>
        <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed mt-1">
          {req.description}
        </p>

        {/* Categories Labels */}
        {req.categories && req.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {req.categories.slice(0, 3).map((catLabel, idx) => {
              const categoryObj = AVAILABLE_CATEGORIES.find(
                (c) => c.label === catLabel || c.id === catLabel
              );
              const emoji = categoryObj?.emoji || "📦";
              const displayLabel = categoryObj?.label || catLabel;
              const isUnspecified =
                catLabel === "غير محدد" || catLabel === "unspecified";

              return (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    isUnspecified
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <span>{isUnspecified ? "❓" : emoji}</span>
                  <span className="truncate max-w-[80px]">
                    {isUnspecified ? "غير محدد" : displayLabel}
                  </span>
                </span>
              );
            })}
            {req.categories.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground">
                +{req.categories.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-5 pb-5 flex-1 flex flex-col relative">
        {/* Request Info */}
        <div className="mb-4 mt-4">
          <div className="grid grid-cols-3 gap-2">
            {/* City */}
            <div className="relative isolate">
              <label className="absolute -top-2 right-1.5 px-1 bg-card z-10 text-[11px] text-primary font-bold">
                المدينة
              </label>
              <div className="relative h-9 rounded-md border border-border/60 bg-background flex items-center justify-center overflow-hidden transition-all hover:border-primary/40 group">
                <div className="w-full h-full flex items-center justify-center px-2 overflow-hidden relative">
                  <span className="text-xs font-medium text-foreground whitespace-nowrap truncate">
                    {req.location
                      ? (() => {
                          const locationParts = req.location
                            .split("،")
                            .map((s) => s.trim());
                          return locationParts.length > 1
                            ? locationParts[locationParts.length - 1]
                            : locationParts[0];
                        })()
                      : "غير محددة"}
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
              <label className="absolute -top-2 right-1.5 px-1 bg-card z-10 text-[11px] text-primary font-bold">
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
              <label className="absolute -top-2 right-1.5 px-1 bg-card z-10 text-[11px] text-primary font-bold">
                مدة التنفيذ
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

        <div className="mt-auto pt-4 border-t border-border flex items-center justify-center">
          {/* Action Area */}
          {req.status === "assigned" || req.status === "completed" ? (
            <div className="w-full h-9 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-muted text-muted-foreground">
              <Lock size={14} />
              منتهي
            </div>
          ) : isMyRequest ? (
            (() => {
              const receivedOffers = receivedOffersMap.get(req.id) || [];
              const offersCount = receivedOffers.length;
              return (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
                    onSelectRequest(req, false);
                  }}
                  className="w-full h-9 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-primary border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all relative overflow-visible"
                >
                  <User size={14} className="text-primary" />
                  <span className="flex items-center gap-1">
                    طلبي
                    {offersCount > 0 && (
                      <span className="text-primary/70 font-bold text-[10px] animate-pulse whitespace-nowrap">
                        ({offersCount} {offersCount === 1 ? "عرض" : "عروض"})
                      </span>
                    )}
                  </span>
                  {offersCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2.5 -left-2.5 min-w-[20px] h-[20px] px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-lg z-30 border-2 border-white dark:border-gray-900"
                    >
                      {offersCount}
                    </motion.span>
                  )}
                </motion.button>
              );
            })()
          ) : myOffer ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`w-full h-9 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${
                myOffer.status === "accepted"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : myOffer.status === "negotiating"
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              }`}
            >
              {myOffer.status === "accepted" ? (
                <CheckCircle size={16} />
              ) : myOffer.status === "negotiating" ? (
                <MessageCircle size={16} />
              ) : (
                <CheckCircle size={16} />
              )}

              {myOffer.status === "accepted"
                ? "تم قبول عرضك"
                : myOffer.status === "negotiating"
                ? "قيد التفاوض"
                : "تم التقديم"}
            </motion.div>
          ) : (
            <motion.button
              initial={false}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              animate={isTouchHovered ? { scale: 1.02 } : {}}
              transition={{
                type: "spring",
                stiffness: 800,
                damping: 15,
                mass: 0.5,
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (navigator.vibrate) {
                  navigator.vibrate(10);
                }
                onSelectRequest(req, true);
              }}
              className="w-full h-9 px-4 text-xs font-bold rounded-xl bg-primary text-white relative overflow-hidden animate-button-breathe"
            >
              {/* Animations and effects */}
              <motion.span
                className="absolute -inset-1 rounded-xl border-[3px] border-primary pointer-events-none"
                animate={{
                  scale: [1, 1.2, 1.35],
                  opacity: [0.7, 0.3, 0],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <span className="relative z-10">تقديم عرض</span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};


