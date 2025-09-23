import { supabase } from '../client';
import { showError } from '@/utils/toast';

export interface KeyResult {
  id: string;
  objetivo_id: string;
  user_id: string;
  titulo: string;
  tipo: 'numeric' | 'boolean' | 'percentage';
  valor_inicial: number;
  valor_meta: number;
  valor_atual: number;
  unidade: string | null;
  status: 'on_track' | 'at_risk' | 'off_track' | 'completed';
  created_at?: string;
  updated_at?: string;
}

export interface KeyResultSummary {
  status: KeyResult['status'];
  count: number;
}

/**
 * Calculates the progress percentage for a Key Result.
 * Returns a value between 0 and 100.
 */
export const calculateKeyResultProgress = (kr: KeyResult): number => {
  if (kr.valor_meta === kr.valor_inicial) {
    return kr.valor_atual >= kr.valor_meta ? 100 : 0;
  }

  const progress = ((kr.valor_atual - kr.valor_inicial) / (kr.valor_meta - kr.valor_inicial)) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
};

/**
 * Determines the Key Result status based on its progress.
 */
export const determineKeyResultStatus = (kr: { valor_inicial: number; valor_meta: number; valor_atual: number }): KeyResult['status'] => {
  const progress = calculateKeyResultProgress(kr);

  if (progress >= 100) {
    return 'completed';
  } else if (progress >= 75) { // Example threshold for 'on_track'
    return 'on_track';
  } else if (progress >= 40) { // Example threshold for 'at_risk'
    return 'at_risk';
  } else {
    return 'off_track';
  }
};

export const getKeyResultsByObjetivoId = async (objetivo_id: string): Promise<KeyResult[] | null> => {
  const { data, error } = await supabase
    .from('key_results')
    .select('*')
    .eq('objetivo_id', objetivo_id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching key results:', error.message);
    showError('Erro ao carregar Key Results.');
    return null;
  }
  return data;
};

export const getAllKeyResults = async (): Promise<KeyResult[] | null> => {
  const { data, error } = await supabase
    .from('key_results')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching all key results:', error.message);
    showError('Erro ao carregar todos os Key Results.');
    return null;
  }
  return data;
};

export const getKeyResultsSummary = async (): Promise<KeyResultSummary[] | null> => {
  const { data, error } = await supabase
    .from('key_results')
    .select('status'); // Select only the status column

  if (error) {
    console.error('Error fetching key result summary:', error.message);
    showError('Erro ao carregar resumo de Key Results.');
    return null;
  }

  // Group and count client-side
  const summaryMap = new Map<KeyResult['status'], number>();
  data.forEach(kr => {
    const currentCount = summaryMap.get(kr.status) || 0;
    summaryMap.set(kr.status, currentCount + 1);
  });

  return Array.from(summaryMap.entries()).map(([status, count]) => ({ status, count }));
};

export const createKeyResult = async (
  objetivo_id: string,
  user_id: string,
  titulo: string,
  tipo: 'numeric' | 'boolean' | 'percentage',
  valor_inicial: number,
  valor_meta: number,
  valor_atual: number,
  unidade: string | null,
  // status: 'on_track' | 'at_risk' | 'off_track' | 'completed' // Status will be determined automatically
): Promise<KeyResult | null> => {
  const calculatedStatus = determineKeyResultStatus({ valor_inicial, valor_meta, valor_atual });

  const { data, error } = await supabase
    .from('key_results')
    .insert({
      objetivo_id,
      user_id,
      titulo,
      tipo,
      valor_inicial,
      valor_meta,
      valor_atual,
      unidade,
      status: calculatedStatus, // Use the calculated status
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating key result:', error.message);
    showError(`Erro ao criar Key Result: ${error.message}`);
    return null;
  }
  return data;
};

export const updateKeyResult = async (
  id: string,
  titulo: string,
  tipo: 'numeric' | 'boolean' | 'percentage',
  valor_inicial: number,
  valor_meta: number,
  valor_atual: number,
  unidade: string | null,
  // status: 'on_track' | 'at_risk' | 'off_track' | 'completed' // Status will be determined automatically
): Promise<KeyResult | null> => {
  const calculatedStatus = determineKeyResultStatus({ valor_inicial, valor_meta, valor_atual });

  const { data, error } = await supabase
    .from('key_results')
    .update({
      titulo,
      tipo,
      valor_inicial,
      valor_meta,
      valor_atual,
      unidade,
      status: calculatedStatus, // Use the calculated status
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating key result:', error.message);
    showError(`Erro ao atualizar Key Result: ${error.message}`);
    return null;
  }
  return data;
};

export const deleteKeyResult = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('key_results').delete().eq('id', id);
  if (error) {
    console.error('Error deleting key result:', error.message);
    showError(`Erro ao excluir Key Result: ${error.message}`);
    return false;
  }
  return true;
};