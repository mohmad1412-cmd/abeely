/// <reference types="google.maps" />
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
  placeType?: string; // نوع المكان الأصلي من Google
  placeTypeArabic?: string; // نوع المكان بالعربي
}

/**
 * تحويل أنواع Google Places إلى أسماء عربية
 */
const PLACE_TYPE_ARABIC_MAP: Record<string, string> = {
  // الشوارع والطرق
  "route": "شارع",
  "street_address": "شارع",
  "intersection": "تقاطع",
  "highway": "طريق سريع",

  // الأحياء والمناطق
  "sublocality": "حي",
  "sublocality_level_1": "حي",
  "sublocality_level_2": "حي فرعي",
  "neighborhood": "حي",

  // المدن والمحافظات
  "locality": "مدينة",
  "administrative_area_level_1": "منطقة",
  "administrative_area_level_2": "محافظة",
  "administrative_area_level_3": "مركز",

  // المعالم والأماكن المهمة
  "point_of_interest": "معلم",
  "natural_feature": "معلم طبيعي",
  "park": "حديقة",
  "tourist_attraction": "معلم سياحي",
  "museum": "متحف",
  "stadium": "ملعب",
  "university": "جامعة",
  "school": "مدرسة",
  "hospital": "مستشفى",
  "airport": "مطار",
  "train_station": "محطة قطار",
  "bus_station": "محطة حافلات",
  "subway_station": "محطة مترو",

  // المحلات والمؤسسات التجارية
  "establishment": "مؤسسة",
  "store": "محل",
  "shopping_mall": "مول تجاري",
  "supermarket": "سوبرماركت",
  "grocery_or_supermarket": "بقالة",
  "convenience_store": "بقالة",
  "clothing_store": "محل ملابس",
  "electronics_store": "محل إلكترونيات",
  "furniture_store": "محل أثاث",
  "hardware_store": "محل أدوات",
  "home_goods_store": "محل مستلزمات منزلية",
  "jewelry_store": "محل مجوهرات",
  "shoe_store": "محل أحذية",
  "book_store": "مكتبة",
  "pet_store": "محل حيوانات",
  "florist": "محل زهور",
  "bakery": "مخبز",
  "pharmacy": "صيدلية",
  "gas_station": "محطة وقود",
  "car_dealer": "معرض سيارات",
  "car_repair": "ورشة سيارات",
  "car_wash": "مغسلة سيارات",

  // المطاعم والمقاهي
  "restaurant": "مطعم",
  "cafe": "مقهى",
  "bar": "مقهى",
  "food": "مطعم",
  "meal_delivery": "توصيل طعام",
  "meal_takeaway": "مطعم وجبات",

  // الخدمات
  "bank": "بنك",
  "atm": "صراف آلي",
  "post_office": "بريد",
  "police": "شرطة",
  "fire_station": "إطفاء",
  "embassy": "سفارة",
  "local_government_office": "دائرة حكومية",
  "courthouse": "محكمة",
  "city_hall": "بلدية",

  // الصحة واللياقة
  "doctor": "عيادة",
  "dentist": "عيادة أسنان",
  "physiotherapist": "علاج طبيعي",
  "gym": "نادي رياضي",
  "spa": "سبا",
  "beauty_salon": "صالون تجميل",
  "hair_care": "صالون حلاقة",

  // السكن والإقامة
  "lodging": "فندق",
  "hotel": "فندق",
  "motel": "فندق",

  // الترفيه
  "movie_theater": "سينما",
  "night_club": "نادي ليلي",
  "amusement_park": "ملاهي",
  "bowling_alley": "بولينج",
  "casino": "كازينو",
  "zoo": "حديقة حيوان",
  "aquarium": "أكواريوم",

  // الديني
  "mosque": "مسجد",
  "church": "كنيسة",
  "hindu_temple": "معبد",
  "place_of_worship": "مكان عبادة",

  // المباني
  "premise": "مبنى",
  "subpremise": "شقة/وحدة",
  "building": "مبنى",
  "room": "غرفة",
  "floor": "طابق",

  // أخرى
  "parking": "موقف سيارات",
  "transit_station": "محطة",
  "real_estate_agency": "عقارات",
  "travel_agency": "وكالة سفر",
  "insurance_agency": "تأمين",
  "lawyer": "محامي",
  "accounting": "محاسب",
  "moving_company": "نقل عفش",
  "storage": "تخزين",
  "laundry": "مغسلة",
  "library": "مكتبة",
  "cemetery": "مقبرة",
  "campground": "مخيم",
  "rv_park": "موقف كرفانات",
};

/**
 * الحصول على نوع المكان بالعربي من أنواع Google
 */
const getPlaceTypeArabic = (
  types: string[],
): { type: string; arabicType: string } => {
  // ترتيب الأولوية: نبحث عن النوع الأكثر تحديداً أولاً
  const priorityOrder = [
    // محلات ومطاعم (أولوية عالية)
    "restaurant",
    "cafe",
    "store",
    "shopping_mall",
    "supermarket",
    "pharmacy",
    "gas_station",
    "bank",
    "hospital",
    "hotel",
    "mosque",
    "school",
    "university",
    "airport",
    "stadium",
    // أحياء وشوارع
    "sublocality",
    "sublocality_level_1",
    "neighborhood",
    "route",
    // مدن ومناطق
    "locality",
    "administrative_area_level_2",
    "administrative_area_level_1",
    // معالم
    "point_of_interest",
    "establishment",
  ];

  for (const priority of priorityOrder) {
    if (types.includes(priority) && PLACE_TYPE_ARABIC_MAP[priority]) {
      return { type: priority, arabicType: PLACE_TYPE_ARABIC_MAP[priority] };
    }
  }

  // البحث في كل الأنواع
  for (const type of types) {
    if (PLACE_TYPE_ARABIC_MAP[type]) {
      return { type, arabicType: PLACE_TYPE_ARABIC_MAP[type] };
    }
  }

  // نوع افتراضي
  return { type: types[0] || "unknown", arabicType: "" };
};

// مدن سعودية افتراضية للـ fallback
export const DEFAULT_SAUDI_CITIES = [
  "جميع المدن (شامل عن بعد)", // خيار جديد للبحث الشامل
  "الرياض",
  "جدة",
  "مكة المكرمة",
  "المدينة المنورة",
  "الدمام",
  "الخبر",
  "الظهران",
  "الأحساء",
  "الطائف",
  "تبوك",
  "بريدة",
  "خميس مشيط",
  "أبها",
  "حائل",
  "نجران",
  "جازان",
  "ينبع",
  "الجبيل",
  "القطيف",
  "الخرج",
  "عنيزة",
  "الباحة",
  "سكاكا",
  "عرعر",
  "القريات",
  "حفر الباطن",
  "رابغ",
  "المجمعة",
  "القنفذة",
  "بيشة",
];

// تخزين مؤقت للنتائج
const cache = new Map<string, { results: CityResult[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

// التحقق من وجود Google Places API
const isGooglePlacesAvailable = (): boolean => {
  return typeof google !== "undefined" && !!google.maps && !!google.maps.places;
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
        console.warn("Google Places API not loaded after timeout");
        resolve(false);
      }
    }, 100);
  });
};

// AutocompleteService instance
let autocompleteService: google.maps.places.AutocompleteService | null = null;
let placesService: google.maps.places.PlacesService | null = null;
let placesDiv: HTMLDivElement | null = null;

const getAutocompleteService = ():
  | google.maps.places.AutocompleteService
  | null => {
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
      placesDiv = document.createElement("div");
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
  countryCode: string = "sa",
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

  // انتظار تحميل Google Places API إذا لم يكن محمّلاً بعد
  if (!isGooglePlacesAvailable()) {
    const loaded = await waitForGooglePlaces();
    if (!loaded) {
      console.log("Google Places not available, using fallback");
      return searchCitiesFallback(trimmedQuery);
    }
  }

  const service = getAutocompleteService();
  if (!service) {
    return searchCitiesFallback(trimmedQuery);
  }

  try {
    const predictions = await new Promise<
      google.maps.places.AutocompletePrediction[]
    >(
      (resolve, reject) => {
        service.getPlacePredictions(
          {
            input: trimmedQuery,
            // البحث عن أي مكان (مدن، أحياء، شوارع...)
            componentRestrictions: { country: countryCode },
            language: "ar", // اللغة العربية
          },
          (
            results: google.maps.places.AutocompletePrediction[] | null,
            status: google.maps.places.PlacesServiceStatus,
          ) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK && results
            ) {
              resolve(results);
            } else if (
              status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
            ) {
              resolve([]);
            } else {
              reject(new Error(`Places API error: ${status}`));
            }
          },
        );
      },
    );

    const cityResults: CityResult[] = predictions.map((prediction) => {
      const mainText = prediction.structured_formatting.main_text;
      const secondaryText = prediction.structured_formatting.secondary_text ||
        "";

      // استخراج اسم المنطقة والدولة
      const parts = secondaryText.split("،").map((p) => p.trim());
      const region = parts.length > 1 ? parts[0] : undefined;
      const country = parts.length > 0
        ? parts[parts.length - 1]
        : "المملكة العربية السعودية";

      // استخراج نوع المكان بالعربي
      const { type: placeType, arabicType: placeTypeArabic } =
        getPlaceTypeArabic(prediction.types || []);

      return {
        placeId: prediction.place_id,
        name: mainText,
        fullAddress: prediction.description,
        city: mainText,
        region,
        country,
        placeType,
        placeTypeArabic,
      };
    });

    // تخزين في الكاش
    cache.set(cacheKey, { results: cityResults, timestamp: Date.now() });

    return cityResults;
  } catch (error) {
    console.error("Error searching cities:", error);
    return searchCitiesFallback(trimmedQuery);
  }
};

/**
 * البحث البديل في حالة عدم توفر Google Places
 */
const searchCitiesFallback = (query: string): CityResult[] => {
  const normalizedQuery = query.toLowerCase();

  return DEFAULT_SAUDI_CITIES
    .filter((city) => city.toLowerCase().includes(normalizedQuery))
    .map((city) => ({
      placeId: `fallback_${city}`,
      name: city,
      fullAddress: `${city}، المملكة العربية السعودية`,
      city,
      country: "المملكة العربية السعودية",
    }));
};

/**
 * الحصول على تفاصيل المكان
 */
export const getPlaceDetails = async (
  placeId: string,
): Promise<CityResult | null> => {
  if (placeId.startsWith("fallback_")) {
    const cityName = placeId.replace("fallback_", "");
    return {
      placeId,
      name: cityName,
      fullAddress: `${cityName}، المملكة العربية السعودية`,
      city: cityName,
      country: "المملكة العربية السعودية",
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
            fields: [
              "place_id",
              "name",
              "formatted_address",
              "geometry",
              "address_components",
            ],
            language: "ar",
          },
          (
            result: google.maps.places.PlaceResult | null,
            status: google.maps.places.PlacesServiceStatus,
          ) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK && result
            ) {
              resolve(result);
            } else {
              reject(new Error(`Place details error: ${status}`));
            }
          },
        );
      },
    );

    if (!place) return null;

    // استخراج المدينة والمنطقة من address_components
    let city = place.name || "";
    let region: string | undefined;
    let country = "المملكة العربية السعودية";

    if (place.address_components) {
      for (const component of place.address_components) {
        if (component.types.includes("locality")) {
          city = component.long_name;
        } else if (component.types.includes("administrative_area_level_1")) {
          region = component.long_name;
        } else if (component.types.includes("country")) {
          country = component.long_name;
        }
      }
    }

    return {
      placeId,
      name: place.name || city,
      fullAddress: place.formatted_address || "",
      city,
      region,
      country,
      lat: place.geometry?.location?.lat(),
      lng: place.geometry?.location?.lng(),
    };
  } catch (error) {
    console.error("Error getting place details:", error);
    return null;
  }
};

/**
 * البحث العام عن أي مكان (عناوين، أحياء، شوارع، مباني...)
 */
export const searchPlaces = async (
  query: string,
  countryCode: string = "sa",
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

  // انتظار تحميل Google Places API إذا لم يكن محمّلاً بعد
  if (!isGooglePlacesAvailable()) {
    const loaded = await waitForGooglePlaces();
    if (!loaded) {
      console.log("Google Places not available, using fallback");
      return searchCitiesFallback(trimmedQuery);
    }
  }

  const service = getAutocompleteService();
  if (!service) {
    return searchCitiesFallback(trimmedQuery);
  }

  try {
    const predictions = await new Promise<
      google.maps.places.AutocompletePrediction[]
    >(
      (resolve, reject) => {
        service.getPlacePredictions(
          {
            input: trimmedQuery,
            // بدون قيد types للبحث عن أي شيء
            componentRestrictions: { country: countryCode },
            language: "ar",
          },
          (
            results: google.maps.places.AutocompletePrediction[] | null,
            status: google.maps.places.PlacesServiceStatus,
          ) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK && results
            ) {
              resolve(results);
            } else if (
              status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
            ) {
              resolve([]);
            } else {
              reject(new Error(`Places API error: ${status}`));
            }
          },
        );
      },
    );

    const placeResults: CityResult[] = predictions.map((prediction) => {
      const mainText = prediction.structured_formatting.main_text;
      const secondaryText = prediction.structured_formatting.secondary_text ||
        "";

      const parts = secondaryText.split("،").map((p: string) => p.trim());
      const region = parts.length > 1 ? parts[0] : undefined;
      const country = parts.length > 0
        ? parts[parts.length - 1]
        : "المملكة العربية السعودية";

      // استخراج نوع المكان بالعربي
      const { type: placeType, arabicType: placeTypeArabic } =
        getPlaceTypeArabic(prediction.types || []);

      return {
        placeId: prediction.place_id,
        name: mainText,
        fullAddress: prediction.description,
        city: mainText,
        region,
        country,
        placeType,
        placeTypeArabic,
      };
    });

    // تخزين في الكاش
    cache.set(cacheKey, { results: placeResults, timestamp: Date.now() });

    return placeResults;
  } catch (error) {
    console.error("Error searching places:", error);
    return searchCitiesFallback(trimmedQuery);
  }
};

/**
 * الحصول على الموقع الحالي باستخدام GPS
 */
export const getCurrentLocation = (): Promise<
  { lat: number; lng: number } | null
> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported");
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
        console.error("Geolocation error:", error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  });
};

/**
 * تحويل الإحداثيات إلى عنوان (Reverse Geocoding)
 */
export const reverseGeocode = async (
  lat: number,
  lng: number,
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
            language: "ar",
          },
          (
            results: google.maps.GeocoderResult[] | null,
            status: google.maps.GeocoderStatus,
          ) => {
            if (
              status === google.maps.GeocoderStatus.OK && results &&
              results.length > 0
            ) {
              resolve(results[0]);
            } else {
              reject(new Error(`Geocoder error: ${status}`));
            }
          },
        );
      },
    );

    if (!result) return null;

    // استخراج المعلومات من العنوان
    let street = "";
    let neighborhood = "";
    let sublocality = "";
    let city = "";
    let region = "";
    let country = "المملكة العربية السعودية";

    for (const component of result.address_components) {
      if (
        component.types.includes("route") ||
        component.types.includes("street_address")
      ) {
        street = component.long_name;
      } else if (
        component.types.includes("neighborhood") ||
        component.types.includes("sublocality_level_1")
      ) {
        neighborhood = component.long_name;
      } else if (
        component.types.includes("sublocality") ||
        component.types.includes("sublocality_level_2")
      ) {
        if (!neighborhood) sublocality = component.long_name;
      } else if (component.types.includes("locality")) {
        city = component.long_name;
      } else if (component.types.includes("administrative_area_level_2")) {
        if (!city) city = component.long_name;
      } else if (component.types.includes("administrative_area_level_1")) {
        region = component.long_name;
      } else if (component.types.includes("country")) {
        country = component.long_name;
      }
    }

    // بناء اسم العرض: الشارع، الحي، المدينة (بدون السعودية)
    const addressParts: string[] = [];
    if (street) addressParts.push(street);
    if (neighborhood || sublocality) {
      addressParts.push(neighborhood || sublocality);
    }
    if (city) addressParts.push(city);

    const displayName = addressParts.length > 0
      ? addressParts.join("، ")
      : result.formatted_address.split("،")[0];

    return {
      placeId: result.place_id,
      name: displayName,
      fullAddress: result.formatted_address,
      city: city || result.formatted_address.split("،")[0],
      region,
      country,
      lat,
      lng,
    };
  } catch (error) {
    console.error("Reverse geocode error:", error);
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
  return DEFAULT_SAUDI_CITIES.map((city) => ({
    placeId: `default_${city}`,
    name: city,
    fullAddress: `${city}، المملكة العربية السعودية`,
    city,
    country: "المملكة العربية السعودية",
  }));
};

// Google namespace is now handled by @types/google.maps
