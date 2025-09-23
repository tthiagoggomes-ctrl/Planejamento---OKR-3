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
import { Textarea } from "@/components/ui/textarea"; // Import Textarea for inline form
import { ComentarioItem } from "@/components/ComentarioItem"; // Import the new ComentarioItem
import { getObjetivos, Objetivo } from "@/integrations/supabase/api/objetivos"; // Import Objetivo
import { getAllKeyResults, KeyResult } from "@/integrations/supabase/api/key_results"; // Import KeyResult

const Comentarios = () => {
  const queryClient = useQueryClient();
  const { user, userProfile: currentUserProfile } = useSession();
  const isAdmin = currentUserProfile?.permissao === 'administrador';
  const isDiretoria = currentUserProfile?.permissao === 'diretoria';
  const isGerente = currentUserProfile?.permissao === 'gerente';
  const isSupervisor = currentUserProfile?.permissao === 'supervisor';
  const isUsuario = currentUserProfile?.permissao === 'usuario';
  const currentUserAreaId = currentUserProfile?.area_id;

  const [isFormOpen, setIsFormOpen] = React.useState(false); // For editing existing comments
  const [editingComentario, setEditingComentario] = React.useState<Comentario | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [comentarioToDelete, setComentarioToDelete] = React.useState<string | null>(null);
  const [expandedAtividades, setExpandedAtividades] = React.useState<Set<string>>(new Set());
  const [inlineCommentContent, setInlineCommentContent] = React.useState<Record<string, string>>({}); // For inline comment input

  const { data: atividades, isLoading: isLoadingAtividades, error: atividadesError } = useQuery<Atividade[], Error>({
    queryKey: ["atividades"],
    queryFn: getAtividades,
  });

  const { data: objetivos, isLoading: isLoadingObjetivos } = useQuery<Objetivo[], Error>({
    queryKey: ["objetivos"],
    queryFn: getObjetivos,
  });

  const { data: keyResults, isLoading: isLoadingKeyResults } = useQuery<KeyResult[], Error>({
    queryKey: ["allKeyResults"],
    queryFn: getAllKeyResults,
  });

  const objetivosMap = React.useMemo(() => {
    return new Map(objetivos?.map(obj => [obj.id, obj]) || []);
  }, [objetivos]);

  const keyResultsMap = React.useMemo(() => {
    return new Map(keyResults?.map(kr => [kr.id, kr]) || []);
  }, [keyResults]);

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
    mutationFn: ({ atividade_id, conteudo }: { atividade_id: string; conteudo: string }) => {
      if (!user?.id) {
        throw new Error("User not authenticated.");
      }
      return createComentario(atividade_id, user.id, conteudo);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comentarios_by_atividade"] });
      setInlineCommentContent((prev) => ({ ...prev, [variables.atividade_id]: "" })); // Clear inline input
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

  // Permission checks for UI
  const canAddComment = (atividade: Atividade) => {
    const parentKr = keyResultsMap.get(atividade.key_result_id);
    const parentObjetivo = parentKr ? objetivosMap.get(parentKr.objetivo_id) : null;

    return isAdmin || isDiretoria ||
      ((isGerente || isSupervisor || isUsuario) && parentObjetivo && currentUserAreaId === parentObjetivo.area_id) ||
      (isUsuario && atividade.user_id === user?.id);
  };

  if (isLoadingAtividades || isLoadingObjetivos || isLoadingKeyResults) {
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
                              comentariosMap?.get(atividade.id)?.length > 0 ? (
                                <div className="space-y-4">
                                  {comentariosMap.get(atividade.id)?.map((comment) => (
                                    <ComentarioItem
                                      key={comment.id}
                                      comment={comment}
                                      onEdit={handleEditCommentClick}
                                      onDelete={handleDeleteCommentClick}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-600 text-center py-4">Nenhum comentário para esta atividade.</p>
                              )
                            )}
                            {canAddComment(atividade) && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h5 className="text-md font-semibold mb-2">Adicionar novo comentário</h5>
                                <Textarea
                                  placeholder="Escreva seu comentário aqui..."
                                  value={inlineCommentContent[atividade.id] || ""}
                                  onChange={(e) => setInlineCommentContent((prev) => ({ ...prev, [atividade.id]: e.target.value }))}
                                  className="mb-2"
                                  disabled={!canAddComment(atividade)}
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

      {/* Comentario Form (for editing existing comments) */}
      <ComentarioForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleUpdateComentario}
        initialData={editingComentario}
        isLoading={updateComentarioMutation.isPending}
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