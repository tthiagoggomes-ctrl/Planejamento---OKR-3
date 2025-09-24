import { supabase } from '../client';
import { showError, showSuccess } from '@/utils/toast';

export type PeriodoStatus = 'active' | 'archived';

export interface Periodo {
  id: string;
  nome: string;
  start_date: string; // ISO date string
  end_date: string;   // ISO date string
  status: PeriodoStatus;
  created_at?: string;
  updated_at?: string;
}

export const getPeriodos = async (): Promise<Periodo[] | null> => {
  const { data, error } = await supabase.from('periodos').select('*').order('start_date', { ascending: false });
  if (error) {
    console.error('Error fetching periods:', error.message);
    showError('Erro ao carregar períodos.');
    return null;
  }
  return data;
};

export const createPeriodo = async (
  nome: string,
  start_date: string,
  end_date: string,
  status: PeriodoStatus
): Promise<Periodo | null> => {
  const { data, error } = await supabase
    .from('periodos')
    .insert({ nome, start_date, end_date, status })
    .select()
    .single();
  if (error) {
    console.error('Error creating period:', error.message);
    showError(`Erro ao criar período: ${error.message}`);
    return null;
  }
  return data;
};

export const updatePeriodo = async (
  id: string,
  nome: string,
  start_date: string,
  end_date: string,
  status: PeriodoStatus
): Promise<Periodo | null> => {
  const { data, error } = await supabase
    .from('periodos')
    .update({ nome, start_date, end_date, status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Error updating period:', error.message);
    showError(`Erro ao atualizar período: ${error.message}`);
    return null;
  }
  return data;
};

export const deletePeriodo = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('periodos').delete().eq('id', id);
  if (error) {
    console.error('Error deleting period:', error.message);
    showError(`Erro ao excluir período: ${error.message}`);
    return false;
  }
  return true;
};