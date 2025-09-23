import { supabase } from '../client';
import { supabaseAdmin } from '../admin'; // Importa o cliente admin
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

  // Busca auth.users para obter endereços de e-mail usando o cliente admin
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

  if (authError) {
    console.error('Error fetching auth users:', authError.message);
    showError('Erro ao carregar dados de autenticação dos usuários.');
    return null;
  }

  const authUsersMap = new Map<string, User>(authUsers.users.map(user => [user.id, user]));

  const combinedUsers: UserProfile[] = usersData.map(profile => ({
    ...profile,
    email: authUsersMap.get(profile.id)?.email || 'N/A',
    area_name: (profile as any).area?.nome || 'N/A', // Adiciona o nome da área
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
  // Cria usuário em auth.users usando o cliente admin
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: password || undefined, // Se não houver senha, o usuário precisará redefinir
    email_confirm: true, // Confirma automaticamente o e-mail
    user_metadata: { first_name, last_name }, // Passa metadados para o trigger handle_new_user
  });

  if (authError) {
    console.error('Error creating auth user:', authError.message);
    showError(`Erro ao criar usuário: ${authError.message}`);
    return null;
  }

  // O trigger handle_new_user criará o perfil em public.usuarios
  // Precisamos atualizar o area_id e permissao após o perfil ser criado
  const { data: profileData, error: profileError } = await supabase
    .from('usuarios')
    .update({ area_id, permissao, updated_at: new Date().toISOString() })
    .eq('id', authData.user.id)
    .select()
    .single();

  if (profileError) {
    console.error('Error updating user profile after creation:', profileError.message);
    showError(`Erro ao atualizar perfil do usuário: ${profileError.message}`);
    // Considere reverter a criação do usuário auth aqui se necessário
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

  // Busca e-mail de auth.users usando o cliente admin
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(id);
  if (authError) {
    console.error('Error fetching auth user for update:', authError.message);
    showError('Erro ao buscar dados de autenticação do usuário.');
    return null;
  }

  return { ...data, email: authUser.user?.email || 'N/A', area_name: (data as any).area?.nome || 'N/A' };
};

export const deleteUser = async (id: string): Promise<boolean> => {
  // A exclusão de auth.users irá cascatear a exclusão de public.usuarios devido à restrição de chave estrangeira
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id); // Usa o cliente admin
  if (error) {
    console.error('Error deleting user:', error.message);
    showError(`Erro ao excluir usuário: ${error.message}`);
    return false;
  }
  return true;
};

export const sendPasswordResetEmail = async (email: string): Promise<boolean> => {
  const { error } = await supabaseAdmin.auth.admin.generateLink({ // Usa o cliente admin
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
  // Busca e-mail de auth.users usando o cliente admin
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(id);
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
  // Busca e-mail de auth.users usando o cliente admin
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(id);
  if (authError) {
    console.error('Error fetching auth user for unblock:', authError.message);
    showError('Erro ao buscar dados de autenticação do usuário.');
    return null;
  }
  return { ...data, email: authUser.user?.email || 'N/A', area_name: (data as any).area?.nome || 'N/A' };
};