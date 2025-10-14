"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, List, Kanban, Search, GanttChartSquare, ListTodo } from "lucide-react";
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
import { AtividadeComiteForm, AtividadeComiteFormValues } from "@/components/forms/AtividadeComiteForm";
import { getAtividadesComite, createAtividadeComite, updateAtividadeComite, deleteAtividadeComite, AtividadeComite } from "@/integrations/supabase/api/atividades_comite";
import { getComites, Comite } from "@/integrations/supabase/api/comites";
import { getReunioesByComiteId, Reuniao } from "@/integrations/supabase/api/reunioes";
import { getAtasReuniaoByReuniaoId, AtaReuniao } from "@/integrations/supabase/api/atas_reuniao";
import { showSuccess, showError } from "@/utils/toast";
import { format, parseISO } from "date-fns";
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
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useLocation } from "react-router-dom";
import { useSession } from "@/components/auth/SessionContextProvider";

const CommitteeActivitiesNew = () => {
  const queryClient = useQueryClient();
  const { can, isLoading: permissionsLoading } = useUserPermissions();
  const location = useLocation();
  const { user } = useSession();

  const canViewAtividadesComite = can('atividades_comite', 'view');
  const canInsertAtividadesComite = can('atividades_comite', 'insert');
  const canEditAtividadesComite = can('atividades_comite', 'edit');
  const canDeleteAtividadesComite = can('atividades_comite', 'delete');
  const canChangeActivityStatusComite = can('atividades_comite', 'change_status');

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAtividade, setEditingAtividade] = React.useState<AtividadeComite | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [atividadeToDelete, setAtividadeToDelete] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'list' | 'kanban' | 'gantt'>('kanban');

  const [selectedComiteFilter, setSelectedComiteFilter] = React.useState<string | 'all'>('all');
  const [selectedReuniaoFilter, setSelectedReuniaoFilter] = React.useState<string | 'all'>('all');
  const [selectedAtaReuniaoFilter, setSelectedAtaReuniaoFilter] = React.useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const [ganttGroupByKr, setGanttGroupByKr] = React.useState(false);
  const [ganttSortBy, setGanttSortBy] = React.useState<'date' | 'krTitle'>('date');
  const [ganttSortOrder, setGanttSortOrder] = React.useState<'asc' | 'desc'>('asc');

  React.useEffect(() => {
    if (location.state) {
      const state = location.state as { comiteId?: string; ataId?: string };
      if (state.comiteId) {
        setSelectedComiteFilter(state.comiteId);
      }
      if (state.ataId) {
        setSelectedAtaReuniaoFilter(state.ataId);
      }
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.state]);

  const { data: comites, isLoading: isLoadingComites } = useQuery<Comite[] | null, Error>({
    queryKey: ["comites"],
    queryFn: () => getComites(),
    enabled: canViewAtividadesComite && !permissionsLoading,
  });

  const { data: reunioes, isLoading: isLoadingReunioes } = useQuery<Reuniao[] | null, Error>({
    queryKey: ["reunioesForActivities", selectedComiteFilter],
    queryFn: () => {
      if (selectedComiteFilter === 'all') return null;
      return getReunioesByComiteId(selectedComiteFilter);
    },
    enabled: selectedComiteFilter !== 'all' && canViewAtividadesComite && !permissionsLoading,
  });

  const { data: atasReuniao, isLoading: isLoadingAtasReuniao } = useQuery<AtaReuniao[] | null, Error>({
    queryKey: ["atasReuniaoForActivities", selectedReuniaoFilter],
    queryFn: () => {
      if (selectedReuniaoFilter === 'all') return null;
      return getAtasReuniaoByReuniaoId(selectedReuniaoFilter);
    },
    enabled: selectedReuniaoFilter !== 'all' && canViewAtividadesComite && !permissionsLoading,
  });

  const { data: atividades, isLoading, error } = useQuery<AtividadeComite[] | null, Error>({
    queryKey: ["atividadesComite", selectedComiteFilter, selectedAtaReuniaoFilter, debouncedSearchQuery],
    queryFn: () => getAtividadesComite({
      comite_id: selectedComiteFilter,
      ata_reuniao_id: selectedAtaReuniaoFilter,
      search: debouncedSearchQuery,
    }),
    enabled: canViewAtividadesComite && !permissionsLoading,
  });

  const formatDueDateForApi = (date: Date | null | undefined): string | null => {
    if (date instanceof Date) {
      return date.toISOString();
    }
    return null;
  };

  const createAtividadeMutation = useMutation({
    mutationFn: (values: AtividadeComiteFormValues) => {
      if (!canInsertAtividadesComite) throw new Error("Você não tem permissão para criar atividades do comitê.");
      if (!user?.id) throw new Error("Usuário não autenticado.");
      return createAtividadeComite(
        values.ata_reuniao_id,
        values.titulo,
        values.descricao,
        formatDueDateForApi(values.due_date),
        values.status,
        values.assignee_id,
        user.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividadesComite"] });
      setIsFormOpen(false);
      showSuccess("Atividade do comitê criada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar atividade do comitê: ${err.message}`);
    },
  });

  const updateAtividadeMutation = useMutation({
    mutationFn: ({ id, ...values }: AtividadeComiteFormValues & { id: string }) => {
      if (!canEditAtividadesComite) throw new Error("Você não tem permissão para editar atividades do comitê.");
      return updateAtividadeComite(
        id,
        values.ata_reuniao_id,
        values.titulo,
        values.descricao,
        formatDueDateForApi(values.due_date),
        values.status,
        values.assignee_id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividadesComite"] });
      setIsFormOpen(false);
      setEditingAtividade(null);
      showSuccess("Atividade do comitê atualizada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar atividade do comitê: ${err.message}`);
    },
  });

  const deleteAtividadeMutation = useMutation({
    mutationFn: (id: string) => {
      if (!canDeleteAtividadesComite) throw new Error("Você não tem permissão para excluir atividades do comitê.");
      return deleteAtividadeComite(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividadesComite"] });
      setIsDeleteDialogOpen(false);
      setAtividadeToDelete(null);
      showSuccess("Atividade do comitê excluída com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir atividade do comitê: ${err.message}`);
    },
  });

  const handleCreateOrUpdateAtividade = (values: AtividadeComiteFormValues) => {
    if (editingAtividade) {
      updateAtividadeMutation.mutate({ id: editingAtividade.id, ...values });
    } else {
      createAtividadeMutation.mutate(values);
    }
  };

  const handleEditClick = (atividade: AtividadeComite) => {
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

  const handleStatusChangeFromKanban = (atividadeId: string, newStatus: AtividadeComite['status']) => {
    if (!canChangeActivityStatusComite) {
      showError("Você não tem permissão para alterar o status de atividades do comitê.");
      return;
    }
    const atividadeToUpdate = atividades?.find(ativ => ativ.id === atividadeId);
    if (atividadeToUpdate) {
      updateAtividadeMutation.mutate({
        id: atividadeToUpdate.id,
        ata_reuniao_id: atividadeToUpdate.ata_reuniao_id,
        titulo: atividadeToUpdate.titulo,
        descricao: atividadeToUpdate.descricao,
        due_date: atividadeToUpdate.due_date ? parseISO(atividadeToUpdate.due_date) : null,
        status: newStatus,
        assignee_id: atividadeToUpdate.assignee_id,
      });
    }
  };

  const getStatusBadgeClass = (status: AtividadeComite['status']) => {
    switch (status) {
      case 'todo': return 'bg-gray-900 text-white';
      case 'in_progress': return 'bg-blue-600 text-white';
      case 'done': return 'bg-green-600 text-white';
      case 'stopped': return 'bg-red-600 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAtividades = React.useMemo(() => {
    if (!atividades) return [];
    const query = debouncedSearchQuery.toLowerCase();
    return atividades.filter(atividade =>
      atividade.titulo.toLowerCase().includes(query) ||
      atividade.reuniao_titulo?.toLowerCase().includes(query) ||
      atividade.comite_nome?.toLowerCase().includes(query) ||
      atividade.assignee_name?.toLowerCase().includes(query)
    );
  }, [atividades, debouncedSearchQuery]);


  if (isLoading || isLoadingComites || isLoadingReunioes || isLoadingAtasReuniao || permissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewAtividadesComite) {
    return (
      <div className="container mx-auto py-6 text-center text-red-500">
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        Erro ao carregar atividades do comitê: {error.message}
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold flex items-center">
              <ListTodo className="mr-2 h-6 w-6" /> Gestão de Atividades do Comitê
            </CardTitle>
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
              {canInsertAtividadesComite && (
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
                value={selectedComiteFilter}
                onValueChange={(value: string | 'all') => {
                  setSelectedComiteFilter(value);
                  setSelectedReuniaoFilter('all');
                  setSelectedAtaReuniaoFilter('all');
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por Comitê" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Comitês</SelectItem>
                  {comites?.map((comite) => (
                    <SelectItem key={comite.id} value={comite.id}>{comite.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedReuniaoFilter}
                onValueChange={(value: string | 'all') => {
                  setSelectedReuniaoFilter(value);
                  setSelectedAtaReuniaoFilter('all');
                }}
                disabled={selectedComiteFilter === 'all' || isLoadingReunioes}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por Reunião" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Reuniões</SelectItem>
                  {isLoadingReunioes ? (
                    <SelectItem value="" disabled>Carregando reuniões...</SelectItem>
                  ) : (
                    reunioes?.map((reuniao) => (
                      <SelectItem key={reuniao.id} value={reuniao.id}>
                        {reuniao.titulo} ({format(parseISO(reuniao.data_reuniao), "PPP")})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select
                value={selectedAtaReuniaoFilter}
                onValueChange={(value: string | 'all') => setSelectedAtaReuniaoFilter(value)}
                disabled={selectedReuniaoFilter === 'all' || isLoadingAtasReuniao}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por Ata" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Atas</SelectItem>
                  {isLoadingAtasReuniao ? (
                    <SelectItem value="" disabled>Carregando atas...</SelectItem>
                  ) : (
                    atasReuniao?.map((ata) => (
                      <SelectItem key={ata.id} value={ata.id}>
                        Ata de {ata.data_reuniao ? format(parseISO(ata.data_reuniao), "PPP") : format(parseISO(ata.created_at!), "PPP")}
                      </SelectItem>
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
                      <TableHead>Comitê</TableHead>
                      <TableHead>Reunião</TableHead>
                      <TableHead>Ata de Reunião</TableHead>
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
                        <TableCell>{atividade.comite_nome}</TableCell>
                        <TableCell>{atividade.reuniao_titulo}</TableCell>
                        <TableCell>
                          {atividade.ata_reuniao_data_reuniao ? format(parseISO(atividade.ata_reuniao_data_reuniao), "PPP") : 'N/A'}
                        </TableCell>
                        <TableCell>{atividade.assignee_name}</TableCell>
                        <TableCell>
                          {atividade.due_date ? format(parseISO(atividade.due_date), "PPP") : "N/A"}
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
                          {canEditAtividadesComite && (
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
                          {canDeleteAtividadesComite && (
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
                <p className="text-gray-600">Nenhuma atividade do comitê cadastrada ainda ou correspondente aos filtros.</p>
              )
            ) : viewMode === 'kanban' ? (
              <KanbanBoard<AtividadeComite>
                atividades={filteredAtividades}
                onStatusChange={handleStatusChangeFromKanban}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                canEditAtividades={canEditAtividadesComite}
                canDeleteAtividades={canDeleteAtividadesComite}
                canChangeActivityStatus={canChangeActivityStatusComite}
              />
            ) : ( // Gantt view
              <GanttChart<AtividadeComite>
                atividades={filteredAtividades.map(a => ({ // Map to generic Atividade type for GanttChart
                  ...a,
                  key_result_title: a.reuniao_titulo, // Use meeting title as KR title for Gantt
                  key_result_objetivo_id: a.comite_id || undefined, // Use committee ID as objective ID for Gantt
                }))}
                groupByKr={ganttGroupByKr}
                onGroupByKrChange={setGanttGroupByKr}
                ganttSortBy={ganttSortBy}
                onGanttSortByChange={setGanttSortBy}
                ganttSortOrder={ganttSortOrder}
                onGanttSortOrderChange={setGanttSortOrder}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {(canInsertAtividadesComite || canEditAtividadesComite) && (
        <AtividadeComiteForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleCreateOrUpdateAtividade}
          initialData={editingAtividade}
          isLoading={createAtividadeMutation.isPending || updateAtividadeMutation.isPending}
          preselectedComiteId={selectedComiteFilter !== 'all' ? selectedComiteFilter : null}
          preselectedAtaReuniaoId={selectedAtaReuniaoFilter !== 'all' ? selectedAtaReuniaoFilter : null}
        />
      )}

      {canDeleteAtividadesComite && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente a atividade do comitê selecionada.
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
    </>
  );
};

export default CommitteeActivitiesNew;