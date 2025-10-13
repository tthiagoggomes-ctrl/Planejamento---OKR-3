"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, List, Kanban, StopCircle, Search, GanttChartSquare } from "lucide-react";
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
import { getObjetivos, Objetivo } from "@/integrations/supabase/api/objetivos";
import { getAllKeyResults, KeyResult } from "@/integrations/supabase/api/key_results";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { KanbanBoard } from "@/components/KanbanBoard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import GanttChart from "@/components/GanttChart";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUserPermissions } from '@/hooks/use-user-permissions'; // Importar o hook de permissões

const Atividades = () => {
  const queryClient = useQueryClient();
  const { can, isLoading: permissionsLoading } = useUserPermissions();

  const canViewAtividades = can('atividades', 'view');
  const canInsertAtividades = can('atividades', 'insert');
  const canEditAtividades = can('atividades', 'edit');
  const canDeleteAtividades = can('atividades', 'delete');
  const canChangeActivityStatus = can('atividades', 'change_status');

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAtividade, setEditingAtividade] = React.useState<Atividade | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [atividadeToDelete, setAtividadeToDelete] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'list' | 'kanban' | 'gantt'>('kanban');

  const [selectedObjectiveFilter, setSelectedObjectiveFilter] = React.useState<string | 'all'>('all');
  const [selectedKeyResultFilter, setSelectedKeyResultFilter] = React.useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [groupByKr, setGroupByKr] = React.useState(false);

  const [ganttSortBy, setGanttSortBy] = React.useState<'date' | 'krTitle'>('date');
  const [ganttSortOrder, setGanttSortOrder] = React.useState<'asc' | 'desc'>('asc');

  const { data: objetivos, isLoading: isLoadingObjetivos } = useQuery<Objetivo[] | null, Error>({
    queryKey: ["objetivos"],
    queryFn: () => getObjetivos(),
    enabled: canViewAtividades && !permissionsLoading, // Habilitar query apenas se tiver permissão
  });

  const { data: allKeyResults, isLoading: isLoadingAllKeyResults } = useQuery<KeyResult[] | null, Error>({
    queryKey: ["allKeyResults", selectedObjectiveFilter],
    queryFn: ({ queryKey }) => getAllKeyResults(queryKey[1] as string | 'all'),
    enabled: canViewAtividades && !permissionsLoading, // Habilitar query apenas se tiver permissão
  });

  const { data: atividades, isLoading, error } = useQuery<Atividade[] | null, Error>({
    queryKey: ["atividades", selectedObjectiveFilter, selectedKeyResultFilter, debouncedSearchQuery],
    queryFn: ({ queryKey }) => getAtividades(
      undefined,
      queryKey[1] as string | 'all',
      queryKey[2] as string | 'all'
    ),
    enabled: canViewAtividades && !permissionsLoading, // Habilitar query apenas se tiver permissão
  });

  const formatDueDateForApi = (date: Date | string | null | undefined): string | null => {
    if (date instanceof Date) {
      return date.toISOString();
    }
    if (typeof date === 'string') {
      return date;
    }
    return null;
  };

  const createAtividadeMutation = useMutation({
    mutationFn: (values: AtividadeFormValues) => {
      if (!canInsertAtividades) throw new Error("Você não tem permissão para criar atividades.");
      return createAtividade(
        values.key_result_id,
        values.user_id,
        values.titulo,
        values.descricao,
        formatDueDateForApi(values.due_date),
        values.status
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
      queryClient.invalidateQueries({ queryKey: ["allKeyResults"] });
      setIsFormOpen(false);
      showSuccess("Atividade criada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar atividade: ${err.message}`);
    },
  });

  const updateAtividadeMutation = useMutation({
    mutationFn: ({ id, ...values }: AtividadeFormValues & { id: string }) => {
      if (!canEditAtividades) throw new Error("Você não tem permissão para editar atividades.");
      return updateAtividade(
        id,
        values.key_result_id,
        values.user_id,
        values.titulo,
        values.descricao,
        formatDueDateForApi(values.due_date),
        values.status
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
      queryClient.invalidateQueries({ queryKey: ["allKeyResults"] });
      setIsFormOpen(false);
      setEditingAtividade(null);
      showSuccess("Atividade atualizada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar atividade: ${err.message}`);
    },
  });

  const deleteAtividadeMutation = useMutation({
    mutationFn: (id: string) => {
      if (!canDeleteAtividades) throw new Error("Você não tem permissão para excluir atividades.");
      return deleteAtividade(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
      queryClient.invalidateQueries({ queryKey: ["allKeyResults"] });
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
    if (!canChangeActivityStatus) {
      showError("Você não tem permissão para alterar o status de atividades.");
      return;
    }
    const atividadeToUpdate = atividades?.find(ativ => ativ.id === atividadeId);
    if (atividadeToUpdate) {
      updateAtividadeMutation.mutate({
        id: atividadeToUpdate.id,
        key_result_id: atividadeToUpdate.key_result_id,
        user_id: atividadeToUpdate.user_id,
        titulo: atividadeToUpdate.titulo,
        descricao: atividadeToUpdate.descricao,
        due_date: atividadeToUpdate.due_date ? new Date(atividadeToUpdate.due_date) : null,
        status: newStatus,
      });
    }
  };

  const getStatusBadgeClass = (status: Atividade['status']) => {
    switch (status) {
      case 'todo': return 'bg-gray-900 text-white';
      case 'in_progress': return 'bg-blue-600 text-white';
      case 'done': return 'bg-green-600 text-white';
      case 'stopped': return 'bg-red-600 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading || isLoadingObjetivos || isLoadingAllKeyResults || permissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewAtividades) {
    return (
      <div className="container mx-auto py-6 text-center text-red-500">
        Você não tem permissão para visualizar esta página.
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

  const filteredAtividades = atividades?.filter(atividade =>
    atividade.titulo.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    atividade.key_result_title?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    atividade.assignee_name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Gestão de Atividades</CardTitle>
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={(value: 'list' | 'kanban' | 'gantt') => value && setViewMode(value)}>
              <ToggleGroupItem value="list" aria-label="Visualização em Lista">
                <List className="h-4 w-4 mr-2" /> Lista
              </ToggleGroupItem>
              <ToggleGroupItem value="kanban" aria-label="Visualização em Kanban">
                <Kanban className="h-4 w-4 mr-2" /> Kanban
              </ToggleGroupItem>
              <ToggleGroupItem value="gantt" aria-label="Visualização em Gantt">
                <GanttChartSquare className="h-4 w-4 mr-2" /> Gantt
              </ToggleGroupItem>
            </ToggleGroup>
            {canInsertAtividades && (
              <Button onClick={() => { setEditingAtividade(null); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nova Atividade
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar atividades..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select
              value={selectedObjectiveFilter}
              onValueChange={(value: string | 'all') => {
                setSelectedObjectiveFilter(value);
                setSelectedKeyResultFilter('all');
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por Objetivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Objetivos</SelectItem>
                {objetivos?.map((obj) => (
                  <SelectItem key={obj.id} value={obj.id}>{obj.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedKeyResultFilter}
              onValueChange={(value: string | 'all') => setSelectedKeyResultFilter(value)}
              disabled={isLoadingAllKeyResults}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por Key Result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Key Results</SelectItem>
                {isLoadingAllKeyResults ? (
                  <SelectItem value="" disabled>Carregando KRs...</SelectItem>
                ) : (
                  allKeyResults?.map((kr) => (
                    <SelectItem key={kr.id} value={kr.id}>{kr.titulo}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {viewMode === 'list' ? (
            filteredAtividades && filteredAtividades.length > 0 ? (
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
                  {filteredAtividades.map((atividade) => (
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
                        {canEditAtividades && (
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
                        {canDeleteAtividades && (
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
              <p className="text-gray-600">Nenhuma atividade cadastrada ainda ou correspondente aos filtros.</p>
            )
          ) : viewMode === 'kanban' ? (
            <KanbanBoard
              atividades={filteredAtividades}
              onStatusChange={handleStatusChangeFromKanban}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              canEditAtividades={canEditAtividades} // Pass permissions
              canDeleteAtividades={canDeleteAtividades}
              canChangeActivityStatus={canChangeActivityStatus}
            />
          ) : ( // Gantt view
            <GanttChart
              atividades={filteredAtividades}
              groupByKr={groupByKr}
              onGroupByKrChange={setGroupByKr}
              ganttSortBy={ganttSortBy}
              onGanttSortByChange={setGanttSortBy}
              ganttSortOrder={ganttSortOrder}
              onGanttSortOrderChange={setGanttSortOrder} {/* Corrigido aqui */}
            />
          )}
        </CardContent>
      </Card>

      {canInsertAtividades && (
        <AtividadeForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleCreateOrUpdateAtividade}
          initialData={editingAtividade}
          isLoading={createAtividadeMutation.isPending || updateAtividadeMutation.isPending}
        />
      )}

      {canDeleteAtividades && (
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
      )}
    </div>
  );
};

export default Atividades;