"use client";

import { supabase } from '../client';
import { showError, showSuccess } from '@/utils/toast';

export interface Enquete {
  id: string;
  comite_id: string;
  titulo: string;
  descricao: string | null;
  start_date: string; // ISO string
  end_date: string;   // ISO string
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
  created_by_name?: string; // Joined from profiles
  opcoes?: OpcaoEnquete[]; // Nested options
  total_votes?: number; // Calculated client-side or via view
  user_vote?: VotoEnquete | null; // NEW: User's vote for this poll
}

export interface OpcaoEnquete {
  id: string;
  enquete_id: string;
  texto_opcao: string;
  vote_count?: number; // Calculated client-side
}

export interface VotoEnquete {
  id: string;
  enquete_id: string;
  opcao_id: string;
  user_id: string;
  created_at?: string;
}

export const getEnquetesByComiteId = async (comite_id: string, currentUserId: string | undefined): Promise<Enquete[] | null> => {
  const { data, error } = await supabase
    .from('enquetes')
    .select(`
      *,
      created_by_user:usuarios(first_name, last_name),
      opcoes:opcoes_enquete(*),
      votos:votos_enquete(id, opcao_id, user_id)
    `)
    .eq('comite_id', comite_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching polls:', error.message);
    showError('Erro ao carregar enquetes.');
    return null;
  }

  return (data as any[]).map((enquete: any) => {
    const totalVotes = enquete.votos ? enquete.votos.length : 0;
    const userVote = currentUserId ? enquete.votos?.find((vote: VotoEnquete) => vote.user_id === currentUserId) : null;

    const optionsWithCounts = enquete.opcoes?.map((option: OpcaoEnquete) => {
      const voteCount = enquete.votos?.filter((vote: VotoEnquete) => vote.opcao_id === option.id).length || 0;
      return {
        ...option,
        vote_count: voteCount,
      };
    });

    return {
      ...enquete,
      created_by_name: enquete.created_by_user ? `${enquete.created_by_user.first_name} ${enquete.created_by_user.last_name}` : 'N/A',
      opcoes: optionsWithCounts || [],
      total_votes: totalVotes,
      user_vote: userVote || null,
    };
  });
};

export const createEnquete = async (
  comite_id: string,
  titulo: string,
  descricao: string | null,
  start_date: string,
  end_date: string,
  created_by: string,
  opcoes_texto: string[]
): Promise<Enquete | null> => {
  const { data: enqueteData, error: enqueteError } = await supabase
    .from('enquetes')
    .insert({ comite_id, titulo, descricao, start_date, end_date, created_by })
    .select()
    .single();

  if (enqueteError) {
    console.error('Error creating poll:', enqueteError.message);
    showError(`Erro ao criar enquete: ${enqueteError.message}`);
    return null;
  }

  if (enqueteData && opcoes_texto.length > 0) {
    const opcoesToInsert = opcoes_texto.map(texto_opcao => ({
      enquete_id: enqueteData.id,
      texto_opcao,
    }));
    const { error: opcoesError } = await supabase
      .from('opcoes_enquete')
      .insert(opcoesToInsert);

    if (opcoesError) {
      console.error('Error creating poll options:', opcoesError.message);
      showError(`Erro ao criar opções da enquete: ${opcoesError.message}`);
      await deleteEnquete(enqueteData.id);
      return null;
    }
  }

  showSuccess('Enquete criada com sucesso!');
  return enqueteData;
};

export const updateEnquete = async (
  id: string,
  titulo: string,
  descricao: string | null,
  start_date: string,
  end_date: string,
  opcoes_texto: string[]
): Promise<Enquete | null> => {
  const { data: enqueteData, error: enqueteError } = await supabase
    .from('enquetes')
    .update({ titulo, descricao, start_date, end_date, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (enqueteError) {
    console.error('Error updating poll:', enqueteError.message);
    showError(`Erro ao atualizar enquete: ${enqueteError.message}`);
    return null;
  }

  const { data: currentOptions, error: fetchOptionsError } = await supabase
    .from('opcoes_enquete')
    .select('id, texto_opcao')
    .eq('enquete_id', id);

  if (fetchOptionsError) {
    console.error('Error fetching current poll options:', fetchOptionsError.message);
    showError(`Erro ao carregar opções atuais da enquete: ${fetchOptionsError.message}`);
    return null;
  }

  const currentOptionsMap = new Map(currentOptions.map(opt => [opt.texto_opcao, opt.id]));
  const newOptionsSet = new Set(opcoes_texto);

  const optionsToAdd = opcoes_texto.filter(optText => !currentOptionsMap.has(optText));
  const optionsToRemove = currentOptions.filter(opt => !newOptionsSet.has(opt.texto_opcao));

  if (optionsToAdd.length > 0) {
    const { error: addError } = await supabase
      .from('opcoes_enquete')
      .insert(optionsToAdd.map(texto_opcao => ({ enquete_id: id, texto_opcao })));
    if (addError) {
      console.error('Error adding new poll options:', addError.message);
      showError(`Erro ao adicionar novas opções da enquete: ${addError.message}`);
      return null;
    }
  }

  if (optionsToRemove.length > 0) {
    const { error: removeError } = await supabase
      .from('opcoes_enquete')
      .delete()
      .eq('enquete_id', id)
      .in('id', optionsToRemove.map(opt => opt.id));
    if (removeError) {
      console.error('Error removing old poll options:', removeError.message);
      showError(`Erro ao remover opções antigas da enquete: ${removeError.message}`);
      return null;
    }
  }

  showSuccess('Enquete atualizada com sucesso!');
  return enqueteData;
};

export const deleteEnquete = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('enquetes').delete().eq('id', id);
  if (error) {
    console.error('Error deleting poll:', error.message);
    showError(`Erro ao excluir enquete: ${error.message}`);
    return false;
  }
  showSuccess('Enquete excluída com sucesso!');
  return true;
};

export const voteOnEnquete = async (
  enquete_id: string,
  opcao_id: string,
  user_id: string
): Promise<VotoEnquete | null> => {
  // First, check if the user has already voted on this poll
  const { data: existingVote, error: fetchVoteError } = await supabase
    .from('votos_enquete')
    .select('id')
    .eq('enquete_id', enquete_id)
    .eq('user_id', user_id)
    .single();

  if (fetchVoteError && fetchVoteError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
    console.error('Error checking existing vote:', fetchVoteError.message);
    showError(`Erro ao verificar voto existente: ${fetchVoteError.message}`);
    return null;
  }

  if (existingVote) {
    // If an existing vote is found, delete it first to allow changing the vote
    const { error: deleteVoteError } = await supabase
      .from('votos_enquete')
      .delete()
      .eq('id', existingVote.id);

    if (deleteVoteError) {
      console.error('Error deleting existing vote:', deleteVoteError.message);
      showError(`Erro ao alterar voto: ${deleteVoteError.message}`);
      return null;
    }
  }

  // Now insert the new vote
  const { data, error } = await supabase
    .from('votos_enquete')
    .insert({ enquete_id, opcao_id, user_id })
    .select()
    .single();

  if (error) {
    console.error('Error voting on poll:', error.message);
    showError(`Erro ao registrar voto: ${error.message}`);
    return null;
  }
  showSuccess('Voto registrado com sucesso!');
  return data;
};

export const getUserVoteForEnquete = async (enquete_id: string, user_id: string): Promise<VotoEnquete | null> => {
  const { data, error } = await supabase
    .from('votos_enquete')
    .select('*')
    .eq('enquete_id', enquete_id)
    .eq('user_id', user_id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user vote:', error.message);
    showError('Erro ao verificar seu voto.');
    return null;
  }
  return data;
};