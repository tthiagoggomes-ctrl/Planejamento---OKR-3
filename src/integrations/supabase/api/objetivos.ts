import { supabase } from '../client';
import { showError } from '@/utils/toast';

export interface Objetivo {
  id: string;
  user_id: string;
  area_id: string | null;
  area_name?: string; // To display the area name in the UI
  titulo: string;
  descricao: string | null;
  periodo: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  created_at?: string;
  updated_at?: string;
}

export interface ObjetivoSummary {
  status: Objetivo['status'];
  count: number;
}

export const getObjetivos = async (): Promise<Objetivo[] | null> => {
  const { data, error } = await supabase
    .from('objetivos')
    .select('*, area:areas(nome)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching objectives:', error.message);
    showError('Erro ao carregar objetivos.');
    return null;
  }

  return data.map(obj => ({
    ...obj,
    area_name: (obj as any).area?.nome || 'N/A',
  }));
};

export const getObjetivosSummary = async (): Promise<ObjetivoSummary[] | null> => {
  const { data, error } = await supabase
    .from('objetivos')
    .select('status, count')
    .returns<{ status: Objetivo['status'], count: number }[]>();

  if (error) {
    console.error('Error fetching objective summary:', error.message);
    showError('Erro ao carregar resumo de objetivos.');
    return null;
  }
  return data;
};

export const createObjetivo = async (
  titulo: string,
  descricao: string | null,
  periodo: string,
  area_id: string | null,
  user_id: string // The user_id will be passed from the session
): Promise<Objetivo | null> => {
  const { data, error } = await supabase
    .from('objetivos')
    .insert({ titulo, descricao, periodo, area_id, user_id, status: 'draft' })
    .select('*, area:areas(nome)')
    .single();

  if (error) {
    console.error('Error creating objective:', error.message);
    showError(`Erro ao criar objetivo: ${error.message}`);
    return null;
  }
  return {
    ...data,
    area_name: (data as any).area?.nome || 'N/A',
  };
};

export const updateObjetivo = async (
  id: string,
  titulo: string,
  descricao: string | null,
  periodo: string,
  area_id: string | null,
  status: 'draft' | 'active' | 'completed' | 'archived'
): Promise<Objetivo | null> => {
  const { data, error } = await supabase
    .from('objetivos')
    .update({ titulo, descricao, periodo, area_id, status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, area:areas(nome)')
    .single();

  if (error) {
    console.error('Error updating objective:', error.message);
    showError(`Erro ao atualizar objetivo: ${error.message}`);
    return null;
  }
  return {
    ...data,
    area_name: (data as any).area?.nome || 'N/A',
  };
};

export const deleteObjetivo = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('objetivos').delete().eq('id', id);
  if (error) {
    console.error('Error deleting objective:', error.message);
    showError(`Erro ao excluir objetivo: ${error.message}`);
    return false;
  }
  return true;
};