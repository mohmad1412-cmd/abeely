/**
 * Google Places Service
 * خدمة البحث عن المدن والمواقع باستخدام Google Places API
 */

// Type definitions for Google Places
export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry?: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export interface CityResult {
  placeId: string;
  name: string;
  fullAddress: string;
  city: string;
  region?: string;
  country: string;
  lat?: number;
  lng?: number;
}

// مدن سعودية افتراضية للـ fallback
export const DEFAULT_SAUDI_CITIES = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", 
  "الخبر", "الظهران", "الأحساء", "الطائف", "تبوك",
  "بريدة", "خميس مشيط", "أبها", "حائل", "نجران",
  "جازان", "ينبع", "الجبيل", "القطيف", "الخرج",
  "عنيزة", "الباحة", "سكاكا", "عرعر", "القريات",
  "حفر الباطن", "رابغ", "المجمعة", "القنفذة", "بيشة"
];

// تخزين مؤقت للنتائج
const cache = new Map<string, { results: CityResult[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

// التحقق من وجود Google Places API
const isGooglePlacesAvailable = (): boolean => {
  return !!(window.google && window.google.maps && window.google.maps.places);
};

// انتظار تحميل Google Places API
export const waitForGooglePlaces = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isGooglePlacesAvailable()) {
      resolve(true);
      return;
    }

    // محاولات متعددة
    let attempts = 0;
    const maxAttempts = 50; // 5 ثوان كحد أقصى
    
    const checkInterval = setInterval(() => {
      attempts++;
      if (isGooglePlacesAvailable()) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('Google Places API not loaded after timeout');
        resolve(false);
      }
    }, 100);
  });
};

// AutocompleteService instance
let autocompleteService: google.maps.places.AutocompleteService | null = null;
let placesService: google.maps.places.PlacesService | null = null;
let placesDiv: HTMLDivElement | null = null;

const getAutocompleteService = (): google.maps.places.AutocompleteService | null => {
  if (!isGooglePlacesAvailable()) return null;
  
  if (!autocompleteService) {
    autocompleteService = new google.maps.places.AutocompleteService();
  }
  return autocompleteService;
};

const getPlacesService = (): google.maps.places.PlacesService | null => {
  if (!isGooglePlacesAvailable()) return null;
  
  if (!placesService) {
    if (!placesDiv) {
      placesDiv = document.createElement('div');
    }
    placesService = new google.maps.places.PlacesService(placesDiv);
  }
  return placesService;
};

/**
 * البحث عن المدن باستخدام Google Places Autocomplete
 * @param query نص البحث
 * @param countryCode كود الدولة (افتراضي: السعودية)
 * @returns قائمة المدن المطابقة
 */
export const searchCities = async (
  query: string,
  countryCode: string = 'sa'
): Promise<CityResult[]> => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const trimmedQuery = query.trim();
  const cacheKey = `${trimmedQuery.toLowerCase()}_${countryCode}`;

  // التحقق من الكاش
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.results;
  }

  // التحقق من توفر Google Places
  if (!isGooglePlacesAvailable()) {
    console.log('Google Places not available, using fallback');
    return searchCitiesFallback(trimmedQuery);
  }

  const service = getAutocompleteService();
  if (!service) {
    return searchCitiesFallback(trimmedQuery);
  }

  try {
    const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>(
      (resolve, reject) => {
        service.getPlacePredictions(
          {
            input: trimmedQuery,
            // البحث عن أي مكان (مدن، أحياء، شوارع...)
            componentRestrictions: { country: countryCode },
            language: 'ar', // اللغة العربية
          },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              resolve([]);
            } else {
              reject(new Error(`Places API error: ${status}`));
            }
          }
        );
      }
    );

    const cityResults: CityResult[] = predictions.map((prediction) => {
      const mainText = prediction.structured_formatting.main_text;
      const secondaryText = prediction.structured_formatting.secondary_text || '';
      
      // استخراج اسم المنطقة والدولة
      const parts = secondaryText.split('،').map(p => p.trim());
      const region = parts.length > 1 ? parts[0] : undefined;
      const country = parts.length > 0 ? parts[parts.length - 1] : 'المملكة العربية السعودية';

      return {
        placeId: prediction.place_id,
        name: mainText,
        fullAddress: prediction.description,
        city: mainText,
        region,
        country,
      };
    });

    // تخزين في الكاش
    cache.set(cacheKey, { results: cityResults, timestamp: Date.now() });

    return cityResults;
  } catch (error) {
    console.error('Error searching cities:', error);
    return searchCitiesFallback(trimmedQuery);
  }
};

/**
 * البحث البديل في حالة عدم توفر Google Places
 */
const searchCitiesFallback = (query: string): CityResult[] => {
  const normalizedQuery = query.toLowerCase();
  
  return DEFAULT_SAUDI_CITIES
    .filter(city => city.toLowerCase().includes(normalizedQuery))
    .map(city => ({
      placeId: `fallback_${city}`,
      name: city,
      fullAddress: `${city}، المملكة العربية السعودية`,
      city,
      country: 'المملكة العربية السعودية',
    }));
};

/**
 * الحصول على تفاصيل المكان
 */
export const getPlaceDetails = async (placeId: string): Promise<CityResult | null> => {
  if (placeId.startsWith('fallback_')) {
    const cityName = placeId.replace('fallback_', '');
    return {
      placeId,
      name: cityName,
      fullAddress: `${cityName}، المملكة العربية السعودية`,
      city: cityName,
      country: 'المملكة العربية السعودية',
    };
  }

  if (!isGooglePlacesAvailable()) {
    return null;
  }

  const service = getPlacesService();
  if (!service) return null;

  try {
    const place = await new Promise<google.maps.places.PlaceResult | null>(
      (resolve, reject) => {
        service.getDetails(
          {
            placeId,
            fields: ['place_id', 'name', 'formatted_address', 'geometry', 'address_components'],
            language: 'ar',
          },
          (result, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && result) {
              resolve(result);
            } else {
              reject(new Error(`Place details error: ${status}`));
            }
          }
        );
      }
    );

    if (!place) return null;

    // استخراج المدينة والمنطقة من address_components
    let city = place.name || '';
    let region: string | undefined;
    let country = 'المملكة العربية السعودية';

    if (place.address_components) {
      for (const component of place.address_components) {
        if (component.types.includes('locality')) {
          city = component.long_name;
        } else if (component.types.includes('administrative_area_level_1')) {
          region = component.long_name;
        } else if (component.types.includes('country')) {
          country = component.long_name;
        }
      }
    }

    return {
      placeId,
      name: place.name || city,
      fullAddress: place.formatted_address || '',
      city,
      region,
      country,
      lat: place.geometry?.location?.lat(),
      lng: place.geometry?.location?.lng(),
    };
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
};

/**
 * البحث العام عن أي مكان (عناوين، أحياء، شوارع، مباني...)
 */
export const searchPlaces = async (
  query: string,
  countryCode: string = 'sa'
): Promise<CityResult[]> => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const trimmedQuery = query.trim();
  const cacheKey = `place_${trimmedQuery.toLowerCase()}_${countryCode}`;

  // التحقق من الكاش
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.results;
  }

  // التحقق من توفر Google Places
  if (!isGooglePlacesAvailable()) {
    console.log('Google Places not available, using fallback');
    return searchCitiesFallback(trimmedQuery);
  }

  const service = getAutocompleteService();
  if (!service) {
    return searchCitiesFallback(trimmedQuery);
  }

  try {
    const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>(
      (resolve, reject) => {
        service.getPlacePredictions(
          {
            input: trimmedQuery,
            // بدون قيد types للبحث عن أي شيء
            componentRestrictions: { country: countryCode },
            language: 'ar',
          },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              resolve([]);
            } else {
              reject(new Error(`Places API error: ${status}`));
            }
          }
        );
      }
    );

    const placeResults: CityResult[] = predictions.map((prediction) => {
      const mainText = prediction.structured_formatting.main_text;
      const secondaryText = prediction.structured_formatting.secondary_text || '';
      
      const parts = secondaryText.split('،').map(p => p.trim());
      const region = parts.length > 1 ? parts[0] : undefined;
      const country = parts.length > 0 ? parts[parts.length - 1] : 'المملكة العربية السعودية';

      return {
        placeId: prediction.place_id,
        name: mainText,
        fullAddress: prediction.description,
        city: mainText,
        region,
        country,
      };
    });

    // تخزين في الكاش
    cache.set(cacheKey, { results: placeResults, timestamp: Date.now() });

    return placeResults;
  } catch (error) {
    console.error('Error searching places:', error);
    return searchCitiesFallback(trimmedQuery);
  }
};

/**
 * الحصول على الموقع الحالي باستخدام GPS
 */
export const getCurrentLocation = (): Promise<{ lat: number; lng: number } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
};

/**
 * تحويل الإحداثيات إلى عنوان (Reverse Geocoding)
 */
export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<CityResult | null> => {
  if (!isGooglePlacesAvailable()) {
    return null;
  }

  try {
    const geocoder = new google.maps.Geocoder();
    
    const result = await new Promise<google.maps.GeocoderResult | null>(
      (resolve, reject) => {
        geocoder.geocode(
          { 
            location: { lat, lng },
            language: 'ar',
          },
          (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
              resolve(results[0]);
            } else {
              reject(new Error(`Geocoder error: ${status}`));
            }
          }
        );
      }
    );

    if (!result) return null;

    // استخراج المعلومات من العنوان
    let city = '';
    let region = '';
    let country = 'المملكة العربية السعودية';

    for (const component of result.address_components) {
      if (component.types.includes('locality')) {
        city = component.long_name;
      } else if (component.types.includes('administrative_area_level_2')) {
        if (!city) city = component.long_name;
      } else if (component.types.includes('administrative_area_level_1')) {
        region = component.long_name;
      } else if (component.types.includes('country')) {
        country = component.long_name;
      }
    }

    return {
      placeId: result.place_id,
      name: city || result.formatted_address.split('،')[0],
      fullAddress: result.formatted_address,
      city: city || result.formatted_address.split('،')[0],
      region,
      country,
      lat,
      lng,
    };
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
};

/**
 * مسح الكاش
 */
export const clearPlacesCache = (): void => {
  cache.clear();
};

/**
 * الحصول على المدن الافتراضية
 */
export const getDefaultCities = (): CityResult[] => {
  return DEFAULT_SAUDI_CITIES.map(city => ({
    placeId: `default_${city}`,
    name: city,
    fullAddress: `${city}، المملكة العربية السعودية`,
    city,
    country: 'المملكة العربية السعودية',
  }));
};

// Declare google namespace for TypeScript
declare global {
  interface Window {
    google: typeof google;
  }
}

