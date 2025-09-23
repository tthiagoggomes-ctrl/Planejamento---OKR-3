import { supabase } from '../client';
import { showError } from '@/utils/toast';

export interface Atividade {
  id: string;
  key_result_id: string;
  user_id: string; // Assignee
  titulo: string;
  descricao: string | null;
  due_date: string | null; // ISO string
  status: 'todo' | 'in_progress' | 'done' | 'stopped'; // Adicionado 'stopped'
  created_at?: string;
  updated_at?: string;
  key_result_title?: string; // Joined from key_results
  key_result_objetivo_id?: string; // NEW: Joined from key_results to get parent objective ID
  assignee_name?: string; // Joined from profiles
}

export interface AtividadeSummary {
  status: Atividade['status'];
  count: number;
}

export const getAtividades = async (limit?: number): Promise<Atividade[] | null> => {
  let query = supabase
    .from('atividades')
    .select(`
      *,
      key_result:key_results(titulo, objetivo_id),
      assignee:usuarios(first_name, last_name)
    `)
    .order('updated_at', { ascending: false }); // Order by updated_at for recent changes

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching activities:', error.message);
    showError('Erro ao carregar atividades.');
    return null;
  }

  return data.map(atividade => ({
    ...atividade,
    key_result_title: (atividade as any).key_result?.titulo || 'N/A',
    key_result_objetivo_id: (atividade as any).key_result?.objetivo_id || null, // Extract objective ID
    assignee_name: (atividade as any).assignee ? `${(atividade as any).assignee.first_name} ${(atividade as any).assignee.last_name}` : 'N/A',
  }));
};

export const getAtividadesByKeyResultId = async (key_result_id: string): Promise<Atividade[] | null> => {
  const { data, error } = await supabase
    .from('atividades')
    .select(`
      *,
      key_result:key_results(titulo, objetivo_id),
      assignee:usuarios(first_name, last_name)
    `)
    .eq('key_result_id', key_result_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching activities for Key Result ${key_result_id}:`, error.message);
    showError('Erro ao carregar atividades para o Key Result.');
    return null;
  }

  return data.map(atividade => ({
    ...atividade,
    key_result_title: (atividade as any).key_result?.titulo || 'N/A',
    key_result_objetivo_id: (atividade as any).key_result?.objetivo_id || null, // Extract objective ID
    assignee_name: (atividade as any).assignee ? `${(atividade as any).assignee.first_name} ${(atividade as any).assignee.last_name}` : 'N/A',
  }));
};

export const getAtividadesSummary = async (): Promise<AtividadeSummary[] | null> => {
  const { data, error } = await supabase
    .from('atividades')
    .select('status'); // Select only the status column

  if (error) {
    console.error('Error fetching activity summary:', error.message);
    showError('Erro ao carregar resumo de atividades.');
    return null;
  }

  // Group and count client-side
  const summaryMap = new Map<Atividade['status'], number>();
  data.forEach(ativ => {
    const currentCount = summaryMap.get(ativ.status) || 0;
    summaryMap.set(ativ.status, currentCount + 1);
  });

  return Array.from(summaryMap.entries()).map(([status, count]) => ({ status, count }));
};

export const createAtividade = async (
  key_result_id: string,
  user_id: string,
  titulo: string,
  descricao: string | null,
  due_date: string | null,
  status: 'todo' | 'in_progress' | 'done' | 'stopped' // Adicionado 'stopped'
): Promise<Atividade | null> => {
  const { data, error } = await supabase
    .from('atividades')
    .insert({ key_result_id, user_id, titulo, descricao, due_date, status })
    .select(`
      *,
      key_result:key_results(titulo, objetivo_id),
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
    key_result_objetivo_id: (data as any).key_result?.objetivo_id || null,
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
  status: 'todo' | 'in_progress' | 'done' | 'stopped' // Adicionado 'stopped'
): Promise<Atividade | null> => {
  const { data, error } = await supabase
    .from('atividades')
    .update({ key_result_id, user_id, titulo, descricao, due_date, status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      key_result:key_results(titulo, objetivo_id),
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
    key_result_objetivo_id: (data as any).key_result?.objetivo_id || null,
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