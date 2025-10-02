"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, List, Kanban, StopCircle, Search } from "lucide-react";
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
import { getObjetivos, Objetivo } from "@/integrations/supabase/api/objetivos"; // Import Objetivo API
import { getAllKeyResults, KeyResult } from "@/integrations/supabase/api/key_results"; // Import KeyResult API
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

const Atividades = () => {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAtividade, setEditingAtividade] = React.useState<Atividade | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [atividadeToDelete, setAtividadeToDelete] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'list' | 'kanban'>('kanban');

  // Estados para filtros
  const [selectedObjectiveFilter, setSelectedObjectiveFilter] = React.useState<string | 'all'>('all');
  const [selectedKeyResultFilter, setSelectedKeyResultFilter] = React.useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const { data: objetivos, isLoading: isLoadingObjetivos } = useQuery<Objetivo[] | null, Error>({
    queryKey: ["objetivos"],
    queryFn: () => getObjetivos(),
  });

  const { data: allKeyResults, isLoading: isLoadingAllKeyResults } = useQuery<KeyResult[] | null, Error>({
    queryKey: ["allKeyResults", selectedObjectiveFilter], // Adicionar selectedObjectiveFilter como dependência
    queryFn: ({ queryKey }) => getAllKeyResults(queryKey[1] as string | 'all'), // Filtrar KRs pelo objetivo selecionado
  });

  const { data: atividades, isLoading, error } = useQuery<Atividade[] | null, Error>({
    queryKey: ["atividades", selectedObjectiveFilter, selectedKeyResultFilter, debouncedSearchQuery],
    queryFn: ({ queryKey }) => {
      const objFilter = queryKey[1] as string | 'all';
      const krFilter = queryKey[2] as string | 'all';
      console.log('UI: useQuery para atividades disparado com:', { objFilter, krFilter });
      return getAtividades(
        undefined, // limit
        objFilter, // objectiveId
        krFilter   // keyResultId
      );
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["allKeyResults"] }); // Invalidate KRs to update progress
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
      queryClient.invalidateQueries({ queryKey: ["allKeyResults"] }); // Invalidate KRs to update progress
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
      queryClient.invalidateQueries({ queryKey: ["allKeyResults"] }); // Invalidate KRs to update progress
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
        due_date: atividadeToUpdate.due_date ? new Date(atividadeToUpdate.due_date) : null, // Convert string to Date
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

  if (isLoading || isLoadingObjetivos || isLoadingAllKeyResults) {
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

  // Filtrar atividades pelo termo de busca (client-side, pois o filtro de busca não foi adicionado ao getAtividades)
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
                setSelectedKeyResultFilter('all'); // Reset KR filter when objective changes
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
              <p className="text-gray-600">Nenhuma atividade cadastrada ainda ou correspondente aos filtros.</p>
            )
          ) : (
            <KanbanBoard
              atividades={filteredAtividades}
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