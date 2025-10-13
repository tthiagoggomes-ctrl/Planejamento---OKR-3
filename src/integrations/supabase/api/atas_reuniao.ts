import { supabase } from '../client';
import { showError, showSuccess } from '@/utils/toast';

export interface AtaReuniao {
  id: string;
  reuniao_id: string;
  conteudo: string; // Este campo será mantido, mas as informações serão mais estruturadas
  decisoes_tomadas: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
  created_by_name?: string; // Joined from profiles
  // NOVOS CAMPOS ESTRUTURADOS
  data_reuniao: string | null; // ISO date string
  horario_inicio: string | null; // HH:mm string
  horario_fim: string | null;   // HH:mm string
  local_reuniao: string | null;
  participantes: string | null;
  objetivos_reuniao: string | null;
  pauta_tratada: string | null;
  novos_topicos: string | null;
  pendencias: string | null;
  proximos_passos: string | null;
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
  created_by: string,
  // NOVOS PARÂMETROS
  data_reuniao: string | null,
  horario_inicio: string | null,
  horario_fim: string | null,
  local_reuniao: string | null,
  participantes: string | null,
  objetivos_reuniao: string | null,
  pauta_tratada: string | null,
  novos_topicos: string | null,
  pendencias: string | null,
  proximos_passos: string | null
): Promise<AtaReuniao | null> => {
  const { data, error } = await supabase
    .from('atas_reuniao')
    .insert({
      reuniao_id,
      conteudo,
      decisoes_tomadas,
      created_by,
      data_reuniao,
      horario_inicio,
      horario_fim,
      local_reuniao,
      participantes,
      objetivos_reuniao,
      pauta_tratada,
      novos_topicos,
      pendencias,
      proximos_passos
    })
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
  decisoes_tomadas: string | null,
  // NOVOS PARÂMETROS
  data_reuniao: string | null,
  horario_inicio: string | null,
  horario_fim: string | null,
  local_reuniao: string | null,
  participantes: string | null,
  objetivos_reuniao: string | null,
  pauta_tratada: string | null,
  novos_topicos: string | null,
  pendencias: string | null,
  proximos_passos: string | null
): Promise<AtaReuniao | null> => {
  const { data, error } = await supabase
    .from('atas_reuniao')
    .update({
      conteudo,
      decisoes_tomadas,
      updated_at: new Date().toISOString(),
      data_reuniao,
      horario_inicio,
      horario_fim,
      local_reuniao,
      participantes,
      objetivos_reuniao,
      pauta_tratada,
      novos_topicos,
      pendencias,
      proximos_passos
    })
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