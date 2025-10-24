"use client";

import { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/'); // Redirect to dashboard after successful login
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src="/assets/logo-fade-ufpe.png" alt="Logo FADE-UFPE" className="mx-auto mb-4 h-16" />
          <CardTitle className="text-3xl font-bold text-fade-red">FADE-UFPE OKR Login</CardTitle> {/* Cor aplicada aqui */}
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            providers={[]} // No third-party providers for now
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#b5121b', // Cor aplicada diretamente aqui
                    brandAccent: '#8a0f15', // Um tom mais escuro para o hover/active
                  },
                },
              },
            }}
            theme="light" // Use light theme, can be dynamic later
            redirectTo={window.location.origin + '/'}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;