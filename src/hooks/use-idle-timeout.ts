"use client";

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos

export const useIdleTimeout = (userId: string | undefined) => {
  const timeoutRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const logout = useCallback(async () => {
    if (userId) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error during idle logout:", error);
        showError("Erro ao fazer logout por inatividade.");
      } else {
        showSuccess("Você foi desconectado por inatividade.");
        // Force navigation to login page
        navigate('/login', { replace: true });
      }
    }
  }, [userId, navigate]);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (userId) { // Only set timeout if user is logged in
      timeoutRef.current = window.setTimeout(logout, IDLE_TIMEOUT_MS);
    }
  }, [logout, userId]);

  const handleActivity = useCallback(() => {
    resetTimeout();
  }, [resetTimeout]);

  useEffect(() => {
    // Setup initial timeout
    resetTimeout();

    // Add event listeners for user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity); // For touch devices

    // Cleanup on component unmount or user change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [resetTimeout, handleActivity, userId]); // Re-run effect if userId changes
};