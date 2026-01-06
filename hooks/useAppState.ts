import { useState, useRef, useEffect } from 'react';
import { AppMode, ViewState, Request, Offer, UserPreferences } from '../types';

export function useAppState() {
  const [mode, setMode] = useState<AppMode>("requests");
  const [view, setView] = useState<ViewState>("marketplace");
  const [previousView, setPreviousView] = useState<ViewState | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [requestToEdit, setRequestToEdit] = useState<Request | null>(null);
  const [offerToEdit, setOfferToEdit] = useState<{ offer: Offer; request: Request } | null>(null);
  const [scrollToOfferSection, setScrollToOfferSection] = useState(false);
  const [highlightOfferId, setHighlightOfferId] = useState<string | null>(null);

  // Save state when switching modes
  const [savedOffersModeState, setSavedOffersModeState] = useState<{
    view: ViewState;
    selectedRequest: Request | null;
    scrollToOfferSection: boolean;
  } | null>(null);
  const [savedRequestsModeState, setSavedRequestsModeState] = useState<{
    view: ViewState;
  } | null>(null);

  return {
    mode, setMode,
    view, setView,
    previousView, setPreviousView,
    selectedRequest, setSelectedRequest,
    requestToEdit, setRequestToEdit,
    offerToEdit, setOfferToEdit,
    scrollToOfferSection, setScrollToOfferSection,
    highlightOfferId, setHighlightOfferId,
    savedOffersModeState, setSavedOffersModeState,
    savedRequestsModeState, setSavedRequestsModeState,
  };
}

export function useScrollPersistence() {
  const [marketplaceScrollPos, setMarketplaceScrollPos] = useState(() => {
    const saved = localStorage.getItem("abeely_marketplace_scroll");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [requestsModeScrollPos, setRequestsModeScrollPos] = useState(() => {
    const saved = localStorage.getItem("abeely_requests_scroll");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [requestDetailScrollPos, setRequestDetailScrollPos] = useState(() => {
    const saved = localStorage.getItem("abeely_requestdetail_scroll");
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem("abeely_marketplace_scroll", marketplaceScrollPos.toString());
  }, [marketplaceScrollPos]);

  useEffect(() => {
    localStorage.setItem("abeely_requests_scroll", requestsModeScrollPos.toString());
  }, [requestsModeScrollPos]);

  useEffect(() => {
    localStorage.setItem("abeely_requestdetail_scroll", requestDetailScrollPos.toString());
  }, [requestDetailScrollPos]);

  return {
    marketplaceScrollPos, setMarketplaceScrollPos,
    requestsModeScrollPos, setRequestsModeScrollPos,
    requestDetailScrollPos, setRequestDetailScrollPos,
  };
}

