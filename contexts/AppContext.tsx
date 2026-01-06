import React, { createContext, useContext, ReactNode } from 'react';
import { Request, Offer, Notification, UserPreferences } from '../types';

interface AppContextType {
  // Data
  myRequests: Request[];
  allRequests: Request[];
  interestsRequests: Request[];
  myOffers: Offer[];
  receivedOffersMap: Map<string, Offer[]>;
  archivedRequests: Request[];
  archivedOffers: Offer[];
  notifications: Notification[];
  userPreferences: UserPreferences;
  
  // Setters
  setMyRequests: (requests: Request[]) => void;
  setAllRequests: (requests: Request[]) => void;
  setInterestsRequests: (requests: Request[]) => void;
  setMyOffers: (offers: Offer[]) => void;
  setReceivedOffersMap: (map: Map<string, Offer[]>) => void;
  setArchivedRequests: (requests: Request[]) => void;
  setArchivedOffers: (offers: Offer[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  setUserPreferences: (prefs: UserPreferences) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children, value }: { children: ReactNode; value: AppContextType }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}

