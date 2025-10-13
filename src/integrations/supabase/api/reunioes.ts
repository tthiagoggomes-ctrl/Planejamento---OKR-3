import { supabase } from '../client';
import { showError, showSuccess } from '@/utils/toast';
import { addWeeks, addMonths, isBefore, startOfDay, endOfDay } from 'date-fns'; // NEW: For recurrence calculations

export interface Reuniao {
  id: string;
  comite_id: string;
  titulo: string;
  data_reuniao: string; // ISO string
  local: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
  created_by_name?: string; // Joined from profiles
  recurrence_type: 'none' | 'weekly' | 'bi_weekly' | 'monthly'; // NEW
  recurrence_end_date: string | null; // NEW
  recurrence_group_id: string | null; // NEW
}

export const getReunioesByComiteId = async (comite_id: string): Promise<Reuniao[] | null> => {
  const { data, error } = await supabase
    .from('reunioes')
    .select(`
      *,
      created_by_user:usuarios(first_name, last_name)
    `)
    .eq('comite_id', comite_id)
    .order('data_reuniao', { ascending: false });

  if (error) {
    console.error('Error fetching meetings:', error.message);
    showError('Erro ao carregar reuniões.');
    return null;
  }
  return data.map(reuniao => ({
    ...reuniao,
    created_by_name: (reuniao as any).created_by_user ? `${(reuniao as any).created_by_user.first_name} ${(reuniao as any).created_by_user.last_name}` : 'N/A',
  }));
};

export const createReuniao = async (
  comite_id: string,
  titulo: string,
  data_reuniao: string, // This is the start date of the first meeting
  local: string | null,
  created_by: string,
  recurrence_type: 'none' | 'weekly' | 'bi_weekly' | 'monthly' = 'none', // NEW
  recurrence_end_date: string | null = null // NEW
): Promise<Reuniao | null> => {
  let currentMeetingDate = new Date(data_reuniao);
  const endDate = recurrence_end_date ? new Date(recurrence_end_date) : null;
  const meetingsToCreate: Omit<Reuniao, 'id' | 'created_at' | 'updated_at' | 'created_by_name'>[] = [];

  // First, create the initial meeting to get its ID for recurrence_group_id
  const { data: firstMeetingData, error: firstMeetingError } = await supabase
    .from('reunioes')
    .insert({
      comite_id,
      titulo,
      data_reuniao: currentMeetingDate.toISOString(),
      local,
      created_by,
      recurrence_type,
      recurrence_end_date,
      recurrence_group_id: null, // Will be updated after first insert
    })
    .select()
    .single();

  if (firstMeetingError) {
    console.error('Error creating first meeting in series:', firstMeetingError.message);
    showError(`Erro ao criar a primeira reunião da série: ${firstMeetingError.message}`);
    return null;
  }

  const recurrenceGroupId = firstMeetingData.id;

  // Update the first meeting with its own recurrence_group_id
  const { data: updatedFirstMeetingData, error: updateFirstMeetingError } = await supabase
    .from('reunioes')
    .update({ recurrence_group_id: recurrenceGroupId })
    .eq('id', recurrenceGroupId)
    .select(`
      *,
      created_by_user:usuarios(first_name, last_name)
    `)
    .single();

  if (updateFirstMeetingError) {
    console.error('Error updating first meeting recurrence_group_id:', updateFirstMeetingError.message);
    showError(`Erro ao atualizar o grupo de recorrência da primeira reunião: ${updateFirstMeetingError.message}`);
    // Attempt to delete the partially created meeting
    await supabase.from('reunioes').delete().eq('id', recurrenceGroupId);
    return null;
  }

  if (recurrence_type !== 'none' && endDate) {
    while (isBefore(currentMeetingDate, endOfDay(endDate))) {
      let nextMeetingDate = currentMeetingDate;

      if (recurrence_type === 'weekly') {
        nextMeetingDate = addWeeks(currentMeetingDate, 1);
      } else if (recurrence_type === 'bi_weekly') {
        nextMeetingDate = addWeeks(currentMeetingDate, 2);
      } else if (recurrence_type === 'monthly') {
        nextMeetingDate = addMonths(currentMeetingDate, 1);
      }

      if (isBefore(nextMeetingDate, startOfDay(endDate)) || nextMeetingDate.toDateString() === endDate.toDateString()) {
        meetingsToCreate.push({
          comite_id,
          titulo,
          data_reuniao: nextMeetingDate.toISOString(),
          local,
          created_by,
          recurrence_type,
          recurrence_end_date,
          recurrence_group_id: recurrenceGroupId,
        });
        currentMeetingDate = nextMeetingDate;
      } else {
        break;
      }
    }

    if (meetingsToCreate.length > 0) {
      const { error: bulkInsertError } = await supabase
        .from('reunioes')
        .insert(meetingsToCreate);

      if (bulkInsertError) {
        console.error('Error creating recurring meetings:', bulkInsertError.message);
        showError(`Erro ao criar reuniões recorrentes: ${bulkInsertError.message}`);
        // Optionally, delete all meetings in the series if bulk insert fails
        await supabase.from('reunioes').delete().eq('recurrence_group_id', recurrenceGroupId);
        return null;
      }
    }
  }

  showSuccess('Reunião(ões) criada(s) com sucesso!');
  return {
    ...updatedFirstMeetingData,
    created_by_name: (updatedFirstMeetingData as any).created_by_user ? `${(updatedFirstMeetingData as any).created_by_user.first_name} ${(updatedFirstMeetingData as any).created_by_user.last_name}` : 'N/A',
  };
};

export const updateReuniao = async (
  id: string,
  titulo: string,
  data_reuniao: string,
  local: string | null,
  recurrence_type: 'none' | 'weekly' | 'bi_weekly' | 'monthly' = 'none', // NEW
  recurrence_end_date: string | null = null // NEW
): Promise<Reuniao | null> => {
  const { data, error } = await supabase
    .from('reunioes')
    .update({
      titulo,
      data_reuniao,
      local,
      recurrence_type, // NEW
      recurrence_end_date, // NEW
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(`
      *,
      created_by_user:usuarios(first_name, last_name)
    `)
    .single();

  if (error) {
    console.error('Error updating meeting:', error.message);
    showError(`Erro ao atualizar reunião: ${error.message}`);
    return null;
  }
  showSuccess('Reunião atualizada com sucesso!');
  return {
    ...data,
    created_by_name: (data as any).created_by_user ? `${(data as any).created_by_user.first_name} ${(data as any).created_by_user.last_name}` : 'N/A',
  };
};

export const deleteReuniao = async (id: string, deleteOption: 'single' | 'series'): Promise<boolean> => {
  // First, fetch the meeting to check if it's part of a recurring series
  const { data: meetingToDelete, error: fetchError } = await supabase
    .from('reunioes')
    .select('id, recurrence_group_id, recurrence_type') // Fetch recurrence_type as well
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching meeting for deletion:', fetchError.message);
    showError(`Erro ao buscar reunião para exclusão: ${fetchError.message}`);
    return false;
  }

  let deleteQuery = supabase.from('reunioes').delete();

  if (meetingToDelete.recurrence_type !== 'none' && deleteOption === 'series' && meetingToDelete.recurrence_group_id) {
    // If it's part of a series and user chose to delete the series
    deleteQuery = deleteQuery.eq('recurrence_group_id', meetingToDelete.recurrence_group_id);
  } else {
    // If it's a single meeting, or a recurring meeting but user chose to delete only this instance
    deleteQuery = deleteQuery.eq('id', id);
  }

  const { error } = await deleteQuery;

  if (error) {
    console.error('Error deleting meeting(s):', error.message);
    showError(`Erro ao excluir reunião(ões): ${error.message}`);
    return false;
  }
  showSuccess('Reunião(ões) excluída(s) com sucesso!');
  return true;
};