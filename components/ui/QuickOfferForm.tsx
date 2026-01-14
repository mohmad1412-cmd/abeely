import React, { useState, useRef, useEffect } from "react";
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
  ChevronDown,
  Camera
} from "lucide-react";
import { CityAutocomplete } from "./CityAutocomplete.tsx";
import { CityResult } from "../../services/placesService.ts";

interface QuickOfferFormProps {
  requestTitle: string;
  requestLocation?: string;
  onSubmit: (offer: {
    price: string;
    duration: string;
    location: string;
    title: string;
    description: string;
    isNegotiable?: boolean;
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
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [location, setLocation] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
  const [shakingFields, setShakingFields] = useState<{ [key: string]: boolean }>({});
  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const locationContainerRef = useRef<HTMLDivElement>(null);

  // Common durations for quick select
  const quickDurations = ["يوم", "يومين", "3 أيام", "أسبوع", "أسبوعين", "شهر"];

  const [isShaking, setIsShaking] = useState(false);

  // Save form data to localStorage before requiring login
  const saveFormDataForGuest = () => {
    const formData = {
      price: price.trim(),
      duration: duration.trim(),
      location: location.trim(),
      title: title.trim(),
      description: description.trim(),
      requestTitle: requestTitle,
      requestLocation: requestLocation,
      timestamp: Date.now(),
    };
    localStorage.setItem('abeely_pending_offer_form', JSON.stringify(formData));
  };

  // Restore form data from localStorage
  const restoreFormDataFromGuest = () => {
    const savedData = localStorage.getItem('abeely_pending_offer_form');
    if (!savedData) return false;

    try {
      const formData = JSON.parse(savedData);
      
      // Only restore if it's for the same request
      if (formData.requestTitle === requestTitle) {
        if (formData.price) setPrice(formData.price);
        if (formData.duration) setDuration(formData.duration);
        if (formData.location) setLocation(formData.location);
        if (formData.title) setTitle(formData.title);
        if (formData.description) setDescription(formData.description);
        
        // Clear saved data after restoring
        localStorage.removeItem('abeely_pending_offer_form');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error restoring offer form data:', error);
      localStorage.removeItem('abeely_pending_offer_form');
      return false;
    }
  };

  // Check for saved form data on mount
  useEffect(() => {
    if (!isGuest) {
      restoreFormDataFromGuest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, requestTitle]);

  // Monitor focus on location input
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (locationContainerRef.current?.contains(e.target as Node)) {
        setIsLocationFocused(true);
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      if (!locationContainerRef.current?.contains(e.target as Node)) {
        setIsLocationFocused(false);
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Validate and submit
  const handleSubmit = async () => {
    if (isGuest) {
      // Save form data before requiring login
      saveFormDataForGuest();
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
      isNegotiable,
    });

    if (success) {
      setShowSuccess(true);
      if (navigator.vibrate) navigator.vibrate(100);
      
      // Clear saved form data after successful submission
      localStorage.removeItem('abeely_pending_offer_form');
      
      setTimeout(() => {
        setShowSuccess(false);
        // Reset form
        setPrice("");
        setDuration("");
        setTitle("");
        setDescription("");
      }, 2000);
    }
  };

  const handleButtonClick = () => {
    if (isSubmitting) return;
    
    // التحقق من الحقول المطلوبة
    const hasPrice = price.trim().length > 0;
    const hasDescription = title.trim().length > 0 || description.trim().length > 0;
    
    // إذا كان هناك حقول ناقصة، أضف اهتزاز وحد أحمر
    if (!hasPrice || !hasDescription) {
      setIsShaking(true);
      
      // إضافة اهتزاز للحقول الناقصة
      const newShakingFields: { [key: string]: boolean } = {};
      if (!hasPrice) {
        newShakingFields.price = true;
        // التركيز على حقل السعر أولاً
        setTimeout(() => priceInputRef.current?.focus(), 100);
      } else if (!hasDescription) {
        newShakingFields.title = true;
        // التركيز على حقل الوصف إذا كان السعر موجود
        setTimeout(() => descriptionInputRef.current?.focus(), 100);
      }
      setShakingFields(newShakingFields);
      
      // إضافة أخطاء
      const newErrors: { [key: string]: boolean } = {};
      if (!hasPrice) newErrors.price = true;
      if (!hasDescription) newErrors.title = true;
      setErrors(newErrors);
      
      // اهتزاز هاتفي
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50, 30, 50]);
      }
      
      // إزالة الاهتزاز بعد 500ms
      setTimeout(() => {
        setIsShaking(false);
        setShakingFields({});
      }, 500);
      
      return;
    }
    
    // إذا كانت جميع الحقول مكتملة، أرسل
    handleSubmit();
  };

  // Success state
  if (showSuccess) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-primary rounded-2xl p-6 text-white text-center"
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

  // Form (always expanded - no collapsed state)
  return (
    <div className="space-y-4">
        {/* Location - City Autocomplete with Floating Label */}
        <div className="space-y-2">
          <div className="relative" ref={locationContainerRef}>
            <motion.label
              htmlFor="location-input"
              animate={{
                top: isLocationFocused || location ? "0px" : "50%",
                fontSize: isLocationFocused || location ? "12px" : "14px",
              }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`absolute right-4 -translate-y-1/2 pointer-events-none bg-background px-2 z-20 ${
                isLocationFocused || location ? "top-0 border border-border rounded-md py-0.5" : "top-1/2 border-0 py-0"
              } text-muted-foreground`}
            >
              الموقع
            </motion.label>
            <div className="[&_input]:py-2.5">
              <CityAutocomplete
                value={location}
                onChange={(value: string, cityResult?: CityResult) => {
                  setLocation(value);
                }}
                placeholder=""
                showRemoteOption={true}
                showGPSOption={true}
                searchMode="places"
                dropdownDirection="up"
                onOpenChange={(isOpen) => {
                  if (isOpen) {
                    setIsLocationFocused(true);
                  } else {
                    // تأخير بسيط للتحقق من أن focus لم ينتقل إلى مكان آخر
                    setTimeout(() => {
                      if (!locationContainerRef.current?.contains(document.activeElement)) {
                        setIsLocationFocused(location.length > 0);
                      }
                    }, 100);
                  }
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Price - Most important */}
        <div className="space-y-2">
          <div className="flex flex-col gap-3">
            {/* Price Input with Floating Label */}
            <div className="relative">
              <motion.label
                htmlFor="price-input"
                animate={{
                  top: isPriceFocused || price ? "0px" : "50%",
                  fontSize: isPriceFocused || price ? "12px" : "14px",
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`absolute right-4 -translate-y-1/2 pointer-events-none bg-background px-2 z-10 ${
                  isPriceFocused || price ? "top-0 border border-border rounded-md py-0.5" : "top-1/2 border-0 py-0"
                } ${errors.price || shakingFields.price ? "text-red-500 border-red-500" : "text-muted-foreground"}`}
              >
                سعر العرض <span className="text-red-500">*</span>
              </motion.label>
              <motion.input
                id="price-input"
                ref={priceInputRef}
                type="number"
                value={price}
                onFocus={() => setIsPriceFocused(true)}
                onBlur={() => setIsPriceFocused(false)}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setErrors({ ...errors, price: false });
                  setShakingFields({ ...shakingFields, price: false });
                }}
                animate={shakingFields.price ? {
                  x: [0, -8, 8, -8, 8, 0],
                  transition: { duration: 0.5 }
                } : {}}
                className={`w-full px-4 py-2.5 text-sm rounded-xl border-2 text-center transition-colors focus:outline-none ${
                  errors.price || shakingFields.price
                    ? "border-red-500 bg-red-50 dark:bg-red-900/10 ring-2 ring-red-500/30" 
                    : "border-border bg-background focus:border-primary"
                }`}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                ر.س
              </span>
            </div>
            {/* Negotiable Toggle */}
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 bg-white checked:border-primary checked:bg-primary transition-all dark:bg-background dark:border-border"
                    checked={isNegotiable}
                    onChange={(e) => setIsNegotiable(e.target.checked)}
                  />
                  <Check
                    size={12}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
                  />
                </div>
                <span className="text-xs font-bold whitespace-nowrap">قابل للتفاوض</span>
              </label>
              <p className="text-[10px] text-muted-foreground/70 pr-6 leading-tight">
                يمكن لصاحب الطلب التواصل معك قبل اعتماد عرضك
              </p>
            </div>
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

        {/* Duration - Quick select - Temporarily removed */}
        {/* <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock size={14} className="text-primary" />
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
        </div> */}

        {/* Title/Brief - Simple with Floating Label */}
        <div className="space-y-2">
          <div className="relative">
            <motion.label
              htmlFor="description-input"
              animate={{
                top: isDescriptionFocused || description ? "0px" : "16px",
                fontSize: isDescriptionFocused || description ? "12px" : "14px",
              }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`absolute right-4 -translate-y-1/2 pointer-events-none bg-background px-2 z-10 ${
                isDescriptionFocused || description ? "top-0 border border-border rounded-md py-0.5" : "top-4 border-0 py-0"
              } ${errors.title || shakingFields.title ? "text-red-500 border-red-500" : "text-muted-foreground"}`}
            >
              ملخص عرضك <span className="text-red-500">*</span>
            </motion.label>
            <motion.textarea
              id="description-input"
              ref={descriptionInputRef}
              value={description}
              onFocus={() => setIsDescriptionFocused(true)}
              onBlur={() => setIsDescriptionFocused(false)}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors({ ...errors, title: false });
                setShakingFields({ ...shakingFields, title: false });
              }}
              rows={3}
              animate={shakingFields.title ? {
                x: [0, -8, 8, -8, 8, 0],
                transition: { duration: 0.5 }
              } : {}}
              className={`w-full px-4 py-3 pt-4 rounded-xl border-2 resize-none transition-colors focus:outline-none ${
                errors.title || shakingFields.title
                  ? "border-red-500 bg-red-50 dark:bg-red-900/10 ring-2 ring-red-500/30" 
                  : "border-border bg-background focus:border-primary"
              }`}
            />
          </div>
        </div>

        {/* Submit Button */}
        <motion.button
          onClick={handleButtonClick}
          disabled={isSubmitting}
          animate={isShaking ? {
            x: [0, -10, 10, -10, 10, 0],
            transition: { duration: 0.5 }
          } : {}}
          className={`w-full py-4 rounded-2xl bg-primary text-white font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-primary/25 transition-all hover:shadow-xl ${
            isSubmitting 
              ? 'opacity-50 cursor-wait' 
              : isShaking
              ? 'border-2 border-red-500 cursor-not-allowed'
              : 'cursor-pointer'
          }`}
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
        </motion.button>

        {/* Guest Notice */}
        {isGuest && (
          <p className="text-center text-xs text-muted-foreground">
            يجب تسجيل الدخول لتقديم عرض
          </p>
        )}
      </div>
  );
};

export default QuickOfferForm;

