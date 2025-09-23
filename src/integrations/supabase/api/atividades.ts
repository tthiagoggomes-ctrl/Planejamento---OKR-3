import { supabase } from '../client';
import { showError } from '@/utils/toast';

export interface Atividade {
  id: string;
  key_result_id: string;
  user_id: string; // Assignee
  titulo: string;
  descricao: string | null;
  due_date: string | null; // ISO string
  status: 'todo' | 'in_progress' | 'done';
  created_at?: string;
  updated_at?: string;
  key_result_title?: string; // Joined from key_results
  assignee_name?: string; // Joined from profiles
}

export const getAtividades = async (): Promise<Atividade[] | null> => {
  const { data, error } = await supabase
    .from('atividades')
    .select(`
      *,
      key_result:key_results(titulo),
      assignee:usuarios(first_name, last_name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching activities:', error.message);
    showError('Erro ao carregar atividades.');
    return null;
  }

  return data.map(atividade => ({
    ...atividade,
    key_result_title: (atividade as any).key_result?.titulo || 'N/A',
    assignee_name: (atividade as any).assignee ? `${(atividade as any).assignee.first_name} ${(atividade as any).assignee.last_name}` : 'N/A',
  }));
};

export const createAtividade = async (
  key_result_id: string,
  user_id: string,
  titulo: string,
  descricao: string | null,
  due_date: string | null,
  status: 'todo' | 'in_progress' | 'done'
): Promise<Atividade | null> => {
  const { data, error } = await supabase
    .from('atividades')
    .insert({ key_result_id, user_id, titulo, descricao, due_date, status })
    .select(`
      *,
      key_result:key_results(titulo),
      assignee:usuarios(first_name, last_name)
    `)
    .single();

  if (error) {
    console.error('Error creating activity:', error.message);
    showError(`Erro ao criar atividade: ${error.message}`);
    return null;
  }
  return {
    ...data,
    key_result_title: (data as any).key_result?.titulo || 'N/A',
    assignee_name: (data as any).assignee ? `${(data as any).assignee.first_name} ${(data as any).assignee.last_name}` : 'N/A',
  };
};

export const updateAtividade = async (
  id: string,
  key_result_id: string,
  user_id: string,
  titulo: string,
  descricao: string | null,
  due_date: string | null,
  status: 'todo' | 'in_progress' | 'done'
): Promise<Atividade | null> => {
  const { data, error } = await supabase
    .from('atividades')
    .update({ key_result_id, user_id, titulo, descricao, due_date, status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      key_result:key_results(titulo),
      assignee:usuarios(first_name, last_name)
    `)
    .single();

  if (error) {
    console.error('Error updating activity:', error.message);
    showError(`Erro ao atualizar atividade: ${error.message}`);
    return null;
  }
  return {
    ...data,
    key_result_title: (data as any).key_result?.titulo || 'N/A',
    assignee_name: (data as any).assignee ? `${(data as any).assignee.first_name} ${(data as any).assignee.last_name}` : 'N/A',
  };
};

export const deleteAtividade = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('atividades').delete().eq('id', id);
  if (error) {
    console.error('Error deleting activity:', error.message);
    showError(`Erro ao excluir atividade: ${error.message}`);
    return false;
  }
  return true;
};