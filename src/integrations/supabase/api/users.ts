import { supabase } from '../client';
import { showSuccess, showError } from '@/utils/toast';
// import { User } from '@supabase/supabase-js'; // REMOVIDO
// import { Permission } from '@/hooks/use-user-permissions'; // REMOVIDO

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  area_id: string | null;
  area_name?: string;
  permissao: 'administrador' | 'diretoria' | 'gerente' | 'supervisor' | 'usuario';
  status: 'active' | 'blocked';
  cargo_funcao?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface GetUsersParams {
  sortBy?: keyof UserProfile | 'area_name' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export const getUsers = async (params?: GetUsersParams): Promise<UserProfile[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.sortBy) {
      queryParams.append('sortBy', params.sortBy);
    }
    if (params?.sortOrder) {
      queryParams.append('sortOrder', params.sortOrder);
    }

    const { data, error } = await supabase.functions.invoke(`list-users?${queryParams.toString()}`, {
      method: 'GET',
    });

    if (error) {
      console.error('Error invoking list-users edge function:', error.message);
      showError('Erro ao carregar dados de autenticação dos usuários.');
      throw error; // Throw error to be caught by react-query
    }

    return data as UserProfile[];
  } catch (error: any) {
    console.error('Error in getUsers (client-side):', error.message);
    showError('Erro ao carregar dados de autenticação dos usuários.');
    throw error; // Throw error to be caught by react-query
  }
};

export const getCurrentUserProfile = async (): Promise<UserProfile> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Error fetching current auth user:', authError?.message);
    showError('Erro ao carregar dados do usuário autenticado.');
    throw authError || new Error("User not authenticated."); // Throw error
  }

  const { data: profileData, error: profileError } = await supabase
    .from('usuarios')
    .select('*, area:areas(nome)')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching current user profile:', profileError.message);
    showError('Erro ao carregar perfil do usuário.');
    throw profileError; // Throw error
  }

  return {
    ...profileData,
    email: user.email || 'N/A',
    area_name: (profileData as any).area?.nome || 'N/A',
  };
};


export const createUser = async (
  email: string,
  first_name: string,
  last_name: string,
  area_id: string | null,
  permissao: 'administrador' | 'diretoria' | 'gerente' | 'supervisor' | 'usuario',
  selected_permissions: string[] = [],
  password?: string,
  cargo_funcao: string | null = null
): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('create-user', {
      method: 'POST',
      body: { email, password, first_name, last_name, area_id, permissao, selected_permissions, cargo_funcao },
    });

    if (error) {
      console.error('Error invoking create-user edge function:', error.message);
      showError(`Erro ao criar usuário: ${error.message}`);
      return null;
    }

    showSuccess("Usuário criado com sucesso!");
    return data as UserProfile;
  } catch (error: any) {
    console.error('Error in createUser (client-side):', error.message);
    showError(`Erro ao criar usuário: ${error.message}`);
    return null;
  }
};

export const updateUserProfile = async (
  id: string,
  first_name: string,
  last_name: string,
  area_id: string | null,
  permissao: 'administrador' | 'diretoria' | 'gerente' | 'supervisor' | 'usuario',
  status: 'active' | 'blocked',
  selected_permissions: string[] = [],
  email: string,
  cargo_funcao: string | null = null
): Promise<UserProfile | null> => {
  // First, update the user's profile in the 'usuarios' table
  const { data, error } = await supabase
    .from('usuarios')
    .update({ first_name, last_name, area_id, permissao, status, cargo_funcao, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, area:areas(nome)');

  if (error) {
    console.error('Error updating user profile:', error.message);
    showError(`Erro ao atualizar perfil do usuário: ${error.message}`);
    return null;
  }

  if (!data || data.length === 0) {
    console.error('No user profile found or updated for ID:', id);
    showError('Nenhum perfil de usuário encontrado para atualização.');
    return null;
  }

  const updatedProfileData = data[0];

  // Fetch all available permissions to map selected_permissions (string keys) to permission_ids (UUIDs)
  const { data: allPermissions, error: permissionsError } = await supabase.from('permissions').select('id, resource, action');
  if (permissionsError) {
    console.error('Error fetching all permissions for update:', permissionsError.message);
    showError('Erro ao carregar permissões para atualização.');
    return null;
  }

  const permissionMap = new Map<string, string>();
  allPermissions.forEach(p => permissionMap.set(`${p.resource}_${p.action}`, p.id));

  const newPermissionIds = selected_permissions
    .map(key => permissionMap.get(key))
    .filter(Boolean) as string[];

  // Get current user permissions
  const { data: currentPermissionsData, error: currentPermissionsError } = await supabase
    .from('user_permissions')
    .select('permission_id')
    .eq('user_id', id);

  if (currentPermissionsError) {
    console.error('Error fetching current user permissions for update:', currentPermissionsError.message);
    showError('Erro ao carregar permissões atuais do usuário.');
    return null;
  }

  const currentPermissionIds = new Set(currentPermissionsData.map(p => p.permission_id));

  // Determine permissions to add and remove
  const permissionsToAdd = newPermissionIds.filter(pid => !currentPermissionIds.has(pid));
  const permissionsToRemove = Array.from(currentPermissionIds).filter(pid => !newPermissionIds.includes(pid));

  // Insert new permissions
  if (permissionsToAdd.length > 0) {
    const { error: insertError } = await supabase
      .from('user_permissions')
      .insert(permissionsToAdd.map(pid => ({ user_id: id, permission_id: pid })));
    if (insertError) {
      console.error('Error inserting new user permissions:', insertError.message);
      showError('Erro ao adicionar novas permissões.');
      return null;
    }
  }

  // Delete removed permissions
  if (permissionsToRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', id)
      .in('permission_id', permissionsToRemove);
    if (deleteError) {
      console.error('Error deleting user permissions:', deleteError.message);
      showError('Erro ao remover permissões antigas.');
      return null;
    }
  }

  return {
    ...updatedProfileData,
    email: email,
    area_name: (updatedProfileData as any).area?.nome || 'N/A',
  };
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) {
    console.error('Error deleting user:', error.message);
    showError(`Erro ao excluir usuário: ${error.message}`);
    return false;
  }
  return true;
};

export const sendPasswordResetEmail = async (email: string): Promise<boolean> => {
  const { error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
  });

  if (error) {
    console.error('Error sending password reset email:', error.message);
    showError(`Erro ao enviar e-mail de redefinição de senha: ${error.message}`);
    return false;
  }
  return true;
};

export const blockUser = async (id: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('usuarios')
    .update({ status: 'blocked', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, area:areas(nome)')
    .single();

  if (error) {
    console.error('Error blocking user:', error.message);
    showError(`Erro ao bloquear usuário: ${error.message}`);
    return null;
  }
  const { data: { user: authUserSession } } = await supabase.auth.getUser();
  const email = authUserSession?.id === id ? authUserSession.email : 'N/A';
  return { ...data, email: email || 'N/A', area_name: (data as any).area?.nome || 'N/A' };
};

export const unblockUser = async (id: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('usuarios')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, area:areas(nome)')
    .single();

  if (error) {
    console.error('Error unblocking user:', error.message);
    showError(`Erro ao desbloquear usuário: ${error.message}`);
    return null;
  }
  const { data: { user: authUserSession } } = await supabase.auth.getUser();
  const email = authUserSession?.id === id ? authUserSession.email : 'N/A';
  return { ...data, email: email || 'N/A', area_name: (data as any).area?.nome || 'N/A' };
};