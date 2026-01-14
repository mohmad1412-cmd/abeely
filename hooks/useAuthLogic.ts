import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabaseClient.ts";
import { logger } from "../utils/logger.ts";
import { AppView } from "../types.ts";
import {
  getCurrentUser,
  signOut,
  UserProfile,
} from "../services/authService.ts";
import { checkOnboardingStatus } from "../services/onboardingService.ts";
import { checkSupabaseConnection } from "../services/requestsService.ts";
import { parseRoute } from "../services/routingService.ts";
import {
  initPushNotifications,
  refreshPushToken,
} from "../services/pushNotificationService.ts";

export const useAuthLogic = () => {
  // ==========================================
  // Auth State
  // ==========================================
  const [appView, setAppView] = useState<AppView>("splash");
  const [user, setUser] = useState<UserProfile | null>(null);
  // مهم: داخل useEffect([]) (مثل onAuthStateChange) قد تكون قيمة user قديمة (stale closure)
  // لذا نحتفظ بآخر user في ref لاستخدامه وقت الأحداث.
  const userRef = useRef<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Keep ref updated with latest user
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // ==========================================
  // Auth Flow & Initialization
  // ==========================================
  const initializeAuth = async () => {
    try {
      let isMounted = true;

      // تحقق سريع من الرابط لمعرفة هل هو OAuth redirect؟
      if (
        window.location.search.includes("code=") ||
        window.location.hash.includes("access_token")
      ) {
        logger.log(
          "🔄 Detected OAuth redirect params",
          undefined,
          "useAuthLogic",
        );
        setIsProcessingOAuth(true);
        // لا نقلل loading هنا وننتظر Supabase لمعالجة الـ URL
      }

      // Check current session
      const { data: { session: initialSession }, error: initialError } =
        await supabase.auth.getSession();

      let session = initialSession;

      // محاولة استعادة الجلسة إذا كان هناك خطأ
      if (initialError || !initialSession?.user) {
        // Retry logic...
        // logger.warn("Initial session check failed or empty", initialError);
        // يمكن إضافة منطق إعادة المحاولة هنا إذا لزم الأمر
        // ولكن Supabase client عادة ما يعالج هذا تلقائياً عند التحديث

        // إذا كان هناك خطأ في الشبكة، قد نحتاج لمحاولة أخرى
        if (initialError?.message?.includes("fetch")) {
          // logger.warn("Network error checking session, retrying...");
          // انتظر قليلاً
          await new Promise((resolve) => setTimeout(resolve, 500));

          // التحقق مرة أخرى من session
          const { data: { session: retrySession }, error: retryError } =
            await supabase.auth.getSession();
          if (!retryError && retrySession?.user) {
            session = retrySession;
          }
        }
      }

      if (session?.user && isMounted) {
        // Session found, loading profile...
        const profile = await getCurrentUser();
        if (profile && isMounted) {
          setUser(profile);
        }
        setIsGuest(false);
        localStorage.removeItem("abeely_guest_mode");
        setAppView("main");
        setAuthLoading(false);

        // تنظيف URL إذا كان فيه OAuth params
        if (
          window.location.search.includes("code=") ||
          window.location.hash.includes("access_token")
        ) {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname || "/",
          );
        }
        return;
      }

      // التحقق من force_auth_view flag أولاً
      const forceAuthView = sessionStorage.getItem("force_auth_view") === "true";
      if (forceAuthView && isMounted) {
        // المستخدم يريد الانتقال إلى صفحة auth بشكل صريح
        sessionStorage.removeItem("force_auth_view");
        setAppView("auth");
        setAuthLoading(false);
        return;
      }

      // تحقق من وجود guest mode محفوظ
      const isGuestSaved = localStorage.getItem("abeely_guest_mode") === "true";
      if (isGuestSaved && isMounted) {
        setIsGuest(true);
        setAppView("main");
        setAuthLoading(false);
        return;
      }

      // تحقق من نوع الرابط - الصفحات العامة تدخل كضيف
      const route = parseRoute();
      const isPublicRoute = route.type === "request" ||
        route.type === "marketplace" ||
        route.type === "home" ||
        route.type === "create";

      if (isPublicRoute && isMounted) {
        setIsGuest(true);
        localStorage.setItem("abeely_guest_mode", "true");
        setAppView("main");
        setAuthLoading(false);
      } else if (isMounted) {
        // No session found, but we wait for onAuthStateChange to confirm
        // instead of switching to 'auth' immediately (prevents flash)
        setTimeout(() => {
          if (isMounted && !userRef.current && appView === "splash") {
            // التحقق مرة أخيرة من session قبل عرض صفحة auth
            supabase.auth.getSession().then(
              ({ data: { session: finalSession } }) => {
                if (
                  isMounted && !finalSession?.user && appView === "splash"
                ) {
                  // التحقق من force_auth_view flag أولاً
                  const forceAuthView = sessionStorage.getItem("force_auth_view") === "true";
                  if (forceAuthView) {
                    // المستخدم يريد الانتقال إلى صفحة auth بشكل صريح
                    sessionStorage.removeItem("force_auth_view");
                    setAppView("auth");
                    setAuthLoading(false);
                    return;
                  }
                  
                  // التحقق من guest mode قبل عرض auth
                  const isGuestSaved =
                    localStorage.getItem("abeely_guest_mode") === "true";
                  if (isGuestSaved) {
                    setIsGuest(true);
                    setAppView("main");
                    setAuthLoading(false);
                  } else {
                    const route = parseRoute();
                    const isPublicRoute = route.type === "request" ||
                      route.type === "marketplace" ||
                      route.type === "home" ||
                      route.type === "create";

                    if (isPublicRoute) {
                      setIsGuest(true);
                      localStorage.setItem("abeely_guest_mode", "true");
                      setAppView("main");
                      setAuthLoading(false);
                    } else {
                      // console.log(
                      //   "⚠️ No session after waiting, showing auth page",
                      // );
                      setAppView("auth");
                      setAuthLoading(false);
                    }
                  }
                } else if (
                  isMounted && finalSession?.user && appView === "splash"
                ) {
                  // console.log("✅ Session found in final check!");
                  // سيتم التعامل معها في onAuthStateChange
                }
              },
            );
          }
        }, 800); // 800ms is enough to confirm no session exists
      }
    } catch (err) {
      logger.error("Auth init error", err, "useAuthLogic");
      setIsProcessingOAuth(false);
      setAppView("auth");
    } finally {
      // لا نعطل authLoading هنا إلا إذا اتخذنا قراراً نهائياً
      // نترك authLoading = true حتى يأتي onAuthStateChange
      // هذا يضمن عدم عرض صفحة auth قبل التأكد التام
      setIsProcessingOAuth(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // الاستماع لتغييرات حالة المصادقة - هذا هو المكان الرئيسي لمعالجة OAuth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // التحقق من force_auth_view flag أولاً - إذا كان موجوداً، لا نعيد تعيين appView
        const forceAuthView = sessionStorage.getItem("force_auth_view") === "true";
        if (forceAuthView) {
          // المستخدم يريد البقاء في صفحة auth - لا نعيد تعيين appView إلا إذا كان هناك session
          if (!session?.user) {
            // لا يوجد session - نبقى في صفحة auth
            return;
          }
          // إذا كان هناك session، نزيل الـ flag ونكمل العملية الطبيعية
          sessionStorage.removeItem("force_auth_view");
        }
        
        // فقط نطبع log إذا كان هناك session أو حدث مهم
        if (
          session?.user ||
          (event !== "INITIAL_SESSION" && event !== "TOKEN_REFRESHED")
        ) {
          logger.log("Auth state changed", {
            event,
            email: session?.user?.email || "no session",
          }, "useAuthLogic");
        }

        // معالجة حالة SIGNED_IN بدون session - محاولة جلب session يدوياً
        if (
          event === "SIGNED_IN" &&
          !session?.user &&
          isMounted
        ) {
          // SIGNED_IN event but no session - attempting to get session...
          try {
            const { data: { session: newSession }, error: sessionError } =
              await supabase.auth.getSession();
            if (newSession?.user && !sessionError) {
              // Successfully retrieved session
              // استخدام session الجديدة
              session = newSession;
            } else {
              logger.warn(
                "Failed to get session",
                sessionError,
                "useAuthLogic",
              );
              // الانتقال إلى guest mode إذا لم يتم جلب session
              setIsGuest(true);
              setAuthLoading(false);
              return;
            }
          } catch (err) {
            logger.error("Error getting session", err, "useAuthLogic");
            setIsGuest(true);
            setAuthLoading(false);
            return;
          }
        }

        if (
          (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
          session?.user && isMounted
        ) {
          // User signed in

          // تنظيف sessionStorage
          sessionStorage.removeItem("oauth_code_processed");
          setIsGuest(false);
          localStorage.removeItem("abeely_guest_mode");
          setIsProcessingOAuth(false);
          setAuthLoading(false);

          // تنظيف URL
          if (
            window.location.search.includes("code=") ||
            window.location.hash.includes("access_token")
          ) {
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname || "/",
            );
          }

          // تحميل الـ profile والتحقق من الـ onboarding
          getCurrentUser().then(async (profile) => {
            // Profile loaded
            if (profile && isMounted) {
              setUser(profile);

              // التحقق إذا كان المستخدم جديداً ويحتاج الـ onboarding
              // Checking onboarding status...
              const needsOnboard = await checkOnboardingStatus(
                profile.id,
                profile,
              );
              // Onboarding result check...
              if (needsOnboard && isMounted) {
                // New user detected
                setNeedsOnboarding(true);
                setIsNewUser(true);
                setAppView("onboarding");
              } else {
                // User does not need onboarding
                setAppView("main");
              }
            } else {
              // No profile found
              setAppView("main");
            }
          }).catch((err) => {
            logger.error("❌ Error loading profile:", err, "useAuthLogic");
            setAppView("main");
          });
          return; // منع setAppView("main") أدناه
        } else if (event === "TOKEN_REFRESHED" && session?.user && isMounted) {
          // تحديث الـ profile فقط - لا تسجيل خروج!
          // Token refreshed, updating profile...
          const profile = await getCurrentUser();
          if (profile && isMounted) {
            setUser(profile);
          }
        } else if (event === "SIGNED_OUT" && isMounted) {
          // التحقق إذا كان تسجيل خروج صريح من المستخدم
          // Auth event: SIGNED_OUT

          // فقط نطبق SIGNED_OUT إذا كان هناك explicit_signout
          // هذا يمنع تسجيل الخروج بسبب أخطاء مؤقتة في Supabase (مثل refresh token)
          const isExplicitSignOut = sessionStorage.getItem("explicit_signout");

          if (!isExplicitSignOut) {
            // ليس تسجيل خروج صريح - تحقق من وجود session فعلي
            // SIGNED_OUT event but no explicit signout, checking session...
            try {
              const { data: { session: currentSession } } = await supabase.auth
                .getSession();
              if (currentSession?.user) {
                // Session still exists, ignoring SIGNED_OUT event
                // الجلسة ما زالت موجودة - تجاهل الحدث
                return;
              }
            } catch (e) {
              logger.error("Error checking session:", e, "useAuthLogic");
              // في حالة الخطأ، أيضاً نتجاهل الحدث (آمن أكثر)
              return;
            }

            // محاولة تجديد الجلسة إذا لم تكن موجودة
            try {
              await new Promise((resolve) => setTimeout(resolve, 100)); // Faster retry
              const { data: refreshed, error: refreshError } = await supabase
                .auth.refreshSession();
              if (refreshError) {
                const message = refreshError.message?.toLowerCase() || "";
                if (message.includes("fetch") || message.includes("network")) {
                  logger.warn(
                    "Network issue refreshing session, ignoring SIGNED_OUT",
                    undefined,
                    "useAuthLogic",
                  );
                  return;
                }
                logger.error(
                  "Error refreshing session:",
                  refreshError,
                  "useAuthLogic",
                );
              }
              if (refreshed?.session?.user) {
                logger.log(
                  "✅ Session refreshed, ignoring SIGNED_OUT event",
                  undefined,
                  "useAuthLogic",
                );
                const profile = await getCurrentUser();
                if (profile && isMounted) {
                  setUser(profile);
                }
                return;
              }
            } catch (e) {
              logger.error(
                "Error attempting session refresh:",
                e,
                "useAuthLogic",
              );
              return;
            }
          }

          // تسجيل خروج فعلي (فقط إذا كان explicit أو لا يوجد session)
          // Applying sign out
          sessionStorage.removeItem("explicit_signout");
          setUser(null);
          setIsGuest(false);
          setAppView("auth");
        } else if (event === "USER_UPDATED" && session?.user && isMounted) {
          // تحديث بيانات المستخدم
          const profile = await getCurrentUser();
          if (profile && isMounted) {
            setUser(profile);
          }
        } else if (event === "INITIAL_SESSION" && !session?.user && isMounted) {
          // 🚀 FIX: معالجة INITIAL_SESSION بدون session
          // هذا مهم عند إعادة التحميل عندما لا يوجد session
          // نتحقق مرة أخرى للتأكد التام قبل عرض صفحة auth
          // INITIAL_SESSION without session, verifying...

          // انتظر قليلاً للسماح لـ Supabase بمعالجة أي session محفوظة
          await new Promise((resolve) => setTimeout(resolve, 100));

          // التحقق النهائي من session
          const { data: { session: finalSession } } = await supabase.auth
            .getSession();

          if (finalSession?.user && isMounted) {
            // Session موجود! تحميل profile
            // Session found in INITIAL_SESSION handler!
            const profile = await getCurrentUser();
            if (profile && isMounted) {
              setUser(profile);
              setIsGuest(false);
              localStorage.removeItem("abeely_guest_mode");
              setAppView("main");
              setAuthLoading(false);
            }
          } else if (isMounted) {
            // التحقق من force_auth_view flag أولاً
            const forceAuthView = sessionStorage.getItem("force_auth_view") === "true";
            if (forceAuthView) {
              // المستخدم يريد الانتقال إلى صفحة auth بشكل صريح
              sessionStorage.removeItem("force_auth_view");
              setAppView("auth");
              setAuthLoading(false);
              return;
            }
            
            // التحقق من force_auth_view flag مرة أخرى قبل إعادة تعيين appView
            const forceAuthViewCheck = sessionStorage.getItem("force_auth_view") === "true";
            if (forceAuthViewCheck) {
              // المستخدم يريد البقاء في صفحة auth
              setAppView("auth");
              setAuthLoading(false);
              return;
            }
            
            // لا يوجد session فعلاً - تحقق من guest mode أو route
            const isGuestSaved =
              localStorage.getItem("abeely_guest_mode") === "true";
            if (isGuestSaved) {
              setIsGuest(true);
              setAppView("main");
              setAuthLoading(false);
            } else {
              const route = parseRoute();
              const isPublicRoute = route.type === "request" ||
                route.type === "marketplace" ||
                route.type === "home" ||
                route.type === "create";

              if (isPublicRoute) {
                setIsGuest(true);
                localStorage.setItem("abeely_guest_mode", "true");
                setAppView("main");
                setAuthLoading(false);
              } else {
                // لا يوجد session ولا guest mode - عرض صفحة auth
                // No session confirmed, showing auth page
                setAppView("auth");
                setAuthLoading(false);
              }
            }
          }
        }
      },
    );

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [appView]); // Check if appView dependency is correct/needed here - kept from original code slightly adapted

  // ==========================================
  // Push Notifications Initialization
  // ==========================================
  useEffect(() => {
    // تهيئة Push Notifications فقط للمستخدمين المسجلين
    if (appView === "main" && user?.id) {
      initPushNotifications().then(() => {
        // تحديث token بعد التهيئة (في حالة تسجيل الدخول)
        refreshPushToken();
      });
    }
  }, [appView, user?.id]);

  // ==========================================
  // Splash Screen Complete Handler
  // ==========================================
  const handleSplashComplete = useCallback(() => {
    // إذا كنا نعالج OAuth callback، لا تنتقل لـ auth
    if (authLoading || isProcessingOAuth) {
      // Splash complete but still loading auth or processing OAuth...
      return false;
    }

    if (user) {
      setAppView("main");
    } else if (isGuest) {
      setAppView("main");
    } else {
      setAppView("auth");
    }
  }, [authLoading, user, isGuest, isProcessingOAuth]);

  // ==========================================
  // Connection Retry Handler
  // ==========================================
  const handleConnectionRetry = async () => {
    setIsRetrying(true);
    setConnectionError(null);

    try {
      // Try to check connection first
      const isConnected = await checkSupabaseConnection();

      if (isConnected) {
        // Connection restored, try to get session again
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const profile = await getCurrentUser();
          if (profile) {
            setUser(profile);
            setIsGuest(false);
            setAppView("main");
          } else {
            setAppView("auth");
          }
        } else {
          // Check if was guest before
          const wasGuest = localStorage.getItem("abeely_guest_mode") === "true";
          if (wasGuest) {
            setIsGuest(true);
            setAppView("main");
          } else {
            setAppView("auth");
          }
        }
      } else {
        setConnectionError("الخدمة غير متاحة حالياً. يرجى المحاولة بعد قليل.");
        setAppView("connection-error");
      }
    } catch (err: unknown) {
      logger.error("Retry connection error:", err, "useAuthLogic");
      setConnectionError("لم نتمكن من الاتصال. تأكد من اتصالك بالإنترنت.");
      setAppView("connection-error");
    } finally {
      setIsRetrying(false);
    }
  };

  // Handle entering guest mode from connection error
  const handleGuestModeFromError = () => {
    setIsGuest(true);
    localStorage.setItem("abeely_guest_mode", "true");
    setConnectionError(null);
    setAppView("main");
  };

  return {
    appView,
    setAppView,
    user,
    setUser,
    userRef,
    isGuest,
    setIsGuest,
    authLoading,
    connectionError,
    setConnectionError,
    isRetrying,
    isProcessingOAuth,
    needsOnboarding,
    setNeedsOnboarding,
    isNewUser,
    setIsNewUser,
    handleSplashComplete,
    handleConnectionRetry,
    handleGuestModeFromError,
  };
};
