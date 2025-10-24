import { supabase } from '../client';
import { showError } from '@/utils/toast';

export interface Area {
  id: string;
  nome: string;
  created_at?: string;
  updated_at?: string;
}

interface GetAreasParams {
  sortBy?: keyof Area;
  sortOrder?: 'asc' | 'desc';
}

export const getAreas = async (params?: GetAreasParams): Promise<Area[]> => {
  let query = supabase.from('areas').select('*');

  const sortByColumn = params?.sortBy || 'nome';
  const sortAscending = params?.sortOrder === 'asc';

  query = query.order(sortByColumn, { ascending: sortAscending });

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching areas:', error.message);
    showError('Erro ao carregar áreas.');
    return []; // Return empty array on error
  }
  return data || []; // Ensure it always returns an array
};

export const createArea = async (nome: string): Promise<Area | null> => {
  const { data, error } = await supabase.from('areas').insert({ nome }).select().single();
  if (error) {
    console.error('Error creating area:', error.message);
    showError(`Erro ao criar área: ${error.message}`);
    return null;
  }
  return data;
};

export const updateArea = async (id: string, nome: string): Promise<Area | null> => {
  const { data, error } = await supabase.from('areas').update({ nome, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) {
    console.error('Error updating area:', error.message);
    showError(`Erro ao atualizar área: ${error.message}`);
    return null;
  }
  return data;
};

export const deleteArea = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('areas').delete().eq('id', id);
  if (error) {
    console.error('Error deleting area:', error.message);
    showError(`Erro ao excluir área: ${error.message}`);
    return false;
  }
  return true;
};