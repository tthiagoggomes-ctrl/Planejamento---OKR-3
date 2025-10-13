"use client";

import { supabase } from '../client';
import { showError } from '@/utils/toast';

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
}

export const getAtividadesComiteByAtaId = async (ata_reuniao_id: string): Promise<AtividadeComite[] | null> => {
  console.log(`Fetching committee activities for ata_reuniao_id: ${ata_reuniao_id}`);
  const { data, error } = await supabase
    .from('atividades_comite')
    .select(`
      *,
      assignee:usuarios!assignee_id(first_name, last_name),
      creator:usuarios!created_by(first_name, last_name)
    `)
    .eq('ata_reuniao_id', ata_reuniao_id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching committee activities:', error.message, error); // Log do objeto de erro completo
    showError('Erro ao carregar atividades do comitê.');
    return null;
  }
  console.log(`Successfully fetched ${data?.length || 0} committee activities.`);
  return data.map(ativ => ({
    ...ativ,
    assignee_name: (ativ as any).assignee ? `${(ativ as any).assignee.first_name} ${(ativ as any).assignee.last_name}` : 'N/A',
    created_by_name: (ativ as any).creator ? `${(ativ as any).creator.first_name} ${(ativ as any).creator.last_name}` : 'N/A',
  }));
};