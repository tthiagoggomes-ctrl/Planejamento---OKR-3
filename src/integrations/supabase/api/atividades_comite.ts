import { supabase } from '../client';
import { showError, showSuccess } from '@/utils/toast';

export interface AtividadeComite {
  id: string;
  ata_reuniao_id: string;
  titulo: string;
  descricao: string | null;
  due_date: string | null; // ISO string
  status: 'todo' | 'in_progress' | 'done' | 'stopped';
  assignee_id: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
  assignee_name?: string; // Joined from profiles
  created_by_name?: string; // Joined from profiles
}

export const getAtividadesComiteByAtaId = async (ata_reuniao_id: string): Promise<AtividadeComite[] | null> => {
  const { data, error } = await supabase
    .from('atividades_comite')
    .select(`
      *,
      assignee:usuarios!assignee_id(first_name, last_name),
      creator:usuarios!created_by(first_name, last_name)
    `)
    .eq('ata_reuniao_id', ata_reuniao_id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching committee activities:', error.message);
    showError('Erro ao carregar atividades do comitê.');
    return null;
  }
  return data.map(ativ => ({
    ...ativ,
    assignee_name: (ativ as any).assignee ? `${(ativ as any).assignee.first_name} ${(ativ as any).assignee.last_name}` : 'N/A',
    created_by_name: (ativ as any).creator ? `${(ativ as any).creator.first_name} ${(ativ as any).creator.last_name}` : 'N/A',
  }));
};

export const createAtividadeComite = async (
  ata_reuniao_id: string,
  titulo: string,
  descricao: string | null,
  due_date: string | null,
  status: 'todo' | 'in_progress' | 'done' | 'stopped',
  assignee_id: string | null,
  created_by: string
): Promise<AtividadeComite | null> => {
  const { data, error } = await supabase
    .from('atividades_comite')
    .insert({ ata_reuniao_id, titulo, descricao, due_date, status, assignee_id, created_by })
    .select(`
      *,
      assignee:usuarios!assignee_id(first_name, last_name),
      creator:usuarios!created_by(first_name, last_name)
    `)
    .single();

  if (error) {
    console.error('Error creating committee activity:', error.message);
    showError(`Erro ao criar atividade do comitê: ${error.message}`);
    return null;
  }
  showSuccess('Atividade do comitê criada com sucesso!');
  return {
    ...data,
    assignee_name: (data as any).assignee ? `${(data as any).assignee.first_name} ${(data as any).assignee.last_name}` : 'N/A',
    created_by_name: (data as any).creator ? `${(data as any).creator.first_name} ${(data as any).creator.last_name}` : 'N/A',
  };
};

export const updateAtividadeComite = async (
  id: string,
  titulo: string,
  descricao: string | null,
  due_date: string | null,
  status: 'todo' | 'in_progress' | 'done' | 'stopped',
  assignee_id: string | null
): Promise<AtividadeComite | null> => {
  const { data, error } = await supabase
    .from('atividades_comite')
    .update({ titulo, descricao, due_date, status, assignee_id, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      assignee:usuarios!assignee_id(first_name, last_name),
      creator:usuarios!created_by(first_name, last_name)
    `)
    .single();

  if (error) {
    console.error('Error updating committee activity:', error.message);
    showError(`Erro ao atualizar atividade do comitê: ${error.message}`);
    return null;
  }
  showSuccess('Atividade do comitê atualizada com sucesso!');
  return {
    ...data,
    assignee_name: (data as any).assignee ? `${(data as any).assignee.first_name} ${(data as any).assignee.last_name}` : 'N/A',
    created_by_name: (data as any).creator ? `${(data as any).creator.first_name} ${(data as any).creator.last_name}` : 'N/A',
  };
};

export const deleteAtividadeComite = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('atividades_comite').delete().eq('id', id);
  if (error) {
    console.error('Error deleting committee activity:', error.message);
    showError(`Erro ao excluir atividade do comitê: ${error.message}`);
    return false;
  }
  showSuccess('Atividade do comitê excluída com sucesso!');
  return true;
};