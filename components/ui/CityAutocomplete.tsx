/**
 * CityAutocomplete Component
 * مكون البحث عن المدن باستخدام Google Places API
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Loader2, X, Check, ChevronDown, Globe, Navigation, Map } from 'lucide-react';
import { 
  searchCities, 
  searchPlaces,
  CityResult, 
  getCurrentLocation,
  reverseGeocode,
} from '../../services/placesService';
import { useGoogleMapsLoader } from '../../hooks/useGoogleMapsLoader';

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string, cityResult?: CityResult) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  showRemoteOption?: boolean; // خيار "عن بعد"
  showGPSOption?: boolean; // زر تحديد الموقع الحالي
  showMapOption?: boolean; // زر فتح الخريطة
  searchMode?: 'cities' | 'places'; // نوع البحث: مدن فقط أو أي مكان
  disabled?: boolean;
  autoFocus?: boolean;
  // للاستخدام في الفلترة (اختيار متعدد)
  multiSelect?: boolean;
  showAllCitiesOption?: boolean; // خيار "كل المدن"
  selectedCities?: string[];
  onSelectCity?: (city: string) => void;
  onRemoveCity?: (city: string) => void;
  onOpenMap?: () => void; // callback عند الضغط على زر الخريطة
  hideChips?: boolean; // إخفاء الشرائح المختارة (عند عرضها في مكان آخر)
  dropdownDirection?: 'down' | 'up'; // اتجاه القائمة المنسدلة
}

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "ابحث عن مدن، معالم، أو محلات...",
  label,
  className = "",
  showRemoteOption = true,
  showGPSOption = true,
  showMapOption = false,
  showAllCitiesOption = false,
  searchMode = 'places', // البحث عن أي مكان بشكل افتراضي
  disabled = false,
  autoFocus = false,
  multiSelect = false,
  selectedCities = [],
  onSelectCity,
  onRemoveCity,
  onOpenMap,
  hideChips = false,
  dropdownDirection = 'down',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const [results, setResults] = useState<CityResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, bottom: 0, left: 0, width: 0 });
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 24.7136, lng: 46.6753 }); // الرياض كموقع افتراضي
  const [selectedMapLocation, setSelectedMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingMapLocation, setIsLoadingMapLocation] = useState(false);
  const [isValid, setIsValid] = useState(false); // حالة للتحقق من صحة الإدخال
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // حساب موقع القائمة المنسدلة
  const updateDropdownPosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8, // للأسفل
        bottom: window.innerHeight - rect.top + 8, // للأعلى
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  // تحديث موقع القائمة عند الفتح والتمرير
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [isOpen, updateDropdownPosition]);

  // تحميل Google Maps API
  const { isLoaded: isGoogleReady } = useGoogleMapsLoader();

  // تحديث query عند تغيير value من الخارج
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(value);
    }
  }, [value, isOpen]);

  // البحث مع debounce
  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length < 1) {
      // إذا لم يكتب المستخدم شيء، نعرض قائمة فارغة
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // استخدام searchPlaces للبحث العام أو searchCities للمدن فقط
      const searchFn = searchMode === 'places' ? searchPlaces : searchCities;
      const searchResults = await searchFn(query);
      // نعرض نتائج البحث فقط بدون fallback
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchMode]);

  // جلب الموقع الحالي بـ GPS
  const handleGetCurrentLocation = useCallback(async () => {
    if (isGettingLocation) return;
    
    setIsGettingLocation(true);
    try {
      const coords = await getCurrentLocation();
      if (coords) {
        // تحويل الإحداثيات إلى عنوان
        const locationResult = await reverseGeocode(coords.lat, coords.lng);
        if (locationResult) {
          // استخدام اسم العرض الكامل الذي يحتوي على الشارع، الحي، المدينة
          // reverseGeocode الآن ترجع name مع العنوان الكامل
          const displayName = locationResult.name;
          setSearchQuery(displayName);
          onChange(displayName, locationResult);
          setIsOpen(false);
        } else {
          // إذا فشل التحويل، استخدم الإحداثيات مباشرة
          const coordsStr = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
          setSearchQuery(coordsStr);
          onChange(coordsStr, {
            placeId: `gps_${Date.now()}`,
            name: 'موقعي الحالي',
            fullAddress: coordsStr,
            city: 'موقعي الحالي',
            country: 'المملكة العربية السعودية',
            lat: coords.lat,
            lng: coords.lng,
          });
          setIsOpen(false);
        }
      } else {
        alert('لم نتمكن من تحديد موقعك. تأكد من تفعيل خدمات الموقع.');
      }
    } catch (error) {
      console.error('GPS error:', error);
      alert('حدث خطأ أثناء تحديد الموقع');
    } finally {
      setIsGettingLocation(false);
    }
  }, [isGettingLocation, onChange]);

  // تشغيل البحث عند الكتابة
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    setHighlightedIndex(-1);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      handleSearch(newQuery);
    }, 300);
  };

  // عند فتح القائمة
  const handleFocus = () => {
    setIsOpen(true);
    // دائماً نبدأ بقائمة فارغة - المستخدم يبحث مباشرة
    setResults([]);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  // اختيار مدينة
  const handleSelectCity = (city: CityResult) => {
    // بناء اسم العرض الذكي
    // إذا كان مدينة معروفة (العنوان الإضافي هو المملكة فقط) → نستخدم الاسم + السعودية
    // إذا كان قرية/حي/محل → نضيف المدينة التابعة لها + السعودية
    let displayName = city.name;
    let hasParentCity = false;
    
    // استخراج المدينة من العنوان الكامل
    if (city.fullAddress && city.fullAddress !== city.name) {
      // العنوان الكامل عادة: "اسم المكان، المدينة، المنطقة، المملكة"
      const addressParts = city.fullAddress
        .split(/[،,]/)
        .map(p => p.trim())
        .filter(p => p && p !== city.name);
      
      // تنظيف كل جزء من الكلمات غير المرغوبة (المملكة، السعودية، Saudi)
      // ثم نفلتر الأجزاء الفارغة
      const cleanedParts = addressParts
        .map(p => p
          .replace(/المملكة العربية السعودية/g, '')
          .replace(/السعودية/g, '')
          .replace(/Saudi Arabia/gi, '')
          .replace(/Saudi/gi, '')
          .trim()
        )
        .filter(p => p.length > 0);
      
      // إذا بقي أجزاء، نأخذ آخر جزء (عادة المدينة الرئيسية)
      // مثال: ["طريق الملك عبدالعزيز", "الرياض"] → نأخذ "الرياض"
      // مثال: ["حائل"] → نأخذ "حائل"
      if (cleanedParts.length > 0) {
        // آخر جزء هو المدينة الرئيسية
        const mainCity = cleanedParts[cleanedParts.length - 1];
        // فقط إذا كانت المدينة الرئيسية مختلفة عن اسم المكان
        if (mainCity.toLowerCase() !== city.name.toLowerCase()) {
          displayName = `${city.name}، ${mainCity}`;
          hasParentCity = true;
        }
      }
    }
    
    // إضافة "السعودية" للمدن الكبيرة التي ليس لها مدينة أم
    if (!hasParentCity) {
      displayName = `${city.name}، السعودية`;
    }
    
    setIsValid(true); // تم اختيار قيمة صحيحة
    
    if (multiSelect && onSelectCity) {
      onSelectCity(displayName);
      setSearchQuery('');
    } else {
      setSearchQuery(displayName);
      onChange(displayName, city);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // اختيار "عن بعد"
  const handleSelectRemote = () => {
    const remoteName = 'عن بعد';
    setIsValid(true); // تم اختيار قيمة صحيحة
    
    if (multiSelect && onSelectCity) {
      onSelectCity(remoteName);
      setSearchQuery('');
    } else {
      setSearchQuery(remoteName);
      onChange(remoteName);
    }
    setIsOpen(false);
  };

  // إغلاق عند النقر خارج المكون
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // تجاهل النقر داخل الـ container أو داخل الـ dropdown (المُعرض عبر Portal)
      const isInsideContainer = containerRef.current && containerRef.current.contains(target);
      const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);
      
      if (!isInsideContainer && !isInsideDropdown) {
        setIsOpen(false);
        if (!multiSelect) {
          setSearchQuery(value);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, multiSelect]);

  // التنقل بلوحة المفاتيح
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = results.length + (showRemoteOption ? 1 : 0);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + totalItems) % totalItems);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          if (showRemoteOption && highlightedIndex === 0) {
            handleSelectRemote();
          } else {
            const cityIndex = showRemoteOption ? highlightedIndex - 1 : highlightedIndex;
            if (results[cityIndex]) {
              handleSelectCity(results[cityIndex]);
            }
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // مسح البحث
  const handleClear = () => {
    setSearchQuery('');
    onChange('');
    setIsValid(false); // إعادة تعيين حالة الصحة
    inputRef.current?.focus();
    handleSearch('');
  };
  
  // تحديث حالة الصحة عند تغيير القيمة
  useEffect(() => {
    setIsValid(value.trim().length > 0);
  }, [value]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-muted-foreground mb-2 text-right">
          {label}
        </label>
      )}

      {/* Multi-select chips */}
      {multiSelect && selectedCities.length > 0 && !hideChips && (
        <div className="flex flex-wrap justify-start gap-1.5 mb-2 w-full">
          {selectedCities.map((city) => (
            <motion.span
              key={city}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-sm border border-primary/30"
            >
              <MapPin size={12} />
              <span>{city}</span>
              <button
                onClick={() => onRemoveCity?.(city)}
                className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
              >
                <X size={12} />
              </button>
            </motion.span>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative w-full rounded-xl overflow-visible">
        {/* Ripple effect on focus - موجة خفيفة واضحة */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 0 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* موجة خلفية خفيفة */}
              <motion.div
                className="absolute inset-0 bg-primary/8 rounded-xl"
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.02, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              />
              {/* موجة متوسطة */}
              <motion.div
                className="absolute inset-0 bg-primary/12 rounded-xl"
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1.02, opacity: [0, 0.4, 0] }}
                transition={{ duration: 0.5, ease: "easeOut", times: [0, 0.4, 1] }}
              />
              {/* موجة خارجية خفيفة */}
              <motion.div
                className="absolute inset-0 bg-primary/6 rounded-xl"
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1.05, opacity: [0, 0.2, 0] }}
                transition={{ duration: 0.7, ease: "easeOut", times: [0, 0.3, 1] }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" style={{ zIndex: 20 }}>
          {isLoading ? (
            <Loader2 size={16} className="animate-spin text-primary" />
          ) : (
            <MapPin size={16} className={isOpen ? 'text-primary' : ''} />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          style={{ position: 'relative', zIndex: 10 }}
          className={`
            w-full pr-10 pl-10 py-2 rounded-xl border-2 bg-card
            text-foreground placeholder:text-muted-foreground/60 text-right
            focus:outline-none transition-all duration-200
            ${isOpen 
              ? 'border-primary' 
              : isValid && value.trim().length > 0
              ? 'border-primary/60'
              : 'border-border'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />

        {/* Clear / Dropdown toggle button */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1" style={{ zIndex: 20 }}>
          {searchQuery && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!disabled) {
                setIsOpen(!isOpen);
              }
            }}
            className="p-0.5 hover:bg-secondary rounded-full transition-colors cursor-pointer"
            disabled={disabled}
          >
            <ChevronDown 
              size={14} 
              className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : 'text-muted-foreground'}`}
            />
          </button>
        </div>

      </div>


      {/* Dropdown - using Portal */}
      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: dropdownDirection === 'up' ? 10 : -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropdownDirection === 'up' ? 10 : -10, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              ...(dropdownDirection === 'up' 
                ? { bottom: dropdownPosition.bottom }
                : { top: dropdownPosition.top }
              ),
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              zIndex: 10000,
            }}
            className="py-2 rounded-xl border border-primary/30 bg-card shadow-2xl max-h-64 overflow-y-auto pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Actions: GPS & Remote */}
            {(showGPSOption || showRemoteOption) && (
              <div className="flex gap-2 px-3 py-2 border-b border-border">
                {showGPSOption && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleGetCurrentLocation();
                    }}
                    disabled={isGettingLocation}
                    className={`
                      flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                      bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer
                      ${isGettingLocation ? 'opacity-50 cursor-wait' : ''}
                    `}
                  >
                    {isGettingLocation ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Navigation size={16} />
                    )}
                    <span className="text-sm font-medium">
                      {isGettingLocation ? 'جاري...' : 'موقعي'}
                    </span>
                  </button>
                )}
                {showRemoteOption && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelectRemote();
                    }}
                    className={`
                      flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer
                      ${selectedCities.includes('عن بعد') 
                        ? 'bg-primary text-white' 
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }
                    `}
                  >
                    <Globe size={16} />
                    <span className="text-sm font-medium">عن بعد</span>
                  </button>
                )}
              </div>
            )}
            
            {/* Map Option */}
            {showMapOption && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(false);
                  // الحصول على الموقع الحالي كمركز للخريطة
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                      () => {} // تجاهل الخطأ - استخدم الموقع الافتراضي
                    );
                  }
                  setShowMapModal(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors cursor-pointer hover:bg-secondary/50 text-foreground border-b border-border"
              >
                <Map size={18} className="text-primary" />
                <div className="flex-1">
                  <span className="font-medium">اختر من الخريطة</span>
                  <span className="text-xs text-muted-foreground block">حدد موقعك على الخريطة</span>
                </div>
              </button>
            )}

            {/* All Cities Option - First in list */}
            {(multiSelect || showAllCitiesOption) && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  if (multiSelect) {
                    // استخدام onSelectCity مباشرة - سيتعامل معها المكون الأب
                    // عند اختيار "كل المدن"، المكون الأب سيتعامل مع إزالة المدن الأخرى
                    onSelectCity?.('كل المدن');
                  } else {
                    onChange('كل المدن');
                  }
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors cursor-pointer
                  hover:bg-secondary/50
                  ${(selectedCities.includes('كل المدن') || value === 'كل المدن') ? 'text-primary bg-primary/5' : 'text-foreground'}
                `}
              >
                <MapPin size={18} className={(selectedCities.includes('كل المدن') || value === 'كل المدن') ? 'text-primary' : 'text-muted-foreground'} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">كل المدن</span>
                  <span className="text-xs text-muted-foreground block">المملكة العربية السعودية</span>
                </div>
                {(selectedCities.includes('كل المدن') || value === 'كل المدن') && (
                  <Check size={16} className="text-primary shrink-0" />
                )}
              </button>
            )}

            {/* City Results */}
            {results.length > 0 ? (
              results.map((city, index) => {
                const actualIndex = showRemoteOption ? index + 1 : index;
                const isSelected = selectedCities.includes(city.name) || value === city.name;
                
                return (
                  <button
                    key={city.placeId}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelectCity(city);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors cursor-pointer
                      ${highlightedIndex === actualIndex ? 'bg-primary/10' : 'hover:bg-secondary/50'}
                      ${isSelected ? 'text-primary' : 'text-foreground'}
                    `}
                  >
                    <MapPin size={18} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{city.name}</span>
                        {/* عرض نوع المكان */}
                        {city.placeTypeArabic && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                            {city.placeTypeArabic}
                          </span>
                        )}
                      </div>
                      {/* عرض العنوان الكامل أو المنطقة */}
                      {(city.fullAddress && city.fullAddress !== city.name) ? (
                        <span className="text-xs text-muted-foreground truncate block">
                          {city.fullAddress.replace(city.name, '').replace(/^[،,\s]+/, '')}
                        </span>
                      ) : city.region && (
                        <span className="text-xs text-muted-foreground truncate block">
                          {city.region}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={16} className="text-primary shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              // نعرض رسالة "لا توجد نتائج" فقط إذا كان المستخدم قد بحث بالفعل (اكتب حرف واحد على الأقل)
              searchQuery.trim().length >= 1 && (
                <div className="px-4 py-6 text-center text-muted-foreground">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      <span>جاري البحث...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Search size={24} className="text-muted-foreground/50" />
                      <span>لا توجد نتائج</span>
                      <span className="text-xs">جرب البحث باسم مختلف</span>
                    </div>
                  )}
                </div>
              )
            )}

            {/* Hint for manual entry */}
            {!isLoading && searchQuery && results.length === 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(searchQuery);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-right hover:bg-secondary/50 transition-colors border-t border-border cursor-pointer"
              >
                <Search size={18} className="text-muted-foreground" />
                <span className="text-muted-foreground">
                  استخدم "<span className="text-foreground font-medium">{searchQuery}</span>"
                </span>
              </button>
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Map Modal */}
      {showMapModal && createPortal(
        <div 
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowMapModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-card rounded-2xl shadow-2xl w-[95vw] max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="p-2 hover:bg-secondary rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <h3 className="font-bold text-lg">اختر موقعك على الخريطة</h3>
              <div className="w-8" />
            </div>

            {/* Map Container */}
            <div className="relative h-[50vh] min-h-[300px]">
              <div
                ref={(el) => {
                  if (el && !mapRef.current && window.google?.maps) {
                    const map = new window.google.maps.Map(el, {
                      center: mapCenter,
                      zoom: 12,
                      disableDefaultUI: true,
                      zoomControl: true,
                      mapTypeControl: false,
                      streetViewControl: false,
                      fullscreenControl: false,
                      gestureHandling: 'greedy',
                    });
                    mapRef.current = map;

                    // Marker
                    const marker = new window.google.maps.Marker({
                      position: mapCenter,
                      map: map,
                      draggable: true,
                      animation: window.google.maps.Animation.DROP,
                    });
                    markerRef.current = marker;
                    setSelectedMapLocation(mapCenter);

                    // Click on map to move marker
                    map.addListener('click', (e: google.maps.MapMouseEvent) => {
                      if (e.latLng) {
                        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                        marker.setPosition(pos);
                        setSelectedMapLocation(pos);
                      }
                    });

                    // Drag marker
                    marker.addListener('dragend', () => {
                      const pos = marker.getPosition();
                      if (pos) {
                        setSelectedMapLocation({ lat: pos.lat(), lng: pos.lng() });
                      }
                    });
                  }
                }}
                className="w-full h-full"
              />

              {/* Center crosshair indicator */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-primary rounded-full bg-white/80 shadow-lg" />
              </div>

              {/* Loading overlay */}
              {isLoadingMapLocation && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg">
                    <Loader2 className="animate-spin text-primary" size={20} />
                    <span className="text-sm font-medium">جاري تحديد العنوان...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with confirm button */}
            <div className="p-4 border-t border-border bg-secondary/20">
              <button
                type="button"
                disabled={!selectedMapLocation || isLoadingMapLocation}
                onClick={async () => {
                  if (!selectedMapLocation) return;
                  
                  setIsLoadingMapLocation(true);
                  try {
                    const result = await reverseGeocode(selectedMapLocation.lat, selectedMapLocation.lng);
                    if (result) {
                      // استخدام اسم العرض الكامل الذي يحتوي على الشارع، الحي، المدينة
                      // reverseGeocode الآن ترجع name مع العنوان الكامل
                      const displayName = result.name;
                      setSearchQuery(displayName);
                      onChange(displayName, result);
                    }
                  } catch (error) {
                    console.error('Reverse geocode error:', error);
                  } finally {
                    setIsLoadingMapLocation(false);
                    setShowMapModal(false);
                    // تنظيف الخريطة
                    if (markerRef.current) {
                      markerRef.current.setMap(null);
                      markerRef.current = null;
                    }
                    mapRef.current = null;
                  }
                }}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <MapPin size={18} />
                <span>تأكيد الموقع</span>
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CityAutocomplete;

