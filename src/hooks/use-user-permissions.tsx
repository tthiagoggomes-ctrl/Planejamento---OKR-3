"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/auth/SessionContextProvider';
import { showError } from '@/utils/toast';

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
}

const fetchUserPermissions = async (userId: string | undefined): Promise<Set<string>> => {
  if (!userId) {
    return new Set();
  }

  const { data, error } = await supabase
    .from('user_permissions')
    .select(`
      permission_id,
      permissions(resource, action)
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user permissions:', error.message);
    showError('Erro ao carregar permissões do usuário.');
    return new Set();
  }

  const permissionsSet = new Set<string>();
  data.forEach((up: any) => {
    if (up.permissions) {
      permissionsSet.add(`${up.permissions.resource}_${up.permissions.action}`);
    }
  });
  return permissionsSet;
};

export const useUserPermissions = () => {
  const { user, loading: sessionLoading } = useSession();

  const { data: userPermissions, isLoading: permissionsLoading, error: permissionsError } = useQuery<Set<string>, Error>({
    queryKey: ["userPermissions", user?.id],
    queryFn: () => fetchUserPermissions(user?.id),
    enabled: !!user && !sessionLoading, // Only fetch if user is logged in and session is not loading
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  const can = React.useCallback((resource: string, action: string): boolean => {
    if (sessionLoading || permissionsLoading || permissionsError) {
      return false; // Or handle as 'pending' state if needed
    }
    // If user is an administrator, they have all permissions
    if (user && (user as any).permissao === 'administrador') { // Assuming 'permissao' is available on the user object
      return true;
    }
    return userPermissions?.has(`${resource}_${action}`) || false;
  }, [userPermissions, user, sessionLoading, permissionsLoading, permissionsError]);

  return {
    can,
    isLoading: sessionLoading || permissionsLoading,
    isError: !!permissionsError,
  };
};