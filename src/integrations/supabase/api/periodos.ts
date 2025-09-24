import { supabase } from '../client';
import { showError, showSuccess } from '@/utils/toast';

export type PeriodoStatus = 'active' | 'archived';

export interface Periodo {
  id: string;
  nome: string;
  start_date: string; // ISO date string
  end_date: string;   // ISO date string
  status: PeriodoStatus;
  parent_id?: string | null; // NOVO: Adicionado parent_id
  created_at?: string;
  updated_at?: string;
}

export const getPeriodos = async (): Promise<Periodo[] | null> => {
  const { data, error } = await supabase.from('periodos').select('*');
  if (error) {
    console.error('Error fetching periods:', error.message);
    showError('Erro ao carregar períodos.');
    return null;
  }

  if (!data) return [];

  // Custom sorting logic to prioritize annual periods and then quarters
  const sortedData = data.sort((a, b) => {
    // Sort by year descending first
    const yearA = parseInt(a.nome.match(/\d{4}/)?.[0] || '0', 10);
    const yearB = parseInt(b.nome.match(/\d{4}/)?.[0] || '0', 10);

    if (yearA !== yearB) {
      return yearB - yearA;
    }

    // Then sort by parent_id (nulls first for annual periods)
    if (a.parent_id === null && b.parent_id !== null) return -1;
    if (a.parent_id !== null && b.parent_id === null) return 1;

    // Then sort by period type (Anual, Q1, Q2, Q3, Q4)
    const getPeriodTypeOrder = (name: string) => {
      if (name.includes('Anual')) return 0;
      if (name.includes('Q1')) return 1;
      if (name.includes('Q2')) return 2;
      if (name.includes('Q3')) return 3;
      if (name.includes('Q4')) return 4;
      return 99; // Fallback for unknown types
    };

    const typeOrderA = getPeriodTypeOrder(a.nome);
    const typeOrderB = getPeriodTypeOrder(b.nome);

    if (typeOrderA !== typeOrderB) {
      return typeOrderA - typeOrderB;
    }

    // Finally, sort by name alphabetically if all else is equal
    return a.nome.localeCompare(b.nome);
  });

  return sortedData;
};

export const createPeriodo = async (
  nome: string,
  start_date: string,
  end_date: string,
  status: PeriodoStatus,
  parent_id: string | null = null // NOVO: Adicionado parent_id
): Promise<Periodo | null> => {
  const { data, error } = await supabase
    .from('periodos')
    .insert({ nome, start_date, end_date, status, parent_id }) // NOVO: Inserindo parent_id
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
  status: PeriodoStatus,
  parent_id: string | null = null // NOVO: Adicionado parent_id
): Promise<Periodo | null> => {
  const { data, error } = await supabase
    .from('periodos')
    .update({ nome, start_date, end_date, status, parent_id, updated_at: new Date().toISOString() }) // NOVO: Atualizando parent_id
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