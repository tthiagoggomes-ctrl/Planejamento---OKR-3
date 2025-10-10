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

// Fetch user's role to determine if they are admin/diretoria
const fetchUserRole = async (userId: string | undefined): Promise<string | null> => {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('usuarios')
    .select('permissao')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('Error fetching user role:', error.message);
    return null;
  }
  return data?.permissao || null;
};

const fetchUserGranularPermissions = async (userId: string | undefined): Promise<Set<string>> => {
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
    console.error('Error fetching user granular permissions:', error.message);
    showError('Erro ao carregar permissões granulares do usuário.');
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

  const { data: userRole, isLoading: roleLoading, error: roleError } = useQuery<string | null, Error>({
    queryKey: ["userRole", user?.id],
    queryFn: ({ queryKey }) => fetchUserRole(queryKey[1] as string | undefined),
    enabled: !!user && !sessionLoading,
    staleTime: 5 * 60 * 1000,
  });

  const { data: userGranularPermissions, isLoading: granularPermissionsLoading, error: granularPermissionsError } = useQuery<Set<string>, Error>({
    queryKey: ["userGranularPermissions", user?.id],
    queryFn: ({ queryKey }) => fetchUserGranularPermissions(queryKey[1] as string | undefined),
    enabled: !!user && !sessionLoading,
    staleTime: 5 * 60 * 1000,
  });

  const can = React.useCallback((resource: string, action: string): boolean => {
    if (sessionLoading || roleLoading || granularPermissionsLoading || roleError || granularPermissionsError) {
      return false; // Or handle as 'pending' state if needed
    }

    // Administrators and Diretoria have full access
    if (userRole === 'administrador' || userRole === 'diretoria') {
      return true;
    }

    // Check for specific granular permission
    return userGranularPermissions?.has(`${resource}_${action}`) || false;
  }, [userRole, userGranularPermissions, sessionLoading, roleLoading, granularPermissionsLoading, roleError, granularPermissionsError]);

  return {
    can,
    isLoading: sessionLoading || roleLoading || granularPermissionsLoading,
    isError: !!roleError || !!granularPermissionsError,
  };
};