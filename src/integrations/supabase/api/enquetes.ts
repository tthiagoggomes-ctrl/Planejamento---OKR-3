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

export const getEnquetesByComiteId = async (comite_id: string): Promise<Enquete[] | null> => {
  const { data, error } = await supabase
    .from('enquetes')
    .select(`
      *,
      created_by_user:usuarios(first_name, last_name),
      opcoes_enquete(id, texto_opcao, votos_enquete(count))
    `)
    .eq('comite_id', comite_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching polls:', error.message);
    showError('Erro ao carregar enquetes.');
    return null;
  }

  return data.map(enquete => {
    const opcoes = (enquete as any).opcoes_enquete.map((opcao: any) => ({
      id: opcao.id,
      texto_opcao: opcao.texto_opcao,
      vote_count: opcao.votos_enquete[0]?.count || 0,
    }));
    const totalVotes = opcoes.reduce((sum: number, op: OpcaoEnquete) => sum + (op.vote_count || 0), 0);

    return {
      ...enquete,
      created_by_name: (enquete as any).created_by_user ? `${(enquete as any).created_by_user.first_name} ${(enquete as any).created_by_user.last_name}` : 'N/A',
      opcoes,
      total_votes: totalVotes,
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

  if (opcoes_texto.length > 0) {
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
      // Consider rolling back the poll creation if options are critical
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
  end_date: string
): Promise<Enquete | null> => {
  const { data, error } = await supabase
    .from('enquetes')
    .update({ titulo, descricao, start_date, end_date, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating poll:', error.message);
    showError(`Erro ao atualizar enquete: ${error.message}`);
    return null;
  }
  showSuccess('Enquete atualizada com sucesso!');
  return data;
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

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
    console.error('Error fetching user vote:', error.message);
    showError('Erro ao verificar seu voto.');
    return null;
  }
  return data;
};