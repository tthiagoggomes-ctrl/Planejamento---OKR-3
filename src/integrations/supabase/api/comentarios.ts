import { supabase } from '../client';
import { showError } from '@/utils/toast';

export interface Comentario {
  id: string;
  atividade_id: string;
  user_id: string;
  conteudo: string;
  created_at?: string;
  updated_at?: string;
  author_name?: string; // Joined from profiles
}

export const getComentariosByAtividadeId = async (atividade_id: string): Promise<Comentario[] | null> => {
  const { data, error } = await supabase
    .from('comentarios')
    .select(`
      *,
      author:usuarios(first_name, last_name)
    `)
    .eq('atividade_id', atividade_id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error.message);
    showError('Erro ao carregar comentários.');
    return null;
  }

  return data.map(comment => ({
    ...comment,
    author_name: (comment as any).author ? `${(comment as any).author.first_name} ${(comment as any).author.last_name}` : 'N/A',
  }));
};

export const createComentario = async (
  atividade_id: string,
  user_id: string,
  conteudo: string
): Promise<Comentario | null> => {
  const { data, error } = await supabase
    .from('comentarios')
    .insert({ atividade_id, user_id, conteudo })
    .select(`
      *,
      author:usuarios(first_name, last_name)
    `)
    .single();

  if (error) {
    console.error('Error creating comment:', error.message);
    showError(`Erro ao criar comentário: ${error.message}`);
    return null;
  }
  return {
    ...data,
    author_name: (data as any).author ? `${(data as any).author.first_name} ${(data as any).author.last_name}` : 'N/A',
  };
};

export const updateComentario = async (
  id: string,
  conteudo: string
): Promise<Comentario | null> => {
  const { data, error } = await supabase
    .from('comentarios')
    .update({ conteudo, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      author:usuarios(first_name, last_name)
    `)
    .single();

  if (error) {
    console.error('Error updating comment:', error.message);
    showError(`Erro ao atualizar comentário: ${error.message}`);
    return null;
  }
  return {
    ...data,
    author_name: (data as any).author ? `${(data as any).author.first_name} ${(data as any).author.last_name}` : 'N/A',
  };
};

export const deleteComentario = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('comentarios').delete().eq('id', id);
  if (error) {
    console.error('Error deleting comment:', error.message);
    showError(`Erro ao excluir comentário: ${error.message}`);
    return false;
  }
  return true;
};