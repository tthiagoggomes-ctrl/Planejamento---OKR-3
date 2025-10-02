import { supabase } from '../client';
import { showError } from '@/utils/toast';
import { Atividade } from './atividades'; // Import Atividade interface

export interface KeyResult {
  id: string;
  objetivo_id: string;
  user_id: string;
  titulo: string;
  tipo: 'numeric' | 'boolean' | 'percentage';
  valor_inicial: number;
  valor_meta: number;
  valor_atual: number; // This will now be derived from activities
  unidade: string | null;
  status: 'on_track' | 'at_risk' | 'off_track' | 'completed'; // This will now be derived from activities
  periodo: string; // NOVO: Período agora está no Key Result
  created_at?: string;
  updated_at?: string;
  atividades?: Atividade[]; // Add activities to the interface
}

export interface KeyResultSummary {
  status: KeyResult['status'];
  count: number;
}

/**
 * Calculates the progress percentage for a Key Result based on its activities.
 * Returns a value between 0 and 100.
 */
export const calculateKeyResultProgress = (kr: KeyResult): number => {
  if (!kr.atividades || kr.atividades.length === 0) {
    return 0;
  }

  const totalActivities = kr.atividades.length;
  const doneActivities = kr.atividades.filter(ativ => ativ.status === 'done').length;

  const progress = (doneActivities / totalActivities) * 100;
  return Math.round(progress);
};

/**
 * Determines the Key Result status based on its calculated progress.
 */
export const determineKeyResultStatus = (kr: KeyResult): KeyResult['status'] => {
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
    .select(`
      *,
      atividades(*) // Fetch nested activities
    `)
    .eq('objetivo_id', objetivo_id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching key results:', error.message);
    showError('Erro ao carregar Key Results.');
    return null;
  }

  // Calculate status and valor_atual for each KR after fetching
  return data.map(kr => {
    const calculatedProgress = calculateKeyResultProgress(kr as KeyResult);
    const calculatedStatus = determineKeyResultStatus({ ...kr, valor_atual: calculatedProgress } as KeyResult); // Pass calculated progress for status determination
    return {
      ...kr,
      valor_atual: calculatedProgress, // Set valor_atual to the calculated progress
      status: calculatedStatus, // Set status to the calculated status
    } as KeyResult;
  });
};

export const getAllKeyResults = async (objectiveId?: string | 'all'): Promise<KeyResult[] | null> => {
  let query = supabase
    .from('key_results')
    .select(`
      *,
      atividades(*) // Fetch nested activities
    `)
    .order('created_at', { ascending: true });

  if (objectiveId && objectiveId !== 'all') {
    query = query.eq('objetivo_id', objectiveId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching all key results:', error.message);
    showError('Erro ao carregar todos os Key Results.');
    return null;
  }

  // Calculate status and valor_atual for each KR after fetching
  return data.map(kr => {
    const calculatedProgress = calculateKeyResultProgress(kr as KeyResult);
    const calculatedStatus = determineKeyResultStatus({ ...kr, valor_atual: calculatedProgress } as KeyResult);
    return {
      ...kr,
      valor_atual: calculatedProgress,
      status: calculatedStatus,
    } as KeyResult;
  });
};

export const getKeyResultsSummary = async (): Promise<KeyResultSummary[] | null> => {
  const { data, error } = await supabase
    .from('key_results')
    .select(`
      *,
      atividades(*)
    `); // Select activities to calculate status client-side

  if (error) {
    console.error('Error fetching key result summary:', error.message);
    showError('Erro ao carregar resumo de Key Results.');
    return null;
  }

  // Group and count client-side based on calculated status
  const summaryMap = new Map<KeyResult['status'], number>();
  data.forEach(kr => {
    const calculatedStatus = determineKeyResultStatus(kr as KeyResult);
    const currentCount = summaryMap.get(calculatedStatus) || 0;
    summaryMap.set(calculatedStatus, currentCount + 1);
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
  unidade: string | null,
  periodo: string, // NOVO: Adicionado 'periodo'
): Promise<KeyResult | null> => {
  // Initial status and valor_atual when no activities exist
  const initialProgress = 0;
  const initialStatus = determineKeyResultStatus({ valor_inicial, valor_meta, valor_atual: initialProgress, atividades: [] } as KeyResult);

  const { data, error } = await supabase
    .from('key_results')
    .insert({
      objetivo_id,
      user_id,
      titulo,
      tipo,
      valor_inicial,
      valor_meta,
      valor_atual: initialProgress, // Set initial valor_atual to 0
      unidade,
      status: initialStatus, // Use the calculated initial status
      periodo, // NOVO: Inserir o período
    })
    .select(`
      *,
      atividades(*) // Select activities on insert to get full KR object
    `)
    .single();

  if (error) {
    console.error('Error creating key result:', error.message);
    showError(`Erro ao criar Key Result: ${error.message}`);
    return null;
  }
  // Recalculate status and valor_atual after insert (though it should be 0/off_track initially)
  const calculatedProgress = calculateKeyResultProgress(data as KeyResult);
  const calculatedStatus = determineKeyResultStatus({ ...data, valor_atual: calculatedProgress } as KeyResult);
  return { ...data, valor_atual: calculatedProgress, status: calculatedStatus } as KeyResult;
};

export const updateKeyResult = async (
  id: string,
  titulo: string,
  tipo: 'numeric' | 'boolean' | 'percentage',
  valor_inicial: number,
  valor_meta: number,
  unidade: string | null,
  periodo: string, // NOVO: Adicionado 'periodo'
): Promise<KeyResult | null> => {
  // When updating, we need to fetch current activities to determine status
  const { data: currentKr, error: fetchError } = await supabase
    .from('key_results')
    .select('*, atividades(*)')
    .eq('id', id)
    .single();

  if (fetchError || !currentKr) {
    console.error('Error fetching current KR for update:', fetchError?.message);
    showError(`Erro ao buscar Key Result para atualização: ${fetchError?.message}`);
    return null;
  }

  const calculatedProgress = calculateKeyResultProgress(currentKr as KeyResult);
  const calculatedStatus = determineKeyResultStatus({ ...currentKr, valor_atual: calculatedProgress } as KeyResult);

  const { data, error } = await supabase
    .from('key_results')
    .update({
      titulo,
      tipo,
      valor_inicial,
      valor_meta,
      valor_atual: calculatedProgress, // Update valor_atual with derived value
      unidade,
      status: calculatedStatus, // Update status with derived value
      periodo, // NOVO: Atualizar o período
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      atividades(*) // Select activities on update to get full KR object
    `)
    .single();

  if (error) {
    console.error('Error updating key result:', error.message);
    showError(`Erro ao atualizar Key Result: ${error.message}`);
    return null;
  }
  // Recalculate again to ensure consistency, though it should be the same
  const finalCalculatedProgress = calculateKeyResultProgress(data as KeyResult);
  const finalCalculatedStatus = determineKeyResultStatus({ ...data, valor_atual: finalCalculatedProgress } as KeyResult);
  return { ...data, valor_atual: finalCalculatedProgress, status: finalCalculatedStatus } as KeyResult;
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