import { supabase } from '../client';
import { showError, showSuccess } from '@/utils/toast';
import { UserProfile } from './users'; // Import UserProfile para tipagem
import { CommitteeFormValues } from '@/components/forms/CommitteeForm'; // NOVO: Importar CommitteeFormValues

export interface Comite {
  id: string;
  nome: string;
  descricao: string | null;
  status: 'active' | 'archived';
  regras_comite?: string | null; // NOVO: Adicionado regras_comite
  // NOVOS CAMPOS DETALHADOS
  objetivo?: string | null;
  justificativa?: string | null;
  atribuicoes_comite?: string | null;
  composicao_recomendada?: string | null;
  periodicidade_reunioes?: string | null;
  fluxo_demandas?: string | null;
  criterios_priorizacao?: string | null;
  beneficios_esperados?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ComiteMember {
  comite_id: string;
  user_id: string;
  role: 'membro' | 'presidente' | 'secretario';
  created_at?: string;
  user_name?: string; // Joined from profiles
  user_area_name?: string; // MODIFICADO: Substituído user_email por user_area_name
}

// NOVO: Interface para o payload de atualização do Comitê, agora reutilizando CommitteeFormValues
export type UpdateComitePayload = CommitteeFormValues;

// A função uploadCommitteeDocument foi removida, pois não faremos mais upload de arquivos.

export const getComites = async (): Promise<Comite[] | null> => {
  const { data, error } = await supabase
    .from('comites')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Error fetching comites:', error.message);
    showError('Erro ao carregar comitês.');
    return null;
  }
  return data;
};

export const getComiteById = async (id: string): Promise<Comite | null> => {
  const { data, error } = await supabase
    .from('comites')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching comite by ID:', error.message);
    showError('Erro ao carregar comitê.');
    return null;
  }
  return data;
};

export const createComite = async (
  payload: CommitteeFormValues // NOVO: Aceita um único objeto payload
): Promise<Comite | null> => {
  const {
    nome,
    descricao,
    status,
    regras_comite,
    objetivo,
    justificativa,
    atribuicoes_comite,
    composicao_recomendada,
    periodicidade_reunioes,
    fluxo_demandas,
    criterios_priorizacao,
    beneficios_esperados,
    members // Membros são tratados separadamente
  } = payload;

  const { data: comiteData, error: comiteError } = await supabase
    .from('comites')
    .insert({
      nome,
      descricao,
      status,
      regras_comite,
      objetivo,
      justificativa,
      atribuicoes_comite,
      composicao_recomendada,
      periodicidade_reunioes,
      fluxo_demandas,
      criterios_priorizacao,
      beneficios_esperados
    })
    .select()
    .single();

  if (comiteError) {
    console.error('Error creating comite:', comiteError.message);
    showError(`Erro ao criar comitê: ${comiteError.message}`);
    return null;
  }

  if (comiteData && members && members.length > 0) { // Verifica se 'members' existe e tem itens
    const membersToInsert = members.map(member => ({
      comite_id: comiteData.id,
      user_id: member.user_id,
      role: member.role,
    }));
    const { error: membersError } = await supabase
      .from('comite_membros')
      .insert(membersToInsert);

    if (membersError) {
      console.error('Error adding committee members:', membersError.message);
      showError(`Erro ao adicionar membros ao comitê: ${membersError.message}`);
      // Optionally, roll back committee creation if members are essential
      await deleteComite(comiteData.id);
      return null;
    }
  }

  showSuccess('Comitê criado com sucesso!');
  return {
    ...comiteData,
    regras_comite,
    objetivo,
    justificativa,
    atribuicoes_comite,
    composicao_recomendada,
    periodicidade_reunioes,
    fluxo_demandas,
    criterios_priorizacao,
    beneficios_esperados
  };
};

export const updateComite = async (
  id: string,
  payload: UpdateComitePayload // Alterado para aceitar um objeto de payload
): Promise<Comite | null> => {
  const {
    nome,
    descricao,
    status,
    regras_comite,
    objetivo,
    justificativa,
    atribuicoes_comite,
    composicao_recomendada,
    periodicidade_reunioes,
    fluxo_demandas,
    criterios_priorizacao,
    beneficios_esperados,
    members // Membros são tratados separadamente, mas vêm no payload
  } = payload;

  const updateObject = {
    nome,
    descricao,
    status,
    regras_comite,
    objetivo,
    justificativa,
    atribuicoes_comite,
    composicao_recomendada,
    periodicidade_reunioes,
    fluxo_demandas,
    criterios_priorizacao,
    beneficios_esperados,
    updated_at: new Date().toISOString()
  };

  console.log('[API updateComite] Objeto de atualização enviado para Supabase:', JSON.stringify(updateObject, null, 2));

  const { data: comiteData, error: comiteError } = await supabase
    .from('comites')
    .update(updateObject)
    .eq('id', id)
    .select()
    .single();

  console.log('[API updateComite] Supabase response - Data:', JSON.stringify(comiteData, null, 2));
  console.log('[API updateComite] Supabase response - Error:', comiteError);

  if (comiteError) {
    console.error('Error updating comite:', comiteError.message);
    showError(`Erro ao atualizar comitê: ${comiteError.message}`);
    return null;
  }

  // Update members
  const { data: currentMembers, error: fetchMembersError } = await supabase
    .from('comite_membros')
    .select('user_id, role')
    .eq('comite_id', id);

  if (fetchMembersError) {
    console.error('Error fetching current committee members:', fetchMembersError.message);
    showError(`Erro ao carregar membros atuais do comitê: ${fetchMembersError.message}`);
    return null;
  }

  const currentMemberIds = new Set(currentMembers.map(m => m.user_id));
  const newMemberIds = new Set(members?.map(m => m.user_id)); // Usar payload.members e verificar se existe

  const membersToAdd = members?.filter(m => !currentMemberIds.has(m.user_id)) || [];
  const membersToUpdate = currentMembers.filter(m => newMemberIds.has(m.user_id) &&
    members?.find(nm => nm.user_id === m.user_id)?.role !== m.role
  ).map(m => ({
    user_id: m.user_id,
    role: members?.find(nm => nm.user_id === m.user_id)?.role || m.role // Obter a nova função
  }));
  const membersToRemove = currentMembers.filter(m => !newMemberIds.has(m.user_id));

  // Adicionar novos membros
  if (membersToAdd.length > 0) {
    const { error: addError } = await supabase
      .from('comite_membros')
      .insert(membersToAdd.map(m => ({ comite_id: id, user_id: m.user_id, role: m.role })));
    if (addError) {
      console.error('Error adding new members:', addError.message);
      showError(`Erro ao adicionar novos membros: ${addError.message}`);
      return null;
    }
  }

  // Atualizar funções de membros existentes
  for (const member of membersToUpdate) {
    const { error: updateRoleError } = await supabase
      .from('comite_membros')
      .update({ role: member.role })
      .eq('comite_id', id)
      .eq('user_id', member.user_id);
    if (updateRoleError) {
      console.error('Error updating member role:', updateRoleError.message);
      showError(`Erro ao atualizar função do membro: ${updateRoleError.message}`);
      return null;
    }
  }

  // Remover membros antigos
  if (membersToRemove.length > 0) {
    const { error: removeError } = await supabase
      .from('comite_membros')
      .delete()
      .eq('comite_id', id)
      .in('user_id', membersToRemove.map(m => m.user_id));
    if (removeError) {
      console.error('Error removing old members:', removeError.message);
      showError(`Erro ao remover membros antigos: ${removeError.message}`);
      return null;
    }
  }

  showSuccess('Comitê atualizado com sucesso!');
  return comiteData;
};

export const deleteComite = async (id: string): Promise<boolean> => {
  // A lógica de exclusão de documento do storage foi removida.
  const { error } = await supabase.from('comites').delete().eq('id', id);
  if (error) {
    console.error('Error deleting comite:', error.message);
    showError(`Erro ao excluir comitê: ${error.message}`);
    return false;
  }
  showSuccess('Comitê excluído com sucesso!');
  return true;
};

export const getComiteMembers = async (comite_id: string): Promise<ComiteMember[] | null> => {
  // Step 1: Fetch comite_membros data
  const { data: membersData, error: membersError } = await supabase
    .from('comite_membros')
    .select('*') // Select all columns, but don't try to join here
    .eq('comite_id', comite_id);

  if (membersError) {
    console.error('Error fetching committee members (raw):', membersError.message);
    showError('Erro ao carregar membros do comitê.');
    return null;
  }

  if (!membersData || membersData.length === 0) {
    return []; // No members found
  }

  // Step 2: Extract all user_id's
  const userIds = membersData.map(member => member.user_id);

  // Step 3: Fetch user profiles for these user_id's, including area name
  const { data: userProfiles, error: profilesError } = await supabase
    .from('usuarios')
    .select('id, first_name, last_name, area:areas(nome)') // MODIFICADO: Incluindo a área
    .in('id', userIds);

  if (profilesError) {
    console.error('Error fetching user profiles for committee members:', profilesError.message);
    showError('Erro ao carregar perfis dos membros do comitê.');
    return null;
  }

  const userProfileMap = new Map<string, Pick<UserProfile, 'id' | 'first_name' | 'last_name' | 'area_name'>>(); // Adjusted type
  userProfiles.forEach(profile => userProfileMap.set(profile.id, {
    id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    area_name: (profile as any).area?.nome || 'N/A', // Extract area name
  }));

  // Step 4: Map the results together
  return membersData.map(member => ({
    ...member,
    user_name: userProfileMap.has(member.user_id)
      ? `${userProfileMap.get(member.user_id)?.first_name} ${userProfileMap.get(member.user_id)?.last_name}`
      : 'N/A',
    user_area_name: userProfileMap.has(member.user_id)
      ? userProfileMap.get(member.user_id)?.area_name
      : 'N/A', // MODIFICADO: Usando o nome da área
  }));
};

export const addComiteMember = async (
  comite_id: string,
  user_id: string,
  role: 'membro' | 'presidente' | 'secretario'
): Promise<ComiteMember | null> => {
  const { data, error } = await supabase
    .from('comite_membros')
    .insert({ comite_id, user_id, role })
    .select(`
      *,
      user:usuarios(first_name, last_name, area:areas(nome))
    `) // Adjusted select to include area
    .single();

  if (error) {
    console.error('Error adding committee member:', error.message);
    showError(`Erro ao adicionar membro: ${error.message}`);
    return null;
  }
  showSuccess('Membro adicionado com sucesso!');
  return {
    ...data,
    user_name: (data as any).user ? `${(data as any).user.first_name} ${(data as any).user.last_name}` : 'N/A',
    user_area_name: (data as any).user?.area?.nome || 'N/A', // MODIFICADO: Usando o nome da área
  };
};

export const updateComiteMemberRole = async (
  comite_id: string,
  user_id: string,
  role: 'membro' | 'presidente' | 'secretario'
): Promise<ComiteMember | null> => {
  const { data, error } = await supabase
    .from('comite_membros')
    .update({ role })
    .eq('comite_id', comite_id)
    .eq('user_id', user_id)
    .select(`
      *,
      user:usuarios(first_name, last_name, area:areas(nome))
    `) // Adjusted select to include area
    .single();

  if (error) {
    console.error('Error updating committee member role:', error.message);
    showError(`Erro ao atualizar função do membro: ${error.message}`);
    return null;
  }
  showSuccess('Função do membro atualizada com sucesso!');
  return {
    ...data,
    user_name: (data as any).user ? `${(data as any).user.first_name} ${(data as any).user.last_name}` : 'N/A',
    user_area_name: (data as any).user?.area?.nome || 'N/A', // MODIFICADO: Usando o nome da área
  };
};

export const removeComiteMember = async (comite_id: string, user_id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('comite_membros')
    .delete()
    .eq('comite_id', comite_id)
    .eq('user_id', user_id);

  if (error) {
    console.error('Error removing committee member:', error.message);
    showError(`Erro ao remover membro: ${error.message}`);
    return false;
  }
  showSuccess('Membro removido com sucesso!');
  return true;
};