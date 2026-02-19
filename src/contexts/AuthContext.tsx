import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
// eslint-disable-next-line react-refresh/only-export-components
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserRole, Profile } from '../types/index';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 30 minutes in milliseconds
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error.message);
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
    } finally {
      // Always clear local state even if supabase errors
      setSession(null);
      setUser(null);
      setRole(null);
      setLoading(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (user) {
      timerRef.current = setTimeout(() => {
        console.log('User inactive for too long, signing out...');
        signOut();
      }, INACTIVITY_TIMEOUT);
    }
  }, [user, signOut]);

  // Handle user activity to reset timer
  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      resetTimer();
    };

    // Events to listen for
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    // Add listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Initial timer start
    resetTimer();

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, resetTimer]);

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      } else {
        return (data as Profile)?.role ?? null;
      }
    } catch (error) {
      console.error('Unexpected error fetching role:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function handleSession(currentSession: Session | null) {
      if (!mounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        // Check allowed emails
        const allowedEmailsStr = import.meta.env.VITE_ALLOWED_EMAILS;
        if (allowedEmailsStr && currentSession.user.email) {
          const allowedEmails = allowedEmailsStr.split(',').map((email: string) => email.trim());
          if (!allowedEmails.includes(currentSession.user.email)) {
            console.warn(`Email ${currentSession.user.email} is not in the allowed list.`);
            await signOut();
            if (mounted) alert("Access Denied: Your email is not authorized.");
            return;
          }
        }

        const userRole = await fetchUserRole(currentSession.user.id);
        if (mounted) {
          setRole(userRole);
          setLoading(false);
        }
      } else {
        if (mounted) {
          setRole(null);
          setLoading(false);
        }
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      handleSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole, signOut]);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      },
    });

    if (error) {
      console.error('Error signing in with Google:', error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  ) as React.ReactElement;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
