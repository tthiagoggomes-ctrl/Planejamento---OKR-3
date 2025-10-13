import { supabase } from '../client';
import { showError, showSuccess } from '@/utils/toast';

export interface Comite {
  id: string;
  nome: string;
  descricao: string | null;
  status: 'active' | 'archived';
  created_at?: string;
  updated_at?: string;
}

export interface ComiteMember {
  comite_id: string;
  user_id: string;
  role: 'membro' | 'presidente' | 'secretario';
  created_at?: string;
  user_name?: string; // Joined from profiles
  user_email?: string; // Joined from auth.users
}

export const getComites = async (): Promise<Comite[] | null> => {
  const { data, error } = await supabase
    .from('comites')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Error fetching comites:', error.message);
    showError('Erro ao carregar comitês.');
    return null;
  }
  return data;
};

export const getComiteById = async (id: string): Promise<Comite | null> => {
  const { data, error } = await supabase
    .from('comites')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching comite by ID:', error.message);
    showError('Erro ao carregar comitê.');
    return null;
  }
  return data;
};

export const createComite = async (
  nome: string,
  descricao: string | null,
  status: 'active' | 'archived' = 'active'
): Promise<Comite | null> => {
  const { data, error } = await supabase
    .from('comites')
    .insert({ nome, descricao, status })
    .select()
    .single();

  if (error) {
    console.error('Error creating comite:', error.message);
    showError(`Erro ao criar comitê: ${error.message}`);
    return null;
  }
  showSuccess('Comitê criado com sucesso!');
  return data;
};

export const updateComite = async (
  id: string,
  nome: string,
  descricao: string | null,
  status: 'active' | 'archived'
): Promise<Comite | null> => {
  const { data, error } = await supabase
    .from('comites')
    .update({ nome, descricao, status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating comite:', error.message);
    showError(`Erro ao atualizar comitê: ${error.message}`);
    return null;
  }
  showSuccess('Comitê atualizado com sucesso!');
  return data;
};

export const deleteComite = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('comites').delete().eq('id', id);
  if (error) {
    console.error('Error deleting comite:', error.message);
    showError(`Erro ao excluir comitê: ${error.message}`);
    return false;
  }
  showSuccess('Comitê excluído com sucesso!');
  return true;
};

export const getComiteMembers = async (comite_id: string): Promise<ComiteMember[] | null> => {
  const { data, error } = await supabase
    .from('comite_membros')
    .select(`
      *,
      user:usuarios(first_name, last_name, email)
    `)
    .eq('comite_id', comite_id);

  if (error) {
    console.error('Error fetching committee members:', error.message);
    showError('Erro ao carregar membros do comitê.');
    return null;
  }

  return data.map(member => ({
    ...member,
    user_name: (member as any).user ? `${(member as any).user.first_name} ${(member as any).user.last_name}` : 'N/A',
    user_email: (member as any).user?.email || 'N/A',
  }));
};

export const addComiteMember = async (
  comite_id: string,
  user_id: string,
  role: 'membro' | 'presidente' | 'secretario'
): Promise<ComiteMember | null> => {
  const { data, error } = await supabase
    .from('comite_membros')
    .insert({ comite_id, user_id, role })
    .select(`
      *,
      user:usuarios(first_name, last_name, email)
    `)
    .single();

  if (error) {
    console.error('Error adding committee member:', error.message);
    showError(`Erro ao adicionar membro: ${error.message}`);
    return null;
  }
  showSuccess('Membro adicionado com sucesso!');
  return {
    ...data,
    user_name: (data as any).user ? `${(data as any).user.first_name} ${(data as any).user.last_name}` : 'N/A',
    user_email: (data as any).user?.email || 'N/A',
  };
};

export const updateComiteMemberRole = async (
  comite_id: string,
  user_id: string,
  role: 'membro' | 'presidente' | 'secretario'
): Promise<ComiteMember | null> => {
  const { data, error } = await supabase
    .from('comite_membros')
    .update({ role })
    .eq('comite_id', comite_id)
    .eq('user_id', user_id)
    .select(`
      *,
      user:usuarios(first_name, last_name, email)
    `)
    .single();

  if (error) {
    console.error('Error updating committee member role:', error.message);
    showError(`Erro ao atualizar função do membro: ${error.message}`);
    return null;
  }
  showSuccess('Função do membro atualizada com sucesso!');
  return {
    ...data,
    user_name: (data as any).user ? `${(data as any).user.first_name} ${(data as any).user.last_name}` : 'N/A',
    user_email: (data as any).user?.email || 'N/A',
  };
};

export const removeComiteMember = async (comite_id: string, user_id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('comite_membros')
    .delete()
    .eq('comite_id', comite_id)
    .eq('user_id', user_id);

  if (error) {
    console.error('Error removing committee member:', error.message);
    showError(`Erro ao remover membro: ${error.message}`);
    return false;
  }
  showSuccess('Membro removido com sucesso!');
  return true;
};