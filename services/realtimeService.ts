// ==========================================
// Realtime Service - خدمة التحديثات الفورية
// ==========================================
// هذه الخدمة توفر subscriptions حقيقية للتحديثات الفورية
// بدلاً من polling

import { supabase } from "./supabaseClient.ts";
import { Offer as _Offer, Request as _Request } from "../types.ts";
import { logger } from "../utils/logger.ts";

// ==========================================
// Types
// ==========================================

export interface RealtimeOffer {
  id: string;
  request_id: string;
  provider_id: string;
  provider_name: string;
  title: string;
  price?: string;
  status: string;
  created_at: string;
}

export interface RealtimeRequest {
  id: string;
  author_id: string;
  title: string;
  description: string;
  status: string;
  location?: string;
  categories?: string[];
  created_at: string;
}

// ==========================================
// Subscribe to New Offers on My Requests
// ==========================================

/**
 * الاشتراك في العروض الجديدة على طلباتي
 * يستخدم لإظهار العروض فوراً لصاحب الطلب
 */
export function subscribeToOffersForMyRequests(
  requestIds: string[],
  onNewOffer: (offer: RealtimeOffer, requestId: string) => void,
  onOfferUpdate?: (offer: RealtimeOffer, requestId: string) => void,
  onOfferDelete?: (offerId: string, requestId: string) => void,
) {
  if (!requestIds || requestIds.length === 0) {
    return () => {}; // No-op cleanup
  }

  // Create a channel for all requests
  const channel = supabase
    .channel("offers-for-my-requests")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "offers",
      },
      async (payload) => {
        const offer = payload.new as RealtimeOffer;
        // Check if this offer is for one of our requests
        if (requestIds.includes(offer.request_id)) {
          logger.log("🔔 New offer received:", offer.id);
          onNewOffer(offer, offer.request_id);
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "offers",
      },
      async (payload) => {
        const offer = payload.new as RealtimeOffer;
        if (requestIds.includes(offer.request_id) && onOfferUpdate) {
          logger.log("🔔 Offer updated:", offer.id);
          onOfferUpdate(offer, offer.request_id);
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "offers",
      },
      async (payload) => {
        const oldOffer = payload.old as RealtimeOffer;
        if (requestIds.includes(oldOffer.request_id) && onOfferDelete) {
          logger.log("🔔 Offer deleted:", oldOffer.id);
          onOfferDelete(oldOffer.id, oldOffer.request_id);
        }
      },
    )
    .subscribe((status) => {
      logger.log("📡 Offers subscription status:", status);
    });

  return () => {
    logger.log("🔌 Unsubscribing from offers");
    supabase.removeChannel(channel);
  };
}

// ==========================================
// Subscribe to My Offer Status Changes
// ==========================================

/**
 * الاشتراك في تغييرات حالة عروضي
 * يستخدم لإظهار قبول/رفض العرض فوراً للمزود
 */
export function subscribeToMyOfferStatusChanges(
  offerIds: string[],
  onStatusChange: (offer: RealtimeOffer) => void,
) {
  if (!offerIds || offerIds.length === 0) {
    return () => {};
  }

  const channel = supabase
    .channel("my-offer-status")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "offers",
      },
      (payload) => {
        const offer = payload.new as RealtimeOffer;
        const oldOffer = payload.old as RealtimeOffer;

        // Check if this is one of our offers AND status changed
        if (offerIds.includes(offer.id) && offer.status !== oldOffer.status) {
          logger.log("🔔 My offer status changed:", offer.id, offer.status);
          onStatusChange(offer);
        }
      },
    )
    .subscribe((status) => {
      logger.log("📡 My offers status subscription:", status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

// ==========================================
// Subscribe to New Requests Matching Interests
// ==========================================

/**
 * الاشتراك في الطلبات الجديدة المطابقة لاهتماماتي
 * يستخدم لإظهار الطلبات الجديدة فوراً في "اهتماماتي"
 */
export function subscribeToInterestingRequests(
  userId: string,
  onNewRequest: (request: RealtimeRequest) => void,
) {
  const channel = supabase
    .channel(`interesting-requests-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "requests",
      },
      async (payload) => {
        const request = payload.new as RealtimeRequest;

        // Don't notify about own requests
        if (request.author_id === userId) return;

        // Only active public requests
        if (request.status !== "active") return;

        logger.log("🔔 New interesting request:", request.id);
        onNewRequest(request);
      },
    )
    .subscribe((status) => {
      logger.log("📡 Interesting requests subscription:", status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

// ==========================================
// Subscribe to Request Status Changes
// ==========================================

/**
 * الاشتراك في تغييرات حالة الطلبات
 * يستخدم لتحديث حالة الطلب فوراً
 */
export function subscribeToRequestStatusChanges(
  requestIds: string[],
  onStatusChange: (
    request: { id: string; status: string; accepted_offer_id?: string },
  ) => void,
) {
  if (!requestIds || requestIds.length === 0) {
    return () => {};
  }

  const channel = supabase
    .channel("request-status-changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "requests",
      },
      (payload) => {
        const request = payload.new as any;
        const oldRequest = payload.old as any;

        if (
          requestIds.includes(request.id) &&
          request.status !== oldRequest.status
        ) {
          logger.log("🔔 Request status changed:", request.id, request.status);
          onStatusChange({
            id: request.id,
            status: request.status,
            accepted_offer_id: request.accepted_offer_id,
          });
        }
      },
    )
    .subscribe((status) => {
      logger.log("📡 Request status subscription:", status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

// ==========================================
// Combined Subscription Manager
// ==========================================

/**
 * مدير الاشتراكات الموحد
 * يسهل إدارة جميع الاشتراكات في مكان واحد
 */
export class RealtimeManager {
  private cleanupFunctions: (() => void)[] = [];

  subscribeToOffersForRequests(
    requestIds: string[],
    onNewOffer: (offer: RealtimeOffer, requestId: string) => void,
    onOfferUpdate?: (offer: RealtimeOffer, requestId: string) => void,
  ) {
    const cleanup = subscribeToOffersForMyRequests(
      requestIds,
      onNewOffer,
      onOfferUpdate,
    );
    this.cleanupFunctions.push(cleanup);
    return cleanup;
  }

  subscribeToMyOfferStatus(
    offerIds: string[],
    onStatusChange: (offer: RealtimeOffer) => void,
  ) {
    const cleanup = subscribeToMyOfferStatusChanges(offerIds, onStatusChange);
    this.cleanupFunctions.push(cleanup);
    return cleanup;
  }

  subscribeToInterests(
    userId: string,
    onNewRequest: (request: RealtimeRequest) => void,
  ) {
    const cleanup = subscribeToInterestingRequests(userId, onNewRequest);
    this.cleanupFunctions.push(cleanup);
    return cleanup;
  }

  subscribeToRequestStatus(
    requestIds: string[],
    onStatusChange: (request: { id: string; status: string }) => void,
  ) {
    const cleanup = subscribeToRequestStatusChanges(requestIds, onStatusChange);
    this.cleanupFunctions.push(cleanup);
    return cleanup;
  }

  unsubscribeAll() {
    logger.log("🔌 Cleaning up all realtime subscriptions");
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager();
