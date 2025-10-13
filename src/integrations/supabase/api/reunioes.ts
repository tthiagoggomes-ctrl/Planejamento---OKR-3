import { supabase } from '../client';
import { showError, showSuccess } from '@/utils/toast';

export interface Reuniao {
  id: string;
  comite_id: string;
  titulo: string;
  data_reuniao: string; // ISO string
  local: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
  created_by_name?: string; // Joined from profiles
}

export const getReunioesByComiteId = async (comite_id: string): Promise<Reuniao[] | null> => {
  const { data, error } = await supabase
    .from('reunioes')
    .select(`
      *,
      created_by_user:usuarios(first_name, last_name)
    `)
    .eq('comite_id', comite_id)
    .order('data_reuniao', { ascending: false });

  if (error) {
    console.error('Error fetching meetings:', error.message);
    showError('Erro ao carregar reuniões.');
    return null;
  }
  return data.map(reuniao => ({
    ...reuniao,
    created_by_name: (reuniao as any).created_by_user ? `${(reuniao as any).created_by_user.first_name} ${(reuniao as any).created_by_user.last_name}` : 'N/A',
  }));
};

export const createReuniao = async (
  comite_id: string,
  titulo: string,
  data_reuniao: string,
  local: string | null,
  created_by: string
): Promise<Reuniao | null> => {
  const { data, error } = await supabase
    .from('reunioes')
    .insert({ comite_id, titulo, data_reuniao, local, created_by })
    .select(`
      *,
      created_by_user:usuarios(first_name, last_name)
    `)
    .single();

  if (error) {
    console.error('Error creating meeting:', error.message);
    showError(`Erro ao criar reunião: ${error.message}`);
    return null;
  }
  showSuccess('Reunião criada com sucesso!');
  return {
    ...data,
    created_by_name: (data as any).created_by_user ? `${(data as any).created_by_user.first_name} ${(data as any).created_by_user.last_name}` : 'N/A',
  };
};

export const updateReuniao = async (
  id: string,
  titulo: string,
  data_reuniao: string,
  local: string | null
): Promise<Reuniao | null> => {
  const { data, error } = await supabase
    .from('reunioes')
    .update({ titulo, data_reuniao, local, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      created_by_user:usuarios(first_name, last_name)
    `)
    .single();

  if (error) {
    console.error('Error updating meeting:', error.message);
    showError(`Erro ao atualizar reunião: ${error.message}`);
    return null;
  }
  showSuccess('Reunião atualizada com sucesso!');
  return {
    ...data,
    created_by_name: (data as any).created_by_user ? `${(data as any).created_by_user.first_name} ${(data as any).created_by_user.last_name}` : 'N/A',
  };
};

export const deleteReuniao = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('reunioes').delete().eq('id', id);
  if (error) {
    console.error('Error deleting meeting:', error.message);
    showError(`Erro ao excluir reunião: ${error.message}`);
    return false;
  }
  showSuccess('Reunião excluída com sucesso!');
  return true;
};