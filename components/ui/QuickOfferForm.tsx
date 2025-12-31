import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  Clock,
  MapPin,
  FileText,
  Send,
  Loader2,
  Check,
  X,
  Sparkles,
  ChevronDown,
  Camera
} from "lucide-react";

interface QuickOfferFormProps {
  requestTitle: string;
  requestLocation?: string;
  onSubmit: (offer: {
    price: string;
    duration: string;
    location: string;
    title: string;
    description: string;
  }) => Promise<boolean>;
  isSubmitting?: boolean;
  isGuest?: boolean;
  onLoginRequired?: () => void;
}

export const QuickOfferForm: React.FC<QuickOfferFormProps> = ({
  requestTitle,
  requestLocation,
  onSubmit,
  isSubmitting = false,
  isGuest = false,
  onLoginRequired,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [location, setLocation] = useState(requestLocation || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});

  // Common durations for quick select
  const quickDurations = ["يوم", "يومين", "3 أيام", "أسبوع", "أسبوعين", "شهر"];

  // Validate and submit
  const handleSubmit = async () => {
    if (isGuest) {
      onLoginRequired?.();
      return;
    }

    const newErrors: { [key: string]: boolean } = {};
    
    if (!price.trim()) newErrors.price = true;
    if (!title.trim() && !description.trim()) newErrors.title = true;
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      return;
    }

    const success = await onSubmit({
      price,
      duration,
      location,
      title: title || `عرض على: ${requestTitle.slice(0, 30)}`,
      description: description || title,
    });

    if (success) {
      setShowSuccess(true);
      if (navigator.vibrate) navigator.vibrate(100);
      
      setTimeout(() => {
        setShowSuccess(false);
        setIsExpanded(false);
        // Reset form
        setPrice("");
        setDuration("");
        setTitle("");
        setDescription("");
      }, 2000);
    }
  };

  // Success state
  if (showSuccess) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-emerald-500 rounded-2xl p-6 text-white text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 500 }}
          className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4"
        >
          <Check size={32} />
        </motion.div>
        <h3 className="font-bold text-xl mb-2">تم إرسال العرض!</h3>
        <p className="text-white/80">سيتم إشعار صاحب الطلب بعرضك</p>
      </motion.div>
    );
  }

  // Collapsed state - Just a button
  if (!isExpanded) {
    return (
      <motion.button
        onClick={() => {
          if (navigator.vibrate) navigator.vibrate(10);
          setIsExpanded(true);
        }}
        className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-primary/25 hover:shadow-xl transition-all"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Send size={20} />
        قدّم عرضك
      </motion.button>
    );
  }

  // Expanded form
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <h3 className="font-bold">تقديم عرض سريع</h3>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        
        {/* Price - Most important */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign size={14} className="text-emerald-500" />
            السعر المقترح <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setErrors({ ...errors, price: false });
              }}
              placeholder="مثال: 500"
              className={`w-full px-4 py-3 rounded-xl border text-lg font-bold text-center transition-colors ${
                errors.price 
                  ? "border-red-500 bg-red-50 dark:bg-red-900/10" 
                  : "border-border bg-background focus:border-primary"
              }`}
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              ر.س
            </span>
          </div>
          {errors.price && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-xs"
            >
              يرجى إدخال السعر
            </motion.p>
          )}
        </div>

        {/* Duration - Quick select */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock size={14} className="text-blue-500" />
            مدة التنفيذ
          </label>
          <div className="flex flex-wrap gap-2">
            {quickDurations.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  duration === d
                    ? "bg-primary text-white"
                    : "bg-secondary hover:bg-secondary/80"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Title/Brief - Simple */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FileText size={14} className="text-purple-500" />
            ملخص عرضك
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setErrors({ ...errors, title: false });
            }}
            placeholder="صف عرضك باختصار... (اختياري)"
            rows={3}
            className={`w-full px-4 py-3 rounded-xl border resize-none transition-colors ${
              errors.title 
                ? "border-red-500 bg-red-50 dark:bg-red-900/10" 
                : "border-border bg-background focus:border-primary"
            }`}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-xl"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              جاري الإرسال...
            </>
          ) : (
            <>
              <Send size={20} />
              إرسال العرض
            </>
          )}
        </button>

        {/* Guest Notice */}
        {isGuest && (
          <p className="text-center text-xs text-muted-foreground">
            يجب تسجيل الدخول لتقديم عرض
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default QuickOfferForm;

