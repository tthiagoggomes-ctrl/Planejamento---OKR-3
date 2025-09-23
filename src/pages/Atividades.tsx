"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, List, Kanban } from "lucide-react"; // Changed LayoutKanban to Kanban
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

const Atividades = () => {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAtividade, setEditingAtividade] = React.useState<Atividade | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [atividadeToDelete, setAtividadeToDelete] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'list' | 'kanban'>('list'); // New state for view mode

  const { data: atividades, isLoading, error } = useQuery<Atividade[], Error>({
    queryKey: ["atividades"],
    queryFn: getAtividades,
  });

  const createAtividadeMutation = useMutation({
    mutationFn: (values: AtividadeFormValues) =>
      createAtividade(
        values.key_result_id,
        values.user_id,
        values.titulo,
        values.descricao,
        values.due_date ? values.due_date.toISOString() : null,
        values.status
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
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
        values.due_date ? values.due_date.toISOString() : null,
        values.status
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
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
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'done': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
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
            <Button onClick={() => { setEditingAtividade(null); setIsFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Atividade
            </Button>
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
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(atividade)}
                          className="mr-2"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(atividade.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Excluir</span>
                        </Button>
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