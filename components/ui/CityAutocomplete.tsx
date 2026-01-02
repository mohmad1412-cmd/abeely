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
  getDefaultCities,
  getCurrentLocation,
  reverseGeocode,
} from '../../services/placesService';
import { useGoogleMapsLoader } from '../../hooks/useGoogleMapsLoader';

// المدن الأساسية للاختيار السريع
const QUICK_CITIES = ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر'];

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
  placeholder = "ابحث عن مدينة...",
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
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
    if (!query || query.trim().length < 2) {
      setResults(getDefaultCities().slice(0, 10));
      return;
    }

    setIsLoading(true);
    try {
      // استخدام searchPlaces للبحث العام أو searchCities للمدن فقط
      const searchFn = searchMode === 'places' ? searchPlaces : searchCities;
      const searchResults = await searchFn(query);
      setResults(searchResults.length > 0 ? searchResults : getDefaultCities().filter(
        c => c.name.includes(query)
      ));
    } catch (error) {
      console.error('Search error:', error);
      setResults(getDefaultCities().filter(c => c.name.includes(query)));
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
          setSearchQuery(locationResult.name);
          onChange(locationResult.name, locationResult);
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
    if (results.length === 0) {
      setResults(getDefaultCities().slice(0, 10));
    }
  };

  // اختيار مدينة
  const handleSelectCity = (city: CityResult) => {
    console.log('handleSelectCity:', city.name, 'multiSelect:', multiSelect, 'onSelectCity exists:', !!onSelectCity);
    if (multiSelect && onSelectCity) {
      console.log('Calling onSelectCity with:', city.name);
      onSelectCity(city.name);
      setSearchQuery('');
    } else {
      setSearchQuery(city.name);
      onChange(city.name, city);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // اختيار "عن بعد"
  const handleSelectRemote = () => {
    const remoteName = 'عن بعد';
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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
    inputRef.current?.focus();
    handleSearch('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          {label}
        </label>
      )}

      {/* Multi-select chips */}
      {multiSelect && selectedCities.length > 0 && !hideChips && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedCities.map((city) => (
            <motion.span
              key={city}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 text-sm border border-emerald-500/30"
            >
              <MapPin size={12} />
              <span>{city}</span>
              <button
                onClick={() => onRemoveCity?.(city)}
                className="p-0.5 hover:bg-emerald-500/20 rounded-full transition-colors"
              >
                <X size={12} />
              </button>
            </motion.span>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {isLoading ? (
            <Loader2 size={18} className="animate-spin text-emerald-500" />
          ) : (
            <MapPin size={18} className={isOpen ? 'text-emerald-500' : ''} />
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
          className={`
            w-full pr-10 pl-10 py-3 rounded-xl border-2 bg-card
            text-foreground placeholder:text-muted-foreground/60
            focus:outline-none transition-all duration-200
            ${isOpen 
              ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
              : 'border-border'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />

        {/* Clear / Dropdown button */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchQuery && !disabled && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
          <ChevronDown 
            size={16} 
            className={`transition-transform ${isOpen ? 'rotate-180 text-emerald-500' : 'text-muted-foreground'}`}
          />
        </div>

      </div>


      {/* Dropdown - using Portal */}
      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div
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
            className="py-2 rounded-xl border border-emerald-500/30 bg-card shadow-2xl max-h-64 overflow-y-auto pointer-events-auto"
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
                      bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors cursor-pointer
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
                        ? 'bg-blue-500 text-white' 
                        : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'
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
            {showMapOption && onOpenMap && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(false);
                  onOpenMap();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors cursor-pointer hover:bg-secondary/50 text-foreground border-b border-border"
              >
                <Map size={18} className="text-emerald-600" />
                <div className="flex-1">
                  <span className="font-medium">اختر من الخريطة</span>
                  <span className="text-xs text-muted-foreground block">تحديد يدوي للموقع</span>
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
                  ${(selectedCities.includes('كل المدن') || value === 'كل المدن') ? 'text-emerald-600 bg-emerald-500/5' : 'text-foreground'}
                `}
              >
                <MapPin size={18} className={(selectedCities.includes('كل المدن') || value === 'كل المدن') ? 'text-emerald-600' : 'text-muted-foreground'} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">كل المدن</span>
                  <span className="text-xs text-muted-foreground block">المملكة العربية السعودية</span>
                </div>
                {(selectedCities.includes('كل المدن') || value === 'كل المدن') && (
                  <Check size={16} className="text-emerald-600 shrink-0" />
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
                      console.log('Button clicked for city:', city.name);
                      handleSelectCity(city);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors cursor-pointer
                      ${highlightedIndex === actualIndex ? 'bg-emerald-500/10' : 'hover:bg-secondary/50'}
                      ${isSelected ? 'text-emerald-600' : 'text-foreground'}
                    `}
                  >
                    <MapPin size={18} className={isSelected ? 'text-emerald-600' : 'text-muted-foreground'} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{city.name}</span>
                        {/* عرض نوع المكان */}
                        {city.placeTypeArabic && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 shrink-0">
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
                      <Check size={16} className="text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
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
    </div>
  );
};

export default CityAutocomplete;

