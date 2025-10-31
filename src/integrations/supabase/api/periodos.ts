import { supabase } from '../client';
import { showError } from '@/utils/toast'; // Removido showSuccess
import { getYear, format, getMonth } from 'date-fns'; // Importar funções de data, incluindo getMonth
import { ptBR } from 'date-fns/locale'; // Corrigido: Importar ptBR diretamente

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

export const getPeriodos = async (params?: GetPeriodosParams): Promise<Periodo[]> => { // Changed return type to Periodo[]
  let query = supabase.from('periodos').select('*');

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching periods:', error.message);
    showError('Erro ao carregar períodos.');
    return []; // Return empty array on error
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
      if (name.includes('1º Trimestre')) return 1;
      if (name.includes('2º Trimestre')) return 2;
      if (name.includes('3º Trimestre')) return 3;
      if (name.includes('4º Trimestre')) return 4;
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
  let finalNome = nome;
  let year: number;

  // Se o período for anual (parent_id é null), fixar as datas e extrair o ano do nome
  if (parent_id === null) {
    const yearMatch = nome.match(/\d{4}/);
    year = yearMatch ? parseInt(yearMatch[0], 10) : getYear(new Date()); // Fallback para o ano atual
    
    // Create Date objects in local timezone
    const fixedAnnualStartDate = new Date(year, 0, 1, 0, 0, 0, 0); // January 1st, 00:00:00 local time
    const fixedAnnualEndDate = new Date(year, 11, 31, 23, 59, 59, 999); // December 31st, 23:59:59.999 local time

    finalStartDate = fixedAnnualStartDate.toISOString();
    finalEndDate = fixedAnnualEndDate.toISOString();
    finalNome = `Anual ${year} - Janeiro a Dezembro ${year}`; // NOVO: Formato de nome
  } else {
    // Para trimestres, o ano é derivado do período pai ou do nome, mas as datas são fixas
    const yearMatch = nome.match(/\d{4}/);
    year = yearMatch ? parseInt(yearMatch[0], 10) : getYear(new Date(start_date)); // Usar o ano da data de início fornecida ou do nome
  }

  const { data, error } = await supabase
    .from('periodos')
    .insert({ nome: finalNome, start_date: finalStartDate, end_date: finalEndDate, status, parent_id })
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
      { quarterNum: 1, startMonth: 0, endMonth: 2 }, // Jan-Mar
      { quarterNum: 2, startMonth: 3, endMonth: 5 }, // Apr-Jun
      { quarterNum: 3, startMonth: 6, endMonth: 8 }, // Jul-Sep
      { quarterNum: 4, startMonth: 9, endMonth: 11 }, // Oct-Dec
    ];

    for (const quarter of quartersToCreate) {
      const quarterStartDate = new Date(year, quarter.startMonth, 1, 0, 0, 0, 0);
      const quarterEndDate = new Date(year, quarter.endMonth + 1, 0, 23, 59, 59, 999); // Last day of the month

      const quarterName = `${quarter.quarterNum}º Trimestre ${year} - ${format(quarterStartDate, 'MMMM', { locale: ptBR })} a ${format(quarterEndDate, 'MMMM', { locale: ptBR })} ${year}`;

      const { error: quarterError } = await supabase
        .from('periodos')
        .insert({
          nome: quarterName,
          start_date: quarterStartDate.toISOString(),
          end_date: quarterEndDate.toISOString(),
          status: 'active',
          parent_id: annualPeriodId,
        });

      if (quarterError) {
        console.error(`Error creating quarter ${quarter.quarterNum}:`, quarterError.message); // Corrigido: quarter.name para quarter.quarterNum
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
  let finalNome = nome;
  let finalStartDate = start_date;
  let finalEndDate = end_date;

  // If it's an annual period (or being updated to be one), re-derive its name and dates
  if (parent_id === null) {
    const yearMatch = nome.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0], 10) : getYear(new Date(start_date));
    finalNome = `Anual ${year} - Janeiro a Dezembro ${year}`;
    finalStartDate = new Date(year, 0, 1, 0, 0, 0, 0).toISOString();
    finalEndDate = new Date(year, 11, 31, 23, 59, 59, 999).toISOString();
  } else {
    // For quarterly periods, if start_date and end_date are provided, re-derive name
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const year = getYear(startDateObj);
    const startMonthName = format(startDateObj, 'MMMM', { locale: ptBR });
    const endMonthName = format(endDateObj, 'MMMM', { locale: ptBR });

    // Attempt to infer quarter number from name if it exists, otherwise default
    let quarterNum = 0;
    if (nome.includes('1º Trimestre')) quarterNum = 1;
    else if (nome.includes('2º Trimestre')) quarterNum = 2;
    else if (nome.includes('3º Trimestre')) quarterNum = 3;
    else if (nome.includes('4º Trimestre')) quarterNum = 4;
    else {
      const startMonth = getMonth(startDateObj);
      if (startMonth >= 0 && startMonth <= 2) quarterNum = 1;
      else if (startMonth >= 3 && startMonth <= 5) quarterNum = 2;
      else if (startMonth >= 6 && startMonth <= 8) quarterNum = 3;
      else if (startMonth >= 9 && startMonth <= 11) quarterNum = 4;
    }

    if (quarterNum > 0) {
      finalNome = `${quarterNum}º Trimestre ${year} - ${startMonthName} a ${endMonthName} ${year}`;
    } else {
      // Fallback if quarter number cannot be inferred
      finalNome = `${startMonthName} a ${endMonthName} ${year}`;
    }
  }

  const { data, error } = await supabase
    .from('periodos')
    .update({ nome: finalNome, start_date: finalStartDate, end_date: finalEndDate, status, parent_id, updated_at: new Date().toISOString() })
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