import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '../services/supabaseClient';
import {
  UserProfile,
  getCurrentUser,
  signOut as authSignOut,
  onAuthStateChange,
} from '../services/authService';

// Types
export interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  setGuestMode: (isGuest: boolean) => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Create context
export const AuthContext = createContext<AuthContextType | null>(null);

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for auth provider (internal use)
export function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const profile = await getCurrentUser();
      setUser(profile);
      if (profile) {
        setIsGuest(false);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      try {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const profile = await getCurrentUser();
          setUser(profile);
          setIsGuest(false);
        } else {
          // Check if guest mode was previously set
          const wasGuest = localStorage.getItem('abeely_guest_mode') === 'true';
          setIsGuest(wasGuest);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange(async (authUser) => {
      if (authUser) {
        const profile = await getCurrentUser();
        setUser(profile);
        setIsGuest(false);
        localStorage.removeItem('abeely_guest_mode');
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Set guest mode
  const setGuestMode = useCallback((guest: boolean) => {
    setIsGuest(guest);
    if (guest) {
      localStorage.setItem('abeely_guest_mode', 'true');
    } else {
      localStorage.removeItem('abeely_guest_mode');
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    await authSignOut();
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem('abeely_guest_mode');
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isGuest,
    setGuestMode,
    signOut,
    refreshUser,
  };
}

