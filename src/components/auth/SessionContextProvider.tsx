"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import { showSuccess, showError } from '@/utils/toast';
import { Loader2 } from "lucide-react"; // For loading indicator

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
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);

      if (_event === 'SIGNED_IN') {
        showSuccess("Login realizado com sucesso!");
        if (location.pathname === '/login') {
          navigate('/'); // Redirect to dashboard if on login page
        }
      } else if (_event === 'SIGNED_OUT') {
        showSuccess("Logout realizado com sucesso!");
        navigate('/login'); // Redirect to login page on sign out
      } else if (_event === 'USER_UPDATED') {
        showSuccess("Perfil atualizado com sucesso!");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

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