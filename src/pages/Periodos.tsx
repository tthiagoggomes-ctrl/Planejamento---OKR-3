"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, CalendarDays, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PeriodoForm, PeriodoFormValues } from "@/components/forms/PeriodoForm";
import { getPeriodos, createPeriodo, updatePeriodo, deletePeriodo, Periodo } from "@/integrations/supabase/api/periodos";
import { showSuccess, showError } from "@/utils/toast";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useUserPermissions } from '@/hooks/use-user-permissions'; // Importar o hook de permissões

const Periodos = () => {
  const queryClient = useQueryClient();
  const { can, isLoading: permissionsLoading } = useUserPermissions();

  const canViewPeriods = can('periodos', 'view');
  const canInsertPeriods = can('periodos', 'insert');
  const canEditPeriods = can('periodos', 'edit');
  const canDeletePeriods = can('periodos', 'delete');

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingPeriodo, setEditingPeriodo] = React.useState<Periodo | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [periodoToDelete, setPeriodoToDelete] = React.useState<string | null>(null);
  const [parentPeriodIdForNewQuarter, setParentPeriodIdForNewQuarter] = React.useState<string | null>(null);
  const [expandedAnnualPeriods, setExpandedAnnualPeriods] = React.useState<Set<string>>(new Set());

  const [sortBy, setSortBy] = React.useState<keyof Periodo>('nome');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  const { data: allPeriods, isLoading, error } = useQuery<Periodo[], Error>({
    queryKey: ["periodos", { sortBy, sortOrder }],
    queryFn: () => getPeriodos({ sortBy, sortOrder }),
    enabled: canViewPeriods && !permissionsLoading, // Habilitar query apenas se tiver permissão
  });

  const { annualPeriods, quarterlyPeriodsMap } = React.useMemo(() => {
    const annual: Periodo[] = [];
    const quarterlyMap = new Map<string, Periodo[]>();

    allPeriods?.forEach(period => {
      if (period.parent_id === null) {
        annual.push(period);
      } else {
        const parentId = period.parent_id;
        if (!quarterlyMap.has(parentId)) {
          quarterlyMap.set(parentId, []);
        }
        quarterlyMap.get(parentId)?.push(period);
      }
    });

    quarterlyMap.forEach((quarters) => {
      quarters.sort((a, b) => {
        const getQuarterOrder = (name: string) => {
          if (name.includes('1º Trimestre')) return 1;
          if (name.includes('2º Trimestre')) return 2;
          if (name.includes('3º Trimestre')) return 3;
          if (name.includes('4º Trimestre')) return 4;
          return 99;
        };
        return getQuarterOrder(a.nome) - getQuarterOrder(b.nome);
      });
    });

    return { annualPeriods: annual, quarterlyPeriodsMap: quarterlyMap };
  }, [allPeriods]);

  const createPeriodoMutation = useMutation({
    mutationFn: (values: PeriodoFormValues) =>
      createPeriodo(
        values.nome,
        values.start_date.toISOString(),
        values.end_date.toISOString(),
        values.status,
        values.parent_id
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos"] });
      setIsFormOpen(false);
      setParentPeriodIdForNewQuarter(null);
      showSuccess("Período criado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar período: ${err.message}`);
    },
  });

  const updatePeriodoMutation = useMutation({
    mutationFn: ({ id, ...values }: PeriodoFormValues & { id: string }) =>
      updatePeriodo(
        id,
        values.nome,
        values.start_date.toISOString(),
        values.end_date.toISOString(),
        values.status,
        values.parent_id
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos"] });
      setIsFormOpen(false);
      setEditingPeriodo(null);
      setParentPeriodIdForNewQuarter(null);
      showSuccess("Período atualizado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar período: ${err.message}`);
    },
  });

  const deletePeriodoMutation = useMutation({
    mutationFn: deletePeriodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos"] });
      setIsDeleteDialogOpen(false);
      setPeriodoToDelete(null);
      showSuccess("Período excluído com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir período: ${err.message}`);
    },
  });

  const handleCreateOrUpdatePeriodo = (values: PeriodoFormValues) => {
    if (editingPeriodo) {
      updatePeriodoMutation.mutate({ id: editingPeriodo.id, ...values });
    } else {
      createPeriodoMutation.mutate(values);
    }
  };

  const handleAddAnnualPeriodClick = () => {
    setEditingPeriodo(null);
    setParentPeriodIdForNewQuarter(null);
    setIsFormOpen(true);
  };

  const handleAddQuarterClick = (annualPeriodId: string) => {
    setEditingPeriodo(null);
    setParentPeriodIdForNewQuarter(annualPeriodId);
    setIsFormOpen(true);
  };

  const handleEditClick = (periodo: Periodo) => {
    setEditingPeriodo(periodo);
    setParentPeriodIdForNewQuarter(periodo.parent_id || null);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setPeriodoToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (periodoToDelete) {
      deletePeriodoMutation.mutate(periodoToDelete);
    }
  };

  const toggleAnnualPeriodExpansion = (periodId: string) => {
    setExpandedAnnualPeriods((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(periodId)) {
        newSet.delete(periodId);
      } else {
        newSet.add(periodId);
      }
      return newSet;
    });
  };

  const handleSort = (column: keyof Periodo) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (isLoading || permissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewPeriods) {
    return (
      <div className="container mx-auto py-6 text-center text-red-500">
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        Erro ao carregar períodos: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Gestão de Períodos</CardTitle>
          {canInsertPeriods && (
            <Button onClick={handleAddAnnualPeriodClick}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Período Anual
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {annualPeriods && annualPeriods.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('nome')}
                      className="flex items-center px-0 py-0 h-auto"
                    >
                      Nome
                      {sortBy === 'nome' && (
                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('status')}
                      className="flex items-center px-0 py-0 h-auto"
                    >
                      Status
                      {sortBy === 'status' && (
                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {annualPeriods.map((annualPeriod) => (
                  <React.Fragment key={annualPeriod.id}>
                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleAnnualPeriodExpansion(annualPeriod.id)}
                        >
                          {expandedAnnualPeriods.has(annualPeriod.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span className="sr-only">Expandir/Colapsar Trimestres</span>
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{annualPeriod.nome}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          annualPeriod.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {annualPeriod.status === 'active' ? 'Ativo' : 'Arquivado'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {canEditPeriods && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(annualPeriod)}
                            className="mr-2"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                        )}
                        {canDeletePeriods && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(annualPeriod.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedAnnualPeriods.has(annualPeriod.id) && (
                      <TableRow>
                        <TableCell colSpan={4} className="p-0">
                          <div className="bg-gray-100 dark:bg-gray-700 p-4 border-t border-b">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-md font-semibold">Trimestres para "{annualPeriod.nome}"</h4>
                              {canInsertPeriods && (
                                <Button size="sm" onClick={() => handleAddQuarterClick(annualPeriod.id)}>
                                  <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Trimestre
                                </Button>
                              )}
                            </div>
                            {quarterlyPeriodsMap.get(annualPeriod.id)?.length > 0 ? (
                              <Table className="bg-white dark:bg-gray-900">
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="pl-8">
                                      <Button
                                        variant="ghost"
                                        onClick={() => handleSort('nome')}
                                        className="flex items-center px-0 py-0 h-auto"
                                      >
                                        Nome
                                        {sortBy === 'nome' && (
                                          sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                        )}
                                      </Button>
                                    </TableHead>
                                    <TableHead>
                                      <Button
                                        variant="ghost"
                                        onClick={() => handleSort('status')}
                                        className="flex items-center px-0 py-0 h-auto"
                                      >
                                        Status
                                        {sortBy === 'status' && (
                                          sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                        )}
                                      </Button>
                                    </TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {quarterlyPeriodsMap.get(annualPeriod.id)?.map((quarterPeriod) => (
                                    <TableRow key={quarterPeriod.id}>
                                      <TableCell className="font-medium pl-8">{quarterPeriod.nome}</TableCell>
                                      <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                          quarterPeriod.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {quarterPeriod.status === 'active' ? 'Ativo' : 'Arquivado'}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {canEditPeriods && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEditClick(quarterPeriod)}
                                            className="mr-2"
                                          >
                                            <Edit className="h-4 w-4" />
                                            <span className="sr-only">Editar</span>
                                          </Button>
                                        )}
                                        {canDeletePeriods && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteClick(quarterPeriod.id)}
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
                              <p className="text-gray-600 text-center py-4">Nenhum trimestre cadastrado para este período anual.</p>
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
            <p className="text-gray-600">Nenhum período cadastrado ainda.</p>
          )}
        </CardContent>
      </Card>

      {(canInsertPeriods || canEditPeriods) && (
        <PeriodoForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleCreateOrUpdatePeriodo}
          initialData={editingPeriodo}
          isLoading={createPeriodoMutation.isPending || updatePeriodoMutation.isPending}
          parentPeriodIdForNew={parentPeriodIdForNewQuarter}
        />
      )}

      {canDeletePeriods && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o período selecionado e todos os sub-períodos (trimestres) associados, se houver.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} disabled={deletePeriodoMutation.isPending}>
                {deletePeriodoMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {deletePeriodoMutation.isPending ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default Periodos;