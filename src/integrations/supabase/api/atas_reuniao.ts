import { supabase } from '../client';
import { showError, showSuccess } from '@/utils/toast';

export interface AtaReuniao {
  id: string;
  reuniao_id: string;
  conteudo: string;
  decisoes_tomadas: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
  created_by_name?: string; // Joined from profiles
}

export const getAtasReuniaoByReuniaoId = async (reuniao_id: string): Promise<AtaReuniao[] | null> => {
  const { data, error } = await supabase
    .from('atas_reuniao')
    .select(`
      *,
      created_by_user:usuarios(first_name, last_name)
    `)
    .eq('reuniao_id', reuniao_id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching meeting minutes:', error.message);
    showError('Erro ao carregar atas de reunião.');
    return null;
  }
  return data.map(ata => ({
    ...ata,
    created_by_name: (ata as any).created_by_user ? `${(ata as any).created_by_user.first_name} ${(ata as any).created_by_user.last_name}` : 'N/A',
  }));
};

export const createAtaReuniao = async (
  reuniao_id: string,
  conteudo: string,
  decisoes_tomadas: string | null,
  created_by: string
): Promise<AtaReuniao | null> => {
  const { data, error } = await supabase
    .from('atas_reuniao')
    .insert({ reuniao_id, conteudo, decisoes_tomadas, created_by })
    .select(`
      *,
      created_by_user:usuarios(first_name, last_name)
    `)
    .single();

  if (error) {
    console.error('Error creating meeting minutes:', error.message);
    showError(`Erro ao criar ata de reunião: ${error.message}`);
    return null;
  }
  showSuccess('Ata de reunião criada com sucesso!');
  return {
    ...data,
    created_by_name: (data as any).created_by_user ? `${(data as any).created_by_user.first_name} ${(data as any).created_by_user.last_name}` : 'N/A',
  };
};

export const updateAtaReuniao = async (
  id: string,
  conteudo: string,
  decisoes_tomadas: string | null
): Promise<AtaReuniao | null> => {
  const { data, error } = await supabase
    .from('atas_reuniao')
    .update({ conteudo, decisoes_tomadas, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      created_by_user:usuarios(first_name, last_name)
    `)
    .single();

  if (error) {
    console.error('Error updating meeting minutes:', error.message);
    showError(`Erro ao atualizar ata de reunião: ${error.message}`);
    return null;
  }
  showSuccess('Ata de reunião atualizada com sucesso!');
  return {
    ...data,
    created_by_name: (data as any).created_by_user ? `${(data as any).created_by_user.first_name} ${(data as any).created_by_user.last_name}` : 'N/A',
  };
};

export const deleteAtaReuniao = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('atas_reuniao').delete().eq('id', id);
  if (error) {
    console.error('Error deleting meeting minutes:', error.message);
    showError(`Erro ao excluir ata de reunião: ${error.message}`);
    return false;
  }
  showSuccess('Ata de reunião excluída com sucesso!');
  return true;
};