import { supabase } from '../client';
import { showError, showSuccess } from '@/utils/toast';
import { UserProfile } from './users'; // Importar UserProfile para tipagem

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

export const getAtividadesComite = async (params?: GetAtividadesComiteParams): Promise<AtividadeComite[]> => {
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
      )
    `)
    .order('created_at', { ascending: false });

  if (params?.ata_reuniao_id && params.ata_reuniao_id !== 'all') {
    query = query.eq('ata_reuniao_id', params.ata_reuniao_id);
  } else if (params?.comite_id && params.comite_id !== 'all') {
    const { data: reunioesData, error: reunioesError } = await supabase
      .from('reunioes')
      .select('id')
      .eq('comite_id', params.comite_id);

    if (reunioesError) {
      console.error('Error fetching meetings for committee filter:', reunioesError.message);
      showError('Erro ao carregar reuniões para o filtro de comitê.');
      return [];
    }
    const reuniaoIds = reunioesData.map(r => r.id);

    if (reuniaoIds.length === 0) {
      return [];
    }

    const { data: atasData, error: atasError } = await supabase
      .from('atas_reuniao')
      .select('id')
      .in('reuniao_id', reuniaoIds);

    if (atasError) {
      console.error('Error fetching meeting minutes for committee filter:', atasError.message);
      showError('Erro ao carregar atas de reunião para o filtro de comitê.');
      return [];
    }
    const ataIds = atasData.map(ata => ata.id);
    if (ataIds.length === 0) {
      return [];
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
    return [];
  }

  const activities = data as AtividadeComite[];

  // Coletar todos os user_ids únicos para buscar os nomes
  const userIds = new Set<string>();
  activities.forEach(activity => {
    if (activity.assignee_id) userIds.add(activity.assignee_id);
    if (activity.created_by) userIds.add(activity.created_by);
  });

  let usersMap = new Map<string, UserProfile>();
  if (userIds.size > 0) {
    const { data: usersData, error: usersError } = await supabase
      .from('usuarios')
      .select('id, first_name, last_name')
      .in('id', Array.from(userIds));

    if (usersError) {
      console.error('Error fetching users for activities:', usersError.message);
      showError('Erro ao carregar nomes de usuários para atividades.');
    } else {
      usersData.forEach(user => {
        usersMap.set(user.id, user as UserProfile);
      });
    }
  }

  return activities.map(activity => ({
    ...activity,
    reuniao_titulo: (activity as any).ata_reuniao?.reuniao?.titulo || 'N/A',
    comite_nome: (activity as any).ata_reuniao?.reuniao?.comite?.nome || 'N/A',
    comite_id: (activity as any).ata_reuniao?.reuniao?.comite?.id || null,
    ata_reuniao_data_reuniao: (activity as any).ata_reuniao?.data_reuniao || (activity as any).ata_reuniao?.created_at || null,
    assignee_name: activity.assignee_id ? `${usersMap.get(activity.assignee_id)?.first_name || ''} ${usersMap.get(activity.assignee_id)?.last_name || ''}`.trim() || 'N/A' : 'N/A',
    created_by_name: activity.created_by ? `${usersMap.get(activity.created_by)?.first_name || ''} ${usersMap.get(activity.created_by)?.last_name || ''}`.trim() || 'N/A' : 'N/A',
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
    .select() // Seleciona apenas os campos da atividade criada
    .single();

  if (error) {
    console.error('Error creating committee activity:', error.message);
    showError(`Erro ao criar atividade do comitê: ${error.message}`);
    return null;
  }
  showSuccess('Atividade do comitê criada com sucesso!');
  return data; // Retorna os dados brutos da atividade
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
    .select() // Seleciona apenas os campos da atividade atualizada
    .single();

  if (error) {
    console.error('Error updating committee activity:', error.message);
    showError(`Erro ao atualizar atividade do comitê: ${error.message}`);
    return null;
  }
  showSuccess('Atividade do comitê atualizada com sucesso!');
  return data; // Retorna os dados brutos da atividade
};

export const deleteAtividadeComite = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('atividades_comite').delete().eq('id', id);
  if (error) {
    console.error('Error deleting committee activity:', error.message);
    showError(`Erro ao excluir atividade do comitê: ${error.message}`);
    return false;
  }
  return true;
};

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