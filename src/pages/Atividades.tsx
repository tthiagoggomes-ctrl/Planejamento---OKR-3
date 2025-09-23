"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, List, Kanban, StopCircle } from "lucide-react"; // Adicionado StopCircle
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
import { AtividadeForm, AtividadeFormValues } from "@/components/forms/AtividadeForm";
import { getAtividades, createAtividade, updateAtividade, deleteAtividade, Atividade } from "@/integrations/supabase/api/atividades";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"; // Import ToggleGroup
import { KanbanBoard } from "@/components/KanbanBoard"; // Import KanbanBoard
import { useSession } from "@/components/auth/SessionContextProvider"; // Import useSession
import { getObjetivos, Objetivo } from "@/integrations/supabase/api/objetivos"; // Import Objetivo
import { getAllKeyResults, KeyResult } from "@/integrations/supabase/api/key_results"; // Import KeyResult

const Atividades = () => {
  const queryClient = useQueryClient();
  const { user, userProfile: currentUserProfile } = useSession(); // Get current user and profile
  const isAdmin = currentUserProfile?.permissao === 'administrador';
  const isDiretoria = currentUserProfile?.permissao === 'diretoria';
  const isGerente = currentUserProfile?.permissao === 'gerente';
  const isSupervisor = currentUserProfile?.permissao === 'supervisor';
  const isUsuario = currentUserProfile?.permissao === 'usuario';
  const currentUserAreaId = currentUserProfile?.area_id;

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAtividade, setEditingAtividade] = React.useState<Atividade | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [atividadeToDelete, setAtividadeToDelete] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'list' | 'kanban'>('list'); // New state for view mode

  const { data: atividades, isLoading, error } = useQuery<Atividade[], Error>({
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

  // Helper function to format due_date for API
  const formatDueDateForApi = (date: Date | string | null | undefined): string | null => {
    if (date instanceof Date) {
      return date.toISOString();
    }
    if (typeof date === 'string') {
      return date; // Already an ISO string
    }
    return null;
  };

  const createAtividadeMutation = useMutation({
    mutationFn: (values: AtividadeFormValues) =>
      createAtividade(
        values.key_result_id,
        values.user_id,
        values.titulo,
        values.descricao,
        formatDueDateForApi(values.due_date),
        values.status
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
      queryClient.invalidateQueries({ queryKey: ["allKeyResults"] }); // Invalidate KRs to recalculate progress
      setIsFormOpen(false);
      showSuccess("Atividade criada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar atividade: ${err.message}`);
    },
  });

  const updateAtividadeMutation = useMutation({
    mutationFn: ({ id, ...values }: AtividadeFormValues & { id: string }) =>
      updateAtividade(
        id,
        values.key_result_id,
        values.user_id,
        values.titulo,
        values.descricao,
        formatDueDateForApi(values.due_date),
        values.status
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
      queryClient.invalidateQueries({ queryKey: ["allKeyResults"] }); // Invalidate KRs to recalculate progress
      setIsFormOpen(false);
      setEditingAtividade(null);
      showSuccess("Atividade atualizada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar atividade: ${err.message}`);
    },
  });

  const deleteAtividadeMutation = useMutation({
    mutationFn: deleteAtividade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
      queryClient.invalidateQueries({ queryKey: ["allKeyResults"] }); // Invalidate KRs to recalculate progress
      setIsDeleteDialogOpen(false);
      setAtividadeToDelete(null);
      showSuccess("Atividade excluída com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir atividade: ${err.message}`);
    },
  });

  const handleCreateOrUpdateAtividade = (values: AtividadeFormValues) => {
    if (editingAtividade) {
      updateAtividadeMutation.mutate({ id: editingAtividade.id, ...values });
    } else {
      createAtividadeMutation.mutate(values);
    }
  };

  const handleEditClick = (atividade: Atividade) => {
    setEditingAtividade(atividade);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setAtividadeToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (atividadeToDelete) {
      deleteAtividadeMutation.mutate(atividadeToDelete);
    }
  };

  const handleStatusChangeFromKanban = (atividadeId: string, newStatus: Atividade['status']) => {
    const atividadeToUpdate = atividades?.find(ativ => ativ.id === atividadeId);
    if (atividadeToUpdate) {
      updateAtividadeMutation.mutate({
        id: atividadeToUpdate.id,
        key_result_id: atividadeToUpdate.key_result_id,
        user_id: atividadeToUpdate.user_id,
        titulo: atividadeToUpdate.titulo,
        descricao: atividadeToUpdate.descricao,
        due_date: atividadeToUpdate.due_date,
        status: newStatus,
      });
    }
  };

  const getStatusBadgeClass = (status: Atividade['status']) => {
    switch (status) {
      case 'todo': return 'bg-gray-900 text-white'; // Preto
      case 'in_progress': return 'bg-blue-600 text-white'; // Azul
      case 'done': return 'bg-green-600 text-white'; // Verde
      case 'stopped': return 'bg-red-600 text-white'; // Vermelho
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Permission checks for UI
  const canCreateAtividade = isAdmin || isDiretoria || (isGerente && currentUserAreaId) || (isSupervisor && currentUserAreaId);
  const canEditAtividade = (atividade: Atividade) => {
    const parentKr = keyResultsMap.get(atividade.key_result_id);
    const parentObjetivo = parentKr ? objetivosMap.get(parentKr.objetivo_id) : null;

    return isAdmin || isDiretoria ||
      ((isGerente || isSupervisor) && parentObjetivo && currentUserAreaId === parentObjetivo.area_id) ||
      (isUsuario && atividade.user_id === user?.id);
  };
  const canDeleteAtividade = (atividade: Atividade) => {
    const parentKr = keyResultsMap.get(atividade.key_result_id);
    const parentObjetivo = parentKr ? objetivosMap.get(parentKr.objetivo_id) : null;

    return isAdmin || isDiretoria || ((isGerente || isSupervisor) && parentObjetivo && currentUserAreaId === parentObjetivo.area_id);
  };


  if (isLoading || isLoadingObjetivos || isLoadingKeyResults) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        Erro ao carregar atividades: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Gestão de Atividades</CardTitle>
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={(value: 'list' | 'kanban') => value && setViewMode(value)}>
              <ToggleGroupItem value="list" aria-label="Visualização em Lista">
                <List className="h-4 w-4 mr-2" /> Lista
              </ToggleGroupItem>
              <ToggleGroupItem value="kanban" aria-label="Visualização em Kanban">
                <Kanban className="h-4 w-4 mr-2" /> Kanban
              </ToggleGroupItem>
            </ToggleGroup>
            {canCreateAtividade && (
              <Button onClick={() => { setEditingAtividade(null); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nova Atividade
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'list' ? (
            atividades && atividades.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Key Result</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atividades.map((atividade) => (
                    <TableRow key={atividade.id}>
                      <TableCell className="font-medium">{atividade.titulo}</TableCell>
                      <TableCell>{atividade.key_result_title}</TableCell>
                      <TableCell>{atividade.assignee_name}</TableCell>
                      <TableCell>
                        {atividade.due_date ? format(new Date(atividade.due_date), "PPP") : "N/A"}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(atividade.status)}`}>
                          {atividade.status === 'todo' && 'A Fazer'}
                          {atividade.status === 'in_progress' && 'Em Progresso'}
                          {atividade.status === 'done' && 'Concluído'}
                          {atividade.status === 'stopped' && 'Parado'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {canEditAtividade(atividade) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(atividade)}
                            className="mr-2"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                        )}
                        {canDeleteAtividade(atividade) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(atividade.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-gray-600">Nenhuma atividade cadastrada ainda.</p>
            )
          ) : (
            <KanbanBoard
              atividades={atividades || []}
              onStatusChange={handleStatusChangeFromKanban}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              objetivosMap={objetivosMap}
              keyResultsMap={keyResultsMap}
            />
          )}
        </CardContent>
      </Card>

      <AtividadeForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreateOrUpdateAtividade}
        initialData={editingAtividade}
        isLoading={createAtividadeMutation.isPending || updateAtividadeMutation.isPending}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a atividade selecionada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteAtividadeMutation.isPending}>
              {deleteAtividadeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {deleteAtividadeMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Atividades;