"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ComentarioForm, ComentarioFormValues } from "@/components/forms/ComentarioForm";
import { getComentariosByAtividadeId, createComentario, updateComentario, deleteComentario, Comentario } from "@/integrations/supabase/api/comentarios";
import { getAtividades, Atividade } from "@/integrations/supabase/api/atividades";
import { showSuccess, showError } from "@/utils/toast";
import { useSession } from "@/components/auth/SessionContextProvider";
import { format } from "date-fns";

const Comentarios = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingComentario, setEditingComentario] = React.useState<Comentario | null>(null);
  const [selectedAtividadeForComment, setSelectedAtividadeForComment] = React.useState<Atividade | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [comentarioToDelete, setComentarioToDelete] = React.useState<string | null>(null);
  const [expandedAtividades, setExpandedAtividades] = React.useState<Set<string>>(new Set());

  const { data: atividades, isLoading: isLoadingAtividades, error: atividadesError } = useQuery<Atividade[], Error>({
    queryKey: ["atividades"],
    queryFn: getAtividades,
  });

  const { data: comentariosMap, isLoading: isLoadingComentarios } = useQuery<Map<string, Comentario[]>, Error>({
    queryKey: ["comentarios_by_atividade"],
    queryFn: async () => {
      if (!atividades) return new Map();
      const commentPromises = atividades.map(async (ativ) => {
        const comments = await getComentariosByAtividadeId(ativ.id);
        return [ativ.id, comments || []] as [string, Comentario[]];
      });
      const results = await Promise.all(commentPromises);
      return new Map(results);
    },
    enabled: !!atividades,
  });

  const createComentarioMutation = useMutation({
    mutationFn: (values: ComentarioFormValues) => {
      if (!user?.id || !selectedAtividadeForComment?.id) {
        throw new Error("User not authenticated or activity not selected.");
      }
      return createComentario(selectedAtividadeForComment.id, user.id, values.conteudo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comentarios_by_atividade"] });
      setIsFormOpen(false);
      setSelectedAtividadeForComment(null);
      showSuccess("Comentário adicionado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao adicionar comentário: ${err.message}`);
    },
  });

  const updateComentarioMutation = useMutation({
    mutationFn: ({ id, conteudo }: ComentarioFormValues & { id: string }) =>
      updateComentario(id, conteudo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comentarios_by_atividade"] });
      setIsFormOpen(false);
      setEditingComentario(null);
      showSuccess("Comentário atualizado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar comentário: ${err.message}`);
    },
  });

  const deleteComentarioMutation = useMutation({
    mutationFn: deleteComentario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comentarios_by_atividade"] });
      setIsDeleteDialogOpen(false);
      setComentarioToDelete(null);
      showSuccess("Comentário excluído com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir comentário: ${err.message}`);
    },
  });

  const handleAddCommentClick = (atividade: Atividade) => {
    setEditingComentario(null);
    setSelectedAtividadeForComment(atividade);
    setIsFormOpen(true);
  };

  const handleEditCommentClick = (comment: Comentario, atividade: Atividade) => {
    setEditingComentario(comment);
    setSelectedAtividadeForComment(atividade);
    setIsFormOpen(true);
  };

  const handleDeleteCommentClick = (id: string) => {
    setComentarioToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteComment = () => {
    if (comentarioToDelete) {
      deleteComentarioMutation.mutate(comentarioToDelete);
    }
  };

  const handleCreateOrUpdateComentario = (values: ComentarioFormValues) => {
    if (editingComentario) {
      updateComentarioMutation.mutate({ id: editingComentario.id, ...values });
    } else {
      createComentarioMutation.mutate(values);
    }
  };

  const toggleAtividadeExpansion = (atividadeId: string) => {
    setExpandedAtividades((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(atividadeId)) {
        newSet.delete(atividadeId);
      } else {
        newSet.add(atividadeId);
      }
      return newSet;
    });
  };

  if (isLoadingAtividades) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (atividadesError) {
    return (
      <div className="text-center text-red-500">
        Erro ao carregar atividades: {atividadesError.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Gestão de Comentários</CardTitle>
        </CardHeader>
        <CardContent>
          {atividades && atividades.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Atividade</TableHead>
                  <TableHead>Key Result</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atividades.map((atividade) => (
                  <React.Fragment key={atividade.id}>
                    <TableRow>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleAtividadeExpansion(atividade.id)}
                        >
                          {expandedAtividades.has(atividade.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span className="sr-only">Expandir/Colapsar Comentários</span>
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{atividade.titulo}</TableCell>
                      <TableCell>{atividade.key_result_title}</TableCell>
                      <TableCell>{atividade.assignee_name}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => handleAddCommentClick(atividade)}>
                          <MessageSquare className="mr-2 h-4 w-4" /> Adicionar Comentário
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedAtividades.has(atividade.id) && (
                      <TableRow>
                        <TableCell colSpan={5} className="p-0">
                          <div className="bg-gray-50 dark:bg-gray-800 p-4 border-t border-b">
                            <h4 className="text-lg font-semibold mb-3">Comentários para "{atividade.titulo}"</h4>
                            {isLoadingComentarios ? (
                              <div className="flex justify-center items-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              </div>
                            ) : (
                              comentariosMap?.get(atividade.id)?.length > 0 ? (
                                <div className="space-y-4">
                                  {comentariosMap.get(atividade.id)?.map((comment) => (
                                    <Card key={comment.id} className="p-4">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="text-sm font-semibold">{comment.author_name}</p>
                                          <p className="text-xs text-gray-500">
                                            {comment.created_at ? format(new Date(comment.created_at), "PPP 'às' HH:mm") : 'N/A'}
                                          </p>
                                          <p className="mt-2 text-gray-700 dark:text-gray-300">{comment.conteudo}</p>
                                        </div>
                                        {user?.id === comment.user_id && ( // Only allow editing/deleting own comments
                                          <div className="flex space-x-2">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleEditCommentClick(comment, atividade)}
                                            >
                                              <Edit className="h-4 w-4" />
                                              <span className="sr-only">Editar Comentário</span>
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleDeleteCommentClick(comment.id)}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                              <span className="sr-only">Excluir Comentário</span>
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-600 text-center py-4">Nenhum comentário para esta atividade.</p>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-600">Nenhuma atividade cadastrada ainda para adicionar comentários.</p>
          )}
        </CardContent>
      </Card>

      {/* Comentario Form */}
      <ComentarioForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreateOrUpdateComentario}
        initialData={editingComentario}
        isLoading={createComentarioMutation.isPending || updateComentarioMutation.isPending}
      />

      {/* Comentario Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o comentário selecionado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteComment} disabled={deleteComentarioMutation.isPending}>
              {deleteComentarioMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {deleteComentarioMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Comentarios;