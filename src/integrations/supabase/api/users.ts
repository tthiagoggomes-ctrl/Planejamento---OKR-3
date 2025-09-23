import { supabase } from '../client';
// Removed direct import of supabaseAdmin for client-side security
import { showSuccess, showError } from '@/utils/toast';
import { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  area_id: string | null;
  area_name?: string; // Added to the interface
  permissao: 'admin' | 'member';
  status: 'active' | 'blocked';
  created_at?: string;
  updated_at?: string;
}

export const getUsers = async (): Promise<UserProfile[] | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('list-users', {
      method: 'GET',
    });

    if (error) {
      console.error('Error invoking list-users edge function:', error.message);
      showError('Erro ao carregar dados de autenticação dos usuários.');
      return null;
    }

    return data as UserProfile[];
  } catch (error: any) {
    console.error('Error in getUsers (client-side):', error.message);
    showError('Erro ao carregar dados de autenticação dos usuários.');
    return null;
  }
};

export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Error fetching current auth user:', authError?.message);
    showError('Erro ao carregar dados do usuário autenticado.');
    return null;
  }

  const { data: profileData, error: profileError } = await supabase
    .from('usuarios')
    .select('*, area:areas(nome)')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching current user profile:', profileError.message);
    showError('Erro ao carregar perfil do usuário.');
    return null;
  }

  return {
    ...profileData,
    email: user.email || 'N/A',
    area_name: (profileData as any).area?.nome || 'N/A',
  };
};


export const createUser = async (
  email: string,
  password?: string,
  first_name: string,
  last_name: string,
  area_id: string | null,
  permissao: 'admin' | 'member'
): Promise<UserProfile | null> => {
  // This function still uses supabaseAdmin.auth.admin.createUser.
  // For full security, this and other admin-level operations (deleteUser, sendPasswordResetEmail, blockUser, unblockUser)
  // should also be moved to dedicated Edge Functions.
  // For now, I'm only addressing the getUsers error.
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({ // This line needs to be updated to call an Edge Function
    email,
    password: password || undefined,
    email_confirm: true,
    user_metadata: { first_name, last_name },
  });

  if (authError) {
    console.error('Error creating auth user:', authError.message);
    showError(`Erro ao criar usuário: ${authError.message}`);
    return null;
  }

  // The handle_new_user trigger will create the profile in public.usuarios.
  // We then update this newly created profile with area_id and permissao.
  const { data: profileData, error: profileError } = await supabase
    .from('usuarios')
    .update({ area_id, permissao, updated_at: new Date().toISOString() })
    .eq('id', authData.user.id)
    .select('*, area:areas(nome)') // Select area name after update
    .single();

  if (profileError) {
    console.error('Error updating user profile after creation:', profileError.message);
    showError(`Erro ao atualizar perfil do usuário: ${profileError.message}`);
    return null;
  }

  return {
    ...profileData,
    email: authData.user.email || 'N/A',
    area_name: (profileData as any).area?.nome || 'N/A',
  };
};

export const updateUserProfile = async (
  id: string,
  first_name: string,
  last_name: string,
  area_id: string | null,
  permissao: 'admin' | 'member',
  status: 'active' | 'blocked'
): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('usuarios')
    .update({ first_name, last_name, area_id, permissao, status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, area:areas(nome)')
    .single();

  if (error) {
    console.error('Error updating user profile:', error.message);
    showError(`Erro ao atualizar perfil do usuário: ${error.message}`);
    return null;
  }

  // This still fetches auth user data directly. For full security, this should also be moved to an Edge Function.
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(id); 
  if (authError) {
    console.error('Error fetching auth user for update:', authError.message);
    showError('Erro ao buscar dados de autenticação do usuário.');
    return null;
  }

  return { ...data, email: authUser.user?.email || 'N/A', area_name: (data as any).area?.nome || 'N/A' };
};

export const deleteUser = async (id: string): Promise<boolean> => {
  // This function still uses supabaseAdmin.auth.admin.deleteUser.
  // For full security, this should also be moved to an Edge Function.
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) {
    console.error('Error deleting user:', error.message);
    showError(`Erro ao excluir usuário: ${error.message}`);
    return false;
  }
  return true;
};

export const sendPasswordResetEmail = async (email: string): Promise<boolean> => {
  // This function still uses supabaseAdmin.auth.admin.generateLink.
  // For full security, this should also be moved to an Edge Function.
  const { error } = await supabase.auth.admin.generateLink({
    type: 'password_reset',
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
  // This still fetches auth user data directly. For full security, this should also be moved to an Edge Function.
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(id);
  if (authError) {
    console.error('Error fetching auth user for block:', authError.message);
    showError('Erro ao buscar dados de autenticação do usuário.');
    return null;
  }
  return { ...data, email: authUser.user?.email || 'N/A', area_name: (data as any).area?.nome || 'N/A' };
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
  // This still fetches auth user data directly. For full security, this should also be moved to an Edge Function.
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(id);
  if (authError) {
    console.error('Error fetching auth user for unblock:', authError.message);
    showError('Erro ao buscar dados de autenticação do usuário.');
    return null;
  }
  return { ...data, email: authUser.user?.email || 'N/A', area_name: (data as any).area?.nome || 'N/A' };
};