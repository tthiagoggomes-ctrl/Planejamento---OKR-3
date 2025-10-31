"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { ComentarioItem } from "@/components/ComentarioItem";
import { useUserPermissions } from '@/hooks/use-user-permissions'; // Importar o hook de permissões

const Comentarios = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { can, isLoading: permissionsLoading } = useUserPermissions();

  const canViewComentarios = can('comentarios', 'view');
  const canInsertComentarios = can('comentarios', 'insert');
  const canEditComentarios = can('comentarios', 'edit');
  const canDeleteComentarios = can('comentarios', 'delete');

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingComentario, setEditingComentario] = React.useState<Comentario | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [comentarioToDelete, setComentarioToDelete] = React.useState<string | null>(null);
  const [expandedAtividades, setExpandedAtividades] = React.useState<Set<string>>(new Set());
  const [inlineCommentContent, setInlineCommentContent] = React.useState<Record<string, string>>({});

  const { data: atividades, isLoading: isLoadingAtividades, error: atividadesError } = useQuery<Atividade[] | null, Error>({
    queryKey: ["atividades"],
    queryFn: () => getAtividades(),
    enabled: canViewComentarios && !permissionsLoading, // Habilitar query apenas se tiver permissão
  });

  const { data: comentariosMap, isLoading: isLoadingComentarios } = useQuery<Map<string, Comentario[]>, Error>({
    queryKey: ["comentarios_by_atividade", atividades],
    queryFn: async ({ queryKey }) => {
      const currentAtividades = queryKey[1] as Atividade[] | null;
      if (!currentAtividades) return new Map();
      const commentPromises = currentAtividades.map(async (ativ) => {
        const comments = await getComentariosByAtividadeId(ativ.id);
        return [ativ.id, comments || []] as [string, Comentario[]];
      });
      const results = await Promise.all(commentPromises);
      return new Map(results);
    },
    enabled: !!atividades && canViewComentarios && !permissionsLoading, // Habilitar query apenas se tiver permissão
  });

  const createComentarioMutation = useMutation({
    mutationFn: ({ atividade_id, conteudo }: { atividade_id: string; conteudo: string }) => {
      if (!user?.id) {
        throw new Error("User not authenticated.");
      }
      if (!canInsertComentarios) {
        throw new Error("Você não tem permissão para criar comentários.");
      }
      return createComentario(atividade_id, user.id, conteudo);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comentarios_by_atividade"] });
      setInlineCommentContent((prev) => ({ ...prev, [variables.atividade_id]: "" }));
      showSuccess("Comentário adicionado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao adicionar comentário: ${err.message}`);
    },
  });

  const updateComentarioMutation = useMutation({
    mutationFn: ({ id, conteudo }: ComentarioFormValues & { id: string }) => {
      if (!canEditComentarios) {
        throw new Error("Você não tem permissão para editar comentários.");
      }
      return updateComentario(id, conteudo);
    },
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
    mutationFn: (id: string) => {
      if (!canDeleteComentarios) {
        throw new Error("Você não tem permissão para excluir comentários.");
      }
      return deleteComentario(id);
    },
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

  const handleAddInlineComment = (atividadeId: string) => {
    const content = inlineCommentContent[atividadeId];
    if (content && content.trim() !== "") {
      createComentarioMutation.mutate({ atividade_id: atividadeId, conteudo: content });
    } else {
      showError("O comentário não pode ser vazio.");
    }
  };

  const handleEditCommentClick = (comment: Comentario) => {
    setEditingComentario(comment);
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

  const handleUpdateComentario = (values: ComentarioFormValues) => {
    if (editingComentario) {
      updateComentarioMutation.mutate({ id: editingComentario.id, ...values });
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

  if (isLoadingAtividades || permissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewComentarios) {
    return (
      <div className="container mx-auto py-6 text-center text-red-500">
        Você não tem permissão para visualizar esta página.
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
                        {/* The "Add Comment" button is now part of the inline form */}
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
                              (comentariosMap?.get(atividade.id)?.length || 0) > 0 ? (
                                <div className="space-y-4">
                                  {comentariosMap!.get(atividade.id)!.map((comment) => (
                                    <ComentarioItem
                                      key={comment.id}
                                      comment={comment}
                                      onEdit={handleEditCommentClick}
                                      onDelete={handleDeleteCommentClick}
                                      canEditComentarios={canEditComentarios} // Pass permissions
                                      canDeleteComentarios={canDeleteComentarios}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-600 text-center py-4">Nenhum comentário para esta atividade.</p>
                              )
                            )}
                            {canInsertComentarios && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h5 className="text-md font-semibold mb-2">Adicionar novo comentário</h5>
                                <Textarea
                                  placeholder="Escreva seu comentário aqui..."
                                  value={inlineCommentContent[atividade.id] || ""}
                                  onChange={(e) => setInlineCommentContent((prev) => ({ ...prev, [atividade.id]: e.target.value }))}
                                  className="mb-2"
                                />
                                <Button
                                  onClick={() => handleAddInlineComment(atividade.id)}
                                  disabled={createComentarioMutation.isPending && createComentarioMutation.variables?.atividade_id === atividade.id}
                                >
                                  {createComentarioMutation.isPending && createComentarioMutation.variables?.atividade_id === atividade.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                  )}
                                  {createComentarioMutation.isPending && createComentarioMutation.variables?.atividade_id === atividade.id ? "Adicionando..." : "Adicionar Comentário"}
                                </Button>
                              </div>
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

      {(canInsertComentarios || canEditComentarios) && (
        <ComentarioForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleUpdateComentario}
          initialData={editingComentario}
          isLoading={updateComentarioMutation.isPending}
        />
      )}

      {canDeleteComentarios && (
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
      )}
    </div>
  );
};

export default Comentarios;