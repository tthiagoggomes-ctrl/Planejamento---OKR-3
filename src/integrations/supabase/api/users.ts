import { supabase } from '../client';
import { showSuccess, showError } from '@/utils/toast';
import { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string; // Adicionado para facilitar o uso no frontend
  area_id: string | null;
  permissao: 'admin' | 'member';
  status: 'active' | 'blocked';
  created_at?: string;
  updated_at?: string;
}

export const getUsers = async (): Promise<UserProfile[] | null> => {
  const { data: usersData, error: usersError } = await supabase
    .from('usuarios')
    .select('*, area:areas(nome)') // Seleciona o nome da área
    .order('first_name', { ascending: true });

  if (usersError) {
    console.error('Error fetching user profiles:', usersError.message);
    showError('Erro ao carregar usuários.');
    return null;
  }

  // Fetch auth.users to get email addresses
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('Error fetching auth users:', authError.message);
    showError('Erro ao carregar dados de autenticação dos usuários.');
    return null;
  }

  const authUsersMap = new Map<string, User>(authUsers.users.map(user => [user.id, user]));

  const combinedUsers: UserProfile[] = usersData.map(profile => ({
    ...profile,
    email: authUsersMap.get(profile.id)?.email || 'N/A',
    area_name: profile.area?.nome || 'N/A', // Adiciona o nome da área
  }));

  return combinedUsers;
};

export const createUser = async (
  email: string,
  password?: string, // Password is optional for admin-created users, can be set to auto-generate or require reset
  first_name: string,
  last_name: string,
  area_id: string | null,
  permissao: 'admin' | 'member'
): Promise<UserProfile | null> => {
  // Create user in auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: password || undefined, // If no password, user will need to reset
    email_confirm: true, // Automatically confirm email
    user_metadata: { first_name, last_name }, // Pass metadata for handle_new_user trigger
  });

  if (authError) {
    console.error('Error creating auth user:', authError.message);
    showError(`Erro ao criar usuário: ${authError.message}`);
    return null;
  }

  // The handle_new_user trigger will create the profile in public.usuarios
  // We need to update the area_id and permissao after the profile is created
  const { data: profileData, error: profileError } = await supabase
    .from('usuarios')
    .update({ area_id, permissao, updated_at: new Date().toISOString() })
    .eq('id', authData.user.id)
    .select()
    .single();

  if (profileError) {
    console.error('Error updating user profile after creation:', profileError.message);
    showError(`Erro ao atualizar perfil do usuário: ${profileError.message}`);
    // Consider rolling back auth user creation here if necessary
    return null;
  }

  return { ...profileData, email: authData.user.email || 'N/A' };
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

  // Fetch email from auth.users
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(id);
  if (authError) {
    console.error('Error fetching auth user for update:', authError.message);
    showError('Erro ao buscar dados de autenticação do usuário.');
    return null;
  }

  return { ...data, email: authUser.user?.email || 'N/A', area_name: data.area?.nome || 'N/A' };
};

export const deleteUser = async (id: string): Promise<boolean> => {
  // Deleting from auth.users will cascade delete from public.usuarios due to foreign key constraint
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
  // Fetch email from auth.users
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(id);
  if (authError) {
    console.error('Error fetching auth user for block:', authError.message);
    showError('Erro ao buscar dados de autenticação do usuário.');
    return null;
  }
  return { ...data, email: authUser.user?.email || 'N/A', area_name: data.area?.nome || 'N/A' };
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
  // Fetch email from auth.users
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(id);
  if (authError) {
    console.error('Error fetching auth user for unblock:', authError.message);
    showError('Erro ao buscar dados de autenticação do usuário.');
    return null;
  }
  return { ...data, email: authUser.user?.email || 'N/A', area_name: data.area?.nome || 'N/A' };
};