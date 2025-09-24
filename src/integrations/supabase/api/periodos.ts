import { supabase } from '../client';
import { showError, showSuccess } from '@/utils/toast';
import { startOfYear, endOfYear, addMonths, startOfMonth, endOfMonth, getYear } from 'date-fns'; // Importar funções de data

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

interface GetPeriodosParams {
  sortBy?: keyof Periodo;
  sortOrder?: 'asc' | 'desc';
}

export const getPeriodos = async (params?: GetPeriodosParams): Promise<Periodo[] | null> => {
  let query = supabase.from('periodos').select('*');

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching periods:', error.message);
    showError('Erro ao carregar períodos.');
    return null;
  }

  if (!data) return [];

  // Custom sorting logic to prioritize annual periods and then quarters
  const sortedData = data.sort((a, b) => {
    // If a specific sortBy is provided, use it first
    if (params?.sortBy) {
      const aValue = a[params.sortBy];
      const bValue = b[params.sortBy];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return params.sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return params.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      // Fallback for other types or if values are not comparable
    }

    // Default sorting logic (existing hierarchical sort)
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
  parent_id: string | null = null
): Promise<Periodo | null> => {
  let finalStartDate = start_date;
  let finalEndDate = end_date;
  let year: number;

  // Se o período for anual (parent_id é null), fixar as datas e extrair o ano do nome
  if (parent_id === null) {
    const yearMatch = nome.match(/\d{4}/);
    year = yearMatch ? parseInt(yearMatch[0], 10) : getYear(new Date()); // Fallback para o ano atual
    
    // FIX: Create dates in local timezone for the start and end of the year
    const fixedAnnualStartDate = new Date(year, 0, 1); // January 1st, 00:00:00 local time
    const fixedAnnualEndDate = new Date(year, 11, 31, 23, 59, 59, 999); // December 31st, 23:59:59.999 local time

    finalStartDate = fixedAnnualStartDate.toISOString();
    finalEndDate = fixedAnnualEndDate.toISOString();
  } else {
    // Para trimestres, o ano é derivado do período pai ou do nome, mas as datas são fixas
    const yearMatch = nome.match(/\d{4}/);
    year = yearMatch ? parseInt(yearMatch[0], 10) : getYear(new Date(start_date)); // Usar o ano da data de início fornecida ou do nome
  }

  const { data, error } = await supabase
    .from('periodos')
    .insert({ nome, start_date: finalStartDate, end_date: finalEndDate, status, parent_id })
    .select()
    .single();

  if (error) {
    console.error('Error creating period:', error.message);
    showError(`Erro ao criar período: ${error.message}`);
    return null;
  }

  let createdPeriod = data;

  // Se o período criado for anual (sem parent_id), criar os trimestres automaticamente
  if (parent_id === null && createdPeriod) {
    const annualPeriodId = createdPeriod.id;
    
    const quartersToCreate = [
      { name: `1º Trimestre ${year}`, start: new Date(year, 0, 1), end: new Date(year, 2, 31, 23, 59, 59, 999) }, // Jan 1 - Mar 31 local time
      { name: `2º Trimestre ${year}`, start: new Date(year, 3, 1), end: new Date(year, 5, 30, 23, 59, 59, 999) }, // Apr 1 - Jun 30 local time
      { name: `3º Trimestre ${year}`, start: new Date(year, 6, 1), end: new Date(year, 8, 30, 23, 59, 59, 999) }, // Jul 1 - Sep 30 local time
      { name: `4º Trimestre ${year}`, start: new Date(year, 9, 1), end: new Date(year, 11, 31, 23, 59, 59, 999) }, // Oct 1 - Dec 31 local time
    ];

    for (const quarter of quartersToCreate) {
      const { error: quarterError } = await supabase
        .from('periodos')
        .insert({
          nome: quarter.name,
          start_date: quarter.start.toISOString(),
          end_date: quarter.end.toISOString(),
          status: 'active',
          parent_id: annualPeriodId,
        });

      if (quarterError) {
        console.error(`Error creating quarter ${quarter.name}:`, quarterError.message);
      }
    }
  }

  return createdPeriod;
};

export const updatePeriodo = async (
  id: string,
  nome: string,
  start_date: string,
  end_date: string,
  status: PeriodoStatus,
  parent_id: string | null = null
): Promise<Periodo | null> => {
  const { data, error } = await supabase
    .from('periodos')
    .update({ nome, start_date, end_date, status, parent_id, updated_at: new Date().toISOString() })
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