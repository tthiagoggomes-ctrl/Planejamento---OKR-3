import { supabase } from '../client';
import { showError, showSuccess } from '@/utils/toast';
import { CommitteeFormValues } from '@/components/forms/CommitteeForm';

export interface Comite {
  id: string;
  nome: string;
  descricao: string | null;
  status: 'active' | 'archived';
  regras_comite?: string | null;
  objetivo?: string | null;
  justificativa?: string | null;
  atribuicoes_comite?: string | null;
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
  cargo_funcao?: string | null;
  created_at?: string;
  user_name?: string;
  user_area_name?: string;
}

export type UpdateComitePayload = CommitteeFormValues;

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
  payload: CommitteeFormValues
): Promise<Comite | null> => {
  const {
    nome,
    descricao,
    status,
    regras_comite,
    objetivo,
    justificativa,
    atribuicoes_comite,
    periodicidade_reunioes,
    fluxo_demandas,
    criterios_priorizacao,
    beneficios_esperados,
    members
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

  if (comiteData && members && members.length > 0) {
    const membersToInsert = members.map(member => ({
      comite_id: comiteData.id,
      user_id: member.user_id,
      role: member.role,
      cargo_funcao: member.cargo_funcao,
    }));
    const { error: membersError } = await supabase
      .from('comite_membros')
      .insert(membersToInsert);

    if (membersError) {
      console.error('Error adding committee members:', membersError.message);
      showError(`Erro ao adicionar membros ao comitê: ${membersError.message}`);
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
    periodicidade_reunioes,
    fluxo_demandas,
    criterios_priorizacao,
    beneficios_esperados
  };
};

export const updateComite = async (
  id: string,
  payload: UpdateComitePayload
): Promise<Comite | null> => {
  const {
    nome,
    descricao,
    status,
    regras_comite,
    objetivo,
    justificativa,
    atribuicoes_comite,
    periodicidade_reunioes,
    fluxo_demandas,
    criterios_priorizacao,
    beneficios_esperados,
    members
  } = payload;

  const updateObject = {
    nome,
    descricao,
    status,
    regras_comite,
    objetivo,
    justificativa,
    atribuicoes_comite,
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
    .select('user_id, role, cargo_funcao')
    .eq('comite_id', id);

  if (fetchMembersError) {
    console.error('Error fetching current committee members:', fetchMembersError.message);
    showError(`Erro ao carregar membros atuais do comitê: ${fetchMembersError.message}`);
    return null;
  }

  const currentMemberMap = new Map(currentMembers.map(m => [m.user_id, m]));
  const newMemberIds = new Set(members?.map(m => m.user_id));

  const membersToAdd = (members || []).filter(m => !currentMemberMap.has(m.user_id));
  const membersToUpdate = (members || []).filter(m => {
    const existing = currentMemberMap.get(m.user_id);
    return existing && (existing.role !== m.role || existing.cargo_funcao !== m.cargo_funcao);
  });
  const membersToRemove = currentMembers.filter(m => !newMemberIds.has(m.user_id));

  // Adicionar novos membros
  if (membersToAdd.length > 0) {
    const { error: addError } = await supabase
      .from('comite_membros')
      .insert(membersToAdd.map(m => ({ comite_id: id, user_id: m.user_id, role: m.role, cargo_funcao: m.cargo_funcao })));
    if (addError) {
      console.error('Error adding new members:', addError.message);
      showError(`Erro ao adicionar novos membros: ${addError.message}`);
      return null;
    }
  }

  // Atualizar funções e cargos de membros existentes
  for (const member of membersToUpdate) {
    const { error: updateRoleError } = await supabase
      .from('comite_membros')
      .update({ role: member.role, cargo_funcao: member.cargo_funcao })
      .eq('comite_id', id)
      .eq('user_id', member.user_id);
    if (updateRoleError) {
      console.error('Error updating member role/cargo:', updateRoleError.message);
      showError(`Erro ao atualizar função/cargo do membro: ${updateRoleError.message}`);
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
  const { error } = await supabase.from('comites').delete().eq('id', id);
  if (error) {
    console.error('Error deleting comite:', error.message);
    showError(`Erro ao excluir comitê: ${error.message}`);
    return false;
  }
  return true;
};

export const getComiteMembers = async (comite_id: string): Promise<ComiteMember[] | null> => {
  const { data: membersData, error: membersError } = await supabase
    .from('comite_membros')
    .select('*, user:usuarios(first_name, last_name, area:areas(nome))')
    .eq('comite_id', comite_id);

  if (membersError) {
    console.error('Error fetching committee members:', membersError.message);
    showError('Erro ao carregar membros do comitê.');
    return null;
  }

  return (membersData || []).map((member: any) => ({
    ...member,
    user_name: member.user ? `${member.user.first_name} ${member.user.last_name}` : 'N/A',
    user_area_name: member.user?.area?.nome || 'N/A',
  }));
};

export const addComiteMember = async (
  comite_id: string,
  user_id: string,
  role: 'membro' | 'presidente' | 'secretario',
  cargo_funcao: string | null
): Promise<ComiteMember | null> => {
  const { data, error } = await supabase
    .from('comite_membros')
    .insert({ comite_id, user_id, role, cargo_funcao })
    .select(`
      *,
      user:usuarios(first_name, last_name, area:areas(nome))
    `)
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
    user_area_name: (data as any).user?.area?.nome || 'N/A',
  };
};

export const updateComiteMemberRole = async (
  comite_id: string,
  user_id: string,
  role: 'membro' | 'presidente' | 'secretario',
  cargo_funcao: string | null
): Promise<ComiteMember | null> => {
  const { data, error } = await supabase
    .from('comite_membros')
    .update({ role, cargo_funcao })
    .eq('comite_id', comite_id)
    .eq('user_id', user_id)
    .select(`
      *,
      user:usuarios(first_name, last_name, area:areas(nome))
    `)
    .single();

  if (error) {
    console.error('Error updating committee member role/cargo:', error.message);
    showError(`Erro ao atualizar função/cargo do membro: ${error.message}`);
    return null;
  }
  showSuccess('Função e cargo do membro atualizados com sucesso!');
  return {
    ...data,
    user_name: (data as any).user ? `${(data as any).user.first_name} ${(data as any).user.last_name}` : 'N/A',
    user_area_name: (data as any).user?.area?.nome || 'N/A',
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