import { supabase } from '../client';
import { showError, showSuccess } from '@/utils/toast';

export interface AtividadeComite {
  id: string;
  ata_reuniao_id: string;
  titulo: string;
  descricao: string | null;
  due_date: string | null; // ISO string
  status: 'todo' | 'in_progress' | 'done' | 'stopped';
  assignee_id: string | null; // Responsável pela atividade
  created_by: string | null; // Quem criou a atividade
  created_at?: string;
  updated_at?: string;
  // Campos unidos para exibição
  reuniao_titulo?: string;
  comite_nome?: string; // NOVO: Adicionado comite_name à interface
  comite_id?: string; // NOVO: Adicionado comite_id à interface
  ata_reuniao_data_reuniao?: string; // Data da ata de reunião
  assignee_name?: string; // Nome do responsável
  created_by_name?: string; // Nome de quem criou
}

interface GetAtividadesComiteParams {
  comite_id?: string | 'all';
  ata_reuniao_id?: string | 'all';
  search?: string;
  limit?: number;
}

export const getAtividadesComite = async (params?: GetAtividadesComiteParams): Promise<AtividadeComite[] | null> => {
  let query = supabase
    .from('atividades_comite')
    .select(`
      *,
      ata_reuniao:atas_reuniao(
        data_reuniao,
        reuniao:reunioes(
          titulo,
          comite:comites(nome, id)
        )
      ),
      assignee:usuarios(first_name, last_name),
      creator:usuarios!atividades_comite_created_by_fkey(first_name, last_name)
    `)
    .order('created_at', { ascending: false });

  if (params?.ata_reuniao_id && params.ata_reuniao_id !== 'all') {
    query = query.eq('ata_reuniao_id', params.ata_reuniao_id);
  } else if (params?.comite_id && params.comite_id !== 'all') {
    // Se filtrar por comitê, precisamos buscar as atas de reunião desse comitê primeiro
    const { data: reunioesData, error: reunioesError } = await supabase
      .from('reunioes')
      .select('id')
      .eq('comite_id', params.comite_id);

    if (reunioesError) {
      console.error('Error fetching meetings for committee filter:', reunioesError.message);
      showError('Erro ao carregar reuniões para o filtro de comitê.');
      return null;
    }
    const reuniaoIds = reunioesData.map(r => r.id);

    if (reuniaoIds.length === 0) {
      return [];
    }

    const { data: atasData, error: atasError } = await supabase
      .from('atas_reuniao')
      .select('id')
      .in('reuniao_id', reuniaoIds); // Corrigido: Usar os IDs das reuniões

    if (atasError) {
      console.error('Error fetching meeting minutes for committee filter:', atasError.message);
      showError('Erro ao carregar atas de reunião para o filtro de comitê.');
      return null;
    }
    const ataIds = atasData.map(ata => ata.id);
    if (ataIds.length === 0) {
      return []; // Nenhum ata para este comitê, então nenhuma atividade
    }
    query = query.in('ata_reuniao_id', ataIds);
  }

  if (params?.search) {
    query = query.ilike('titulo', `%${params.search}%`);
  }

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching committee activities:', error.message);
    showError('Erro ao carregar atividades do comitê.');
    return null;
  }

  return data.map(activity => ({
    ...activity,
    reuniao_titulo: (activity as any).ata_reuniao?.reuniao?.titulo || 'N/A',
    comite_nome: (activity as any).ata_reuniao?.reuniao?.comite?.nome || 'N/A',
    comite_id: (activity as any).ata_reuniao?.reuniao?.comite?.id || null, // NOVO: Mapeando comite_id
    ata_reuniao_data_reuniao: (activity as any).ata_reuniao?.data_reuniao || (activity as any).ata_reuniao?.created_at || null,
    assignee_name: (activity as any).assignee ? `${(activity as any).assignee.first_name} ${(activity as any).assignee.last_name}` : 'N/A',
    created_by_name: (activity as any).creator ? `${(activity as any).creator.first_name} ${(activity as any).creator.last_name}` : 'N/A',
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
      ata_reuniao:atas_reuniao(
        data_reuniao,
        reuniao:reunioes(
          titulo,
          comite:comites(nome, id)
        )
      ),
      assignee:usuarios(first_name, last_name),
      creator:usuarios!atividades_comite_created_by_fkey(first_name, last_name)
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
    reuniao_titulo: (data as any).ata_reuniao?.reuniao?.titulo || 'N/A',
    comite_nome: (data as any).ata_reuniao?.reuniao?.comite?.nome || 'N/A',
    comite_id: (data as any).ata_reuniao?.reuniao?.comite?.id || null, // NOVO: Mapeando comite_id
    ata_reuniao_data_reuniao: (data as any).ata_reuniao?.data_reuniao || (data as any).ata_reuniao?.created_at || null,
    assignee_name: (data as any).assignee ? `${(data as any).assignee.first_name} ${(data as any).assignee.last_name}` : 'N/A',
    created_by_name: (data as any).creator ? `${(data as any).creator.first_name} ${(data as any).creator.last_name}` : 'N/A',
  };
};

export const updateAtividadeComite = async (
  id: string,
  ata_reuniao_id: string, // Keep ata_reuniao_id in update for RLS policy
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
      ata_reuniao:atas_reuniao(
        data_reuniao,
        reuniao:reunioes(
          titulo,
          comite:comites(nome, id)
        )
      ),
      assignee:usuarios(first_name, last_name),
      creator:usuarios!atividades_comite_created_by_fkey(first_name, last_name)
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
    reuniao_titulo: (data as any).ata_reuniao?.reuniao?.titulo || 'N/A',
    comite_nome: (data as any).ata_reuniao?.reuniao?.comite?.nome || 'N/A',
    comite_id: (data as any).ata_reuniao?.reuniao?.comite?.id || null, // NOVO: Mapeando comite_id
    ata_reuniao_data_reuniao: (data as any).ata_reuniao?.data_reuniao || (data as any).ata_reuniao?.created_at || null,
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

// NOVO: Função para excluir todas as atividades do comitê vinculadas a uma ata de reunião
export const deleteAtividadesComiteByAtaReuniaoId = async (ata_reuniao_id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('atividades_comite')
    .delete()
    .eq('ata_reuniao_id', ata_reuniao_id);

  if (error) {
    console.error('Error deleting committee activities by ata_reuniao_id:', error.message);
    showError(`Erro ao excluir atividades do comitê para a ata de reunião: ${error.message}`);
    return false;
  }
  return true;
};