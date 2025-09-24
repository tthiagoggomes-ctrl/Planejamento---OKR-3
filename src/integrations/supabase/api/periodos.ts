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
  const { data, error } = await supabase.from('periodos').select('*'); // Fetch all periods without initial ordering
  if (error) {
    console.error('Error fetching periods:', error.message);
    showError('Erro ao carregar períodos.');
    return null;
  }

  if (!data) return [];

  // Custom sorting logic
  const sortedData = data.sort((a, b) => {
    // Extract year from 'nome' (e.g., "Q1 2025" -> 2025, "Anual 2025" -> 2025)
    const yearA = parseInt(a.nome.match(/\d{4}/)?.[0] || '0', 10);
    const yearB = parseInt(b.nome.match(/\d{4}/)?.[0] || '0', 10);

    // Define order for period types
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

    // Primary sort: year descending
    if (yearA !== yearB) {
      return yearB - yearA;
    }

    // Secondary sort: period type ascending (Anual, Q1, Q2, Q3, Q4)
    return typeOrderA - typeOrderB;
  });

  return sortedData;
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