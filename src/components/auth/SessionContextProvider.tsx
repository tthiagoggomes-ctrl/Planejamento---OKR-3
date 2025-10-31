"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import { showSuccess, showError } from '@/utils/toast';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastShown, setToastShown] = useState(false); // Track if toast was shown
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error);
        showError("Erro ao carregar sessão.");
      }
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
      
      // Show login success message only once
      if (session && !toastShown) {
        showSuccess("Login realizado com sucesso!");
        setToastShown(true);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);

      if (_event === 'SIGNED_IN') {
        // Only show success message if we're on login page or if it hasn't been shown yet
        if ((location.pathname === '/login' || !toastShown) && session) {
          showSuccess("Login realizado com sucesso!");
          setToastShown(true);
        }
        // Redirect to dashboard if on login page
        if (location.pathname === '/login') {
          navigate('/');
        }
      } else if (_event === 'SIGNED_OUT') {
        // Reset toast shown state on logout
        setToastShown(false);
        // Redirect to login page on sign out
        navigate('/login');
      } else if (_event === 'USER_UPDATED') {
        showSuccess("Perfil atualizado com sucesso!");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname, toastShown]);

  // Redirect unauthenticated users to login page, except for the login page itself
  useEffect(() => {
    if (!loading && !session && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [loading, session, navigate, location.pathname]);

  return (
    <SessionContext.Provider value={{ session, user, loading }}>
      {children}
      <Toaster /> {/* Ensure Toaster is available for toasts */}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};