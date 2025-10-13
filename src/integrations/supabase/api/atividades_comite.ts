"use client";

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
  ata_reuniao_data_reuniao?: string; // Joined from atas_reuniao
  reuniao_titulo?: string; // Joined from atas_reuniao -> reunioes
  comite_id?: string; // Joined from atas_reuniao -> reunioes
  comite_nome?: string; // Joined from atas_reuniao -> reunioes -> comites
}

export interface AtividadeComiteSummary {
  status: AtividadeComite['status'];
  count: number;
}

interface GetAtividadesComiteParams {
  ata_reuniao_id?: string | 'all';
  comite_id?: string | 'all';
  search?: string;
  limit?: number;
  sortBy?: keyof AtividadeComite;
  sortOrder?: 'asc' | 'desc';
}

export const getAtividadesComite = async (params?: GetAtividadesComiteParams): Promise<AtividadeComite[] | null> => {
  console.log(`Fetching committee activities with params:`, params);

  let query = supabase
    .from('atividades_comite')
    .select(`
      *,
      assignee:usuarios!assignee_id(first_name, last_name),
      creator:usuarios!created_by(first_name, last_name),
      ata_reuniao:atas_reuniao(
        data_reuniao,
        reuniao:reunioes(
          titulo,
          comite_id,
          comite:comites(nome)
        )
      )
    `);

  if (params?.ata_reuniao_id && params.ata_reuniao_id !== 'all') {
    query = query.eq('ata_reuniao_id', params.ata_reuniao_id);
  }

  if (params?.comite_id && params.comite_id !== 'all') {
    // This requires a more complex filter as comite_id is nested
    // We'll fetch all and filter client-side for now, or use a RLS policy that allows this join
    // For now, let's assume the RLS allows the join and filter on the joined data
    // This might need a custom RPC function if RLS prevents direct filtering on nested joins
  }

  if (params?.search) {
    query = query.ilike('titulo', `%${params.search}%`);
  }

  const sortByColumn = params?.sortBy || 'created_at';
  const sortAscending = params?.sortOrder === 'asc';
  query = query.order(sortByColumn, { ascending: sortAscending });

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching committee activities:', error.message, error);
    showError('Erro ao carregar atividades do comitê.');
    return null;
  }

  const mappedData = data.map(ativ => ({
    ...ativ,
    assignee_name: (ativ as any).assignee ? `${(ativ as any).assignee.first_name} ${(ativ as any).assignee.last_name}` : 'N/A',
    created_by_name: (ativ as any).creator ? `${(ativ as any).creator.first_name} ${(ativ as any).creator.last_name}` : 'N/A',
    ata_reuniao_data_reuniao: (ativ as any).ata_reuniao?.data_reuniao || null,
    reuniao_titulo: (ativ as any).ata_reuniao?.reuniao?.titulo || 'N/A',
    comite_id: (ativ as any).ata_reuniao?.reuniao?.comite_id || null,
    comite_nome: (ativ as any).ata_reuniao?.reuniao?.comite?.nome || 'N/A',
  }));

  // Client-side filter for comite_id if it was provided and not 'all'
  if (params?.comite_id && params.comite_id !== 'all') {
    return mappedData.filter(ativ => ativ.comite_id === params.comite_id);
  }

  return mappedData;
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
      creator:usuarios!created_by(first_name, last_name),
      ata_reuniao:atas_reuniao(
        data_reuniao,
        reuniao:reunioes(
          titulo,
          comite_id,
          comite:comites(nome)
        )
      )
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
    ata_reuniao_data_reuniao: (data as any).ata_reuniao?.data_reuniao || null,
    reuniao_titulo: (data as any).ata_reuniao?.reuniao?.titulo || 'N/A',
    comite_id: (data as any).ata_reuniao?.reuniao?.comite_id || null,
    comite_nome: (data as any).ata_reuniao?.reuniao?.comite?.nome || 'N/A',
  };
};

export const updateAtividadeComite = async (
  id: string,
  ata_reuniao_id: string,
  titulo: string,
  descricao: string | null,
  due_date: string | null,
  status: 'todo' | 'in_progress' | 'done' | 'stopped',
  assignee_id: string | null
): Promise<AtividadeComite | null> => {
  const { data, error } = await supabase
    .from('atividades_comite')
    .update({ ata_reuniao_id, titulo, descricao, due_date, status, assignee_id, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      assignee:usuarios!assignee_id(first_name, last_name),
      creator:usuarios!created_by(first_name, last_name),
      ata_reuniao:atas_reuniao(
        data_reuniao,
        reuniao:reunioes(
          titulo,
          comite_id,
          comite:comites(nome)
        )
      )
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
    ata_reuniao_data_reuniao: (data as any).ata_reuniao?.data_reuniao || null,
    reuniao_titulo: (data as any).ata_reuniao?.reuniao?.titulo || 'N/A',
    comite_id: (data as any).ata_reuniao?.reuniao?.comite_id || null,
    comite_nome: (data as any).ata_reuniao?.reuniao?.comite?.nome || 'N/A',
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

export const getAtividadesComiteSummary = async (): Promise<AtividadeComiteSummary[] | null> => {
  const { data, error } = await supabase
    .from('atividades_comite')
    .select('status');

  if (error) {
    console.error('Error fetching committee activity summary:', error.message);
    showError('Erro ao carregar resumo de atividades do comitê.');
    return null;
  }

  const summaryMap = new Map<AtividadeComite['status'], number>();
  data.forEach(ativ => {
    const currentCount = summaryMap.get(ativ.status) || 0;
    summaryMap.set(ativ.status, currentCount + 1);
  });

  return Array.from(summaryMap.entries()).map(([status, count]) => ({ status, count }));
};