import { supabase } from '../client';
import { showError, showSuccess } from '@/utils/toast';
import { UserProfile } from './users'; // Import UserProfile para tipagem

export interface Comite {
  id: string;
  nome: string;
  descricao: string | null;
  status: 'active' | 'archived';
  document_url?: string | null; // NOVO: Adicionado document_url
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

/**
 * Uploads a committee document to Supabase Storage.
 * @param file The file to upload.
 * @param comiteId The ID of the committee.
 * @param existingUrl Optional: The existing URL of the document to replace/delete.
 * @returns The public URL of the uploaded file, or null if an error occurred.
 */
export const uploadCommitteeDocument = async (file: File, comiteId: string, existingUrl: string | null = null): Promise<string | null> => {
  try {
    // If there's an existing URL, try to delete the old file first
    if (existingUrl) {
      const oldFilePath = existingUrl.split('storage/v1/object/public/committee-documents/')[1];
      if (oldFilePath) {
        const { error: deleteError } = await supabase.storage.from('committee-documents').remove([oldFilePath]);
        if (deleteError) {
          console.warn('Warning: Could not delete old document from storage:', deleteError.message);
          // Don't fail the entire upload if old file deletion fails
        }
      }
    }

    const filePath = `${comiteId}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('committee-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading committee document:', error.message);
      showError(`Erro ao fazer upload do documento: ${error.message}`);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('committee-documents')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;

  } catch (error: any) {
    console.error('Unhandled error in uploadCommitteeDocument:', error.message);
    showError(`Erro inesperado ao fazer upload do documento: ${error.message}`);
    return null;
  }
};


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
  nome: string,
  descricao: string | null,
  status: 'active' | 'archived' = 'active',
  members: { user_id: string; role: 'membro' | 'presidente' | 'secretario' }[] = [],
  documentFile: File | null = null // NOVO: Parâmetro para o arquivo
): Promise<Comite | null> => {
  const { data: comiteData, error: comiteError } = await supabase
    .from('comites')
    .insert({ nome, descricao, status })
    .select()
    .single();

  if (comiteError) {
    console.error('Error creating comite:', comiteError.message);
    showError(`Erro ao criar comitê: ${comiteError.message}`);
    return null;
  }

  let document_url: string | null = null;
  if (comiteData && documentFile) {
    document_url = await uploadCommitteeDocument(documentFile, comiteData.id);
    if (document_url) {
      const { error: updateError } = await supabase
        .from('comites')
        .update({ document_url })
        .eq('id', comiteData.id);
      if (updateError) {
        console.error('Error updating committee with document URL:', updateError.message);
        showError(`Erro ao salvar URL do documento: ${updateError.message}`);
      }
    }
  }

  if (comiteData && members.length > 0) {
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
  return { ...comiteData, document_url };
};

export const updateComite = async (
  id: string,
  nome: string,
  descricao: string | null,
  status: 'active' | 'archived',
  members: { user_id: string; role: 'membro' | 'presidente' | 'secretario' }[] = [],
  documentFile: File | null = null, // NOVO: Parâmetro para o arquivo
  existingDocumentUrl: string | null = null // NOVO: URL existente para substituição
): Promise<Comite | null> => {
  let updatedDocumentUrl: string | null = existingDocumentUrl;

  if (documentFile) {
    updatedDocumentUrl = await uploadCommitteeDocument(documentFile, id, existingDocumentUrl);
  } else if (existingDocumentUrl === null && documentFile === null) {
    // If document was removed (existingDocumentUrl is null and no new file)
    // We need to explicitly set document_url to null in DB
    updatedDocumentUrl = null;
  }

  const { data: comiteData, error: comiteError } = await supabase
    .from('comites')
    .update({ nome, descricao, status, document_url: updatedDocumentUrl, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

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
  const newMemberIds = new Set(members.map(m => m.user_id));

  const membersToAdd = members.filter(m => !currentMemberIds.has(m.user_id));
  const membersToUpdate = members.filter(m => currentMemberIds.has(m.user_id) &&
    currentMembers.find(cm => cm.user_id === m.user_id)?.role !== m.role
  );
  const membersToRemove = currentMembers.filter(m => !newMemberIds.has(m.user_id));

  // Add new members
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

  // Update existing members' roles
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

  // Remove old members
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
  // Optionally, delete associated document from storage
  const { data: comiteData, error: fetchError } = await supabase
    .from('comites')
    .select('document_url')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.warn('Warning: Could not fetch committee document_url for deletion:', fetchError.message);
  } else if (comiteData?.document_url) {
    const filePath = comiteData.document_url.split('storage/v1/object/public/committee-documents/')[1];
    if (filePath) {
      const { error: deleteFileError } = await supabase.storage.from('committee-documents').remove([filePath]);
      if (deleteFileError) {
        console.warn('Warning: Could not delete committee document from storage:', deleteFileError.message);
      }
    }
  }

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