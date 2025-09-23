"use client";

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Edit, Trash2, PlusCircle, ChevronDown, ChevronUp, Target, ListTodo, TrendingUp, CalendarDays, Building, Flag, CircleDot, CheckCircle, Archive, Hourglass, XCircle } from "lucide-react";
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
import { ObjetivoForm, ObjetivoFormValues } from "@/components/forms/ObjetivoForm";
import { getObjetivos, updateObjetivo, deleteObjetivo, Objetivo } from "@/integrations/supabase/api/objetivos";
import { KeyResultForm, KeyResultFormValues } from "@/components/forms/KeyResultForm";
import { getKeyResultsByObjetivoId, createKeyResult, updateKeyResult, deleteKeyResult, KeyResult } from "@/integrations/supabase/api/key_results";
import { getAtividadesByKeyResultId, createAtividade, updateAtividade, deleteAtividade, Atividade } from "@/integrations/supabase/api/atividades";
import { AtividadeForm, AtividadeFormValues } from "@/components/forms/AtividadeForm";
import { showSuccess, showError } from "@/utils/toast";
import { useSession } from "@/components/auth/SessionContextProvider";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

const ObjetivoDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();

  // State for Objetivo management
  const [isObjetivoFormOpen, setIsObjetivoFormOpen] = React.useState(false);
  const [isObjetivoDeleteDialogOpen, setIsObjetivoDeleteDialogOpen] = React.useState(false);

  // State for Key Result management
  const [isKeyResultFormOpen, setIsKeyResultFormOpen] = React.useState(false);
  const [editingKeyResult, setEditingKeyResult] = React.useState<KeyResult | null>(null);
  const [isKeyResultDeleteDialogOpen, setIsKeyResultDeleteDialogOpen] = React.useState(false);
  const [keyResultToDelete, setKeyResultToDelete] = React.useState<string | null>(null);

  // State for Activity management
  const [isAtividadeFormOpen, setIsAtividadeFormOpen] = React.useState(false);
  const [editingAtividade, setEditingAtividade] = React.useState<Atividade | null>(null);
  const [selectedKeyResultForAtividade, setSelectedKeyResultForAtividade] = React.useState<KeyResult | null>(null);
  const [isAtividadeDeleteDialogOpen, setIsAtividadeDeleteDialogOpen] = React.useState(false);
  const [atividadeToDelete, setAtividadeToDelete] = React.useState<string | null>(null);

  // State for inline KR value editing
  const [krCurrentValues, setKrCurrentValues] = React.useState<Record<string, number>>({});
  const [updatingKrId, setUpdatingKrId] = React.useState<string | null>(null);

  // State for expanded Key Result rows (to show activities)
  const [expandedKeyResults, setExpandedKeyResults] = React.useState<Set<string>>(new Set());

  // Fetch Objective details
  const { data: objetivo, isLoading: isLoadingObjetivo, error: objetivoError } = useQuery<Objetivo | null, Error>({
    queryKey: ["objetivos", id],
    queryFn: async () => {
      const allObjetivos = await getObjetivos();
      return allObjetivos?.find(obj => obj.id === id) || null;
    },
    enabled: !!id,
  });

  // Fetch Key Results for this Objective
  const { data: keyResults, isLoading: isLoadingKeyResults, error: keyResultsError } = useQuery<KeyResult[], Error>({
    queryKey: ["key_results_by_objetivo", id],
    queryFn: () => getKeyResultsByObjetivoId(id!),
    enabled: !!id,
    onSuccess: (data) => {
      // Initialize krCurrentValues when key results are loaded
      const initialValues: Record<string, number> = {};
      data.forEach(kr => {
        initialValues[kr.id] = kr.valor_atual;
      });
      setKrCurrentValues(initialValues);
    }
  });

  // Fetch Activities for each Key Result
  const { data: atividadesMap, isLoading: isLoadingAtividades } = useQuery<Map<string, Atividade[]>, Error>({
    queryKey: ["atividades_by_key_result", keyResults],
    queryFn: async () => {
      if (!keyResults) return new Map();
      const activityPromises = keyResults.map(async (kr) => {
        const activities = await getAtividadesByKeyResultId(kr.id);
        return [kr.id, activities || []] as [string, Atividade[]];
      });
      const results = await Promise.all(activityPromises);
      return new Map(results);
    },
    enabled: !!keyResults,
  });

  // Mutations for Objetivos
  const updateObjetivoMutation = useMutation({
    mutationFn: (values: ObjetivoFormValues) => {
      if (!objetivo?.id) throw new Error("Objective ID is missing.");
      return updateObjetivo(objetivo.id, values.titulo, values.descricao, values.periodo, values.area_id, values.status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objetivos", id] });
      queryClient.invalidateQueries({ queryKey: ["objetivos"] }); // Invalidate all objectives list
      setIsObjetivoFormOpen(false);
      showSuccess("Objetivo atualizado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar objetivo: ${err.message}`);
    },
  });

  const deleteObjetivoMutation = useMutation({
    mutationFn: deleteObjetivo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objetivos"] });
      showSuccess("Objetivo excluído com sucesso!");
      navigate("/objetivos"); // Redirect to objectives list after deletion
    },
    onError: (err) => {
      showError(`Erro ao excluir objetivo: ${err.message}`);
    },
  });

  // Mutations for Key Results
  const createKeyResultMutation = useMutation({
    mutationFn: (values: KeyResultFormValues) => {
      if (!user?.id || !objetivo?.id) {
        throw new Error("User not authenticated or objective not loaded.");
      }
      return createKeyResult(
        objetivo.id,
        user.id,
        values.titulo,
        values.tipo,
        values.valor_inicial,
        values.valor_meta,
        values.valor_atual,
        values.unidade,
        values.status
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo", id] });
      setIsKeyResultFormOpen(false);
      setEditingKeyResult(null);
      showSuccess("Key Result criado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar Key Result: ${err.message}`);
    },
  });

  const updateKeyResultMutation = useMutation({
    mutationFn: ({ id: krId, ...values }: KeyResultFormValues & { id: string }) =>
      updateKeyResult(
        krId,
        values.titulo,
        values.tipo,
        values.valor_inicial,
        values.valor_meta,
        values.valor_atual,
        values.unidade,
        values.status
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo", id] });
      setIsKeyResultFormOpen(false);
      setEditingKeyResult(null);
      showSuccess("Key Result atualizado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar Key Result: ${err.message}`);
    },
  });

  const inlineUpdateKeyResultMutation = useMutation({
    mutationFn: async ({ id: krId, valor_atual }: { id: string; valor_atual: number }) => {
      const krToUpdate = keyResults?.find(kr => kr.id === krId);
      if (!krToUpdate) throw new Error("Key Result not found for inline update.");

      setUpdatingKrId(krId); // Set loading state for this specific KR
      const updatedKr = await updateKeyResult(
        krId,
        krToUpdate.titulo,
        krToUpdate.tipo,
        krToUpdate.valor_inicial,
        krToUpdate.valor_meta,
        valor_atual, // Only update valor_atual
        krToUpdate.unidade,
        krToUpdate.status
      );
      setUpdatingKrId(null); // Clear loading state
      return updatedKr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo", id] });
      showSuccess("Valor atual do Key Result atualizado!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar valor do Key Result: ${err.message}`);
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo", id] }); // Revert local state if update fails
    },
  });

  const deleteKeyResultMutation = useMutation({
    mutationFn: deleteKeyResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo", id] });
      setIsKeyResultDeleteDialogOpen(false);
      setKeyResultToDelete(null);
      showSuccess("Key Result excluído com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir Key Result: ${err.message}`);
    },
  });

  // Mutations for Atividades
  const createAtividadeMutation = useMutation({
    mutationFn: (values: AtividadeFormValues) => {
      if (!user?.id || !selectedKeyResultForAtividade?.id) {
        throw new Error("User not authenticated or Key Result not selected.");
      }
      return createAtividade(
        selectedKeyResultForAtividade.id,
        user.id,
        values.titulo,
        values.descricao,
        values.due_date ? values.due_date.toISOString() : null,
        values.status
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividades_by_key_result", selectedKeyResultForAtividade?.id] });
      setIsAtividadeFormOpen(false);
      setSelectedKeyResultForAtividade(null);
      showSuccess("Atividade criada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar atividade: ${err.message}`);
    },
  });

  const updateAtividadeMutation = useMutation({
    mutationFn: ({ id: atividadeId, ...values }: AtividadeFormValues & { id: string }) => {
      if (!selectedKeyResultForAtividade?.id) {
        throw new Error("Key Result not selected for activity update.");
      }
      return updateAtividade(
        atividadeId,
        values.key_result_id, // This should be the KR the activity is currently linked to
        values.user_id,
        values.titulo,
        values.descricao,
        values.due_date ? values.due_date.toISOString() : null,
        values.status
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividades_by_key_result"] }); // Invalidate all activities for all KRs
      setIsAtividadeFormOpen(false);
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
      queryClient.invalidateQueries({ queryKey: ["atividades_by_key_result"] }); // Invalidate all activities for all KRs
      setIsAtividadeDeleteDialogOpen(false);
      setAtividadeToDelete(null);
      showSuccess("Atividade excluída com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir atividade: ${err.message}`);
    },
  });

  // Handlers for Objetivos
  const handleUpdateObjetivo = (values: ObjetivoFormValues) => {
    updateObjetivoMutation.mutate(values);
  };

  const handleDeleteObjetivoClick = () => {
    setIsObjetivoDeleteDialogOpen(true);
  };

  const confirmDeleteObjetivo = () => {
    if (objetivo?.id) {
      deleteObjetivoMutation.mutate(objetivo.id);
    }
  };

  // Handlers for Key Results
  const handleAddKeyResultClick = () => {
    setEditingKeyResult(null);
    setIsKeyResultFormOpen(true);
  };

  const handleEditKeyResultClick = (kr: KeyResult) => {
    setEditingKeyResult(kr);
    setIsKeyResultFormOpen(true);
  };

  const handleDeleteKeyResultClick = (krId: string) => {
    setKeyResultToDelete(krId);
    setIsKeyResultDeleteDialogOpen(true);
  };

  const confirmDeleteKeyResult = () => {
    if (keyResultToDelete) {
      deleteKeyResultMutation.mutate(keyResultToDelete);
    }
  };

  const handleCreateOrUpdateKeyResult = (values: KeyResultFormValues) => {
    if (editingKeyResult) {
      updateKeyResultMutation.mutate({ id: editingKeyResult.id, ...values });
    } else {
      createKeyResultMutation.mutate(values);
    }
  };

  // Handlers for Atividades
  const handleAddAtividadeClick = (kr: KeyResult) => {
    setEditingAtividade(null);
    setSelectedKeyResultForAtividade(kr);
    setIsAtividadeFormOpen(true);
  };

  const handleEditAtividadeClick = (atividade: Atividade, kr: KeyResult) => {
    setEditingAtividade(atividade);
    setSelectedKeyResultForAtividade(kr); // Set the KR context for the form
    setIsAtividadeFormOpen(true);
  };

  const handleDeleteAtividadeClick = (atividadeId: string) => {
    setAtividadeToDelete(atividadeId);
    setIsAtividadeDeleteDialogOpen(true);
  };

  const confirmDeleteAtividade = () => {
    if (atividadeToDelete) {
      deleteAtividadeMutation.mutate(atividadeToDelete);
    }
  };

  const handleCreateOrUpdateAtividade = (values: AtividadeFormValues) => {
    if (editingAtividade) {
      updateAtividadeMutation.mutate({ id: editingAtividade.id, ...values });
    } else {
      createAtividadeMutation.mutate(values);
    }
  };

  const toggleKeyResultExpansion = (krId: string) => {
    setExpandedKeyResults((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(krId)) {
        newSet.delete(krId);
      } else {
        newSet.add(krId);
      }
      return newSet;
    });
  };

  const getObjetivoStatusBadgeClass = (status: Objetivo['status']) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      case 'draft':
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getKeyResultStatusBadgeClass = (status: KeyResult['status']) => {
    switch (status) {
      case 'on_track': return 'bg-green-100 text-green-800';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800';
      case 'off_track': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAtividadeStatusBadgeClass = (status: Atividade['status']) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'done': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Inline KR value update logic
  const handleKrValueChange = (krId: string, value: string) => {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setKrCurrentValues(prev => ({ ...prev, [krId]: numericValue }));
    }
  };

  const debouncedKrCurrentValues = useDebounce(krCurrentValues, 1000); // Debounce for 1 second

  React.useEffect(() => {
    // Iterate over debounced values and trigger mutations
    for (const krId in debouncedKrCurrentValues) {
      const newValue = debouncedKrCurrentValues[krId];
      const originalKr = keyResults?.find(kr => kr.id === krId);

      if (originalKr && originalKr.valor_atual !== newValue && updatingKrId !== krId) {
        inlineUpdateKeyResultMutation.mutate({ id: krId, valor_atual: newValue });
      }
    }
  }, [debouncedKrCurrentValues, keyResults, inlineUpdateKeyResultMutation, updatingKrId]);


  if (isLoadingObjetivo || isLoadingKeyResults || isLoadingAtividades) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (objetivoError || !objetivo) {
    return (
      <div className="text-center text-red-500">
        Erro ao carregar objetivo ou objetivo não encontrado: {objetivoError?.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold flex items-center">
            <Target className="mr-2 h-6 w-6" /> Detalhes do Objetivo: {objetivo.titulo}
          </CardTitle>
          <div className="flex space-x-2">
            <Button onClick={() => setIsObjetivoFormOpen(true)} variant="outline">
              <Edit className="mr-2 h-4 w-4" /> Editar Objetivo
            </Button>
            <Button onClick={handleDeleteObjetivoClick} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Excluir Objetivo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Descrição</p>
              <p className="text-lg">{objetivo.descricao || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Período</p>
              <p className="flex items-center text-lg">
                <CalendarDays className="mr-2 h-5 w-5 text-gray-500" /> {objetivo.periodo}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Área</p>
              <p className="flex items-center text-lg">
                <Building className="mr-2 h-5 w-5 text-gray-500" /> {objetivo.area_name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className={`flex items-center text-lg font-semibold ${getObjetivoStatusBadgeClass(objetivo.status)}`}>
                {objetivo.status === 'draft' && <CircleDot className="mr-2 h-5 w-5" />}
                {objetivo.status === 'active' && <Flag className="mr-2 h-5 w-5" />}
                {objetivo.status === 'completed' && <CheckCircle className="mr-2 h-5 w-5" />}
                {objetivo.status === 'archived' && <Archive className="mr-2 h-5 w-5" />}
                {objetivo.status === 'draft' && 'Rascunho'}
                {objetivo.status === 'active' && 'Ativo'}
                {objetivo.status === 'completed' && 'Concluído'}
                {objetivo.status === 'archived' && 'Arquivado'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" /> Key Results
          </CardTitle>
          <Button onClick={handleAddKeyResultClick}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar KR
          </Button>
        </CardHeader>
        <CardContent>
          {keyResults && keyResults.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Título do KR</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Valor Atual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keyResults.map((kr) => (
                  <React.Fragment key={kr.id}>
                    <TableRow>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleKeyResultExpansion(kr.id)}
                        >
                          {expandedKeyResults.has(kr.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span className="sr-only">Expandir/Colapsar Atividades</span>
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{kr.titulo}</TableCell>
                      <TableCell>
                        {kr.tipo === 'numeric' && 'Numérico'}
                        {kr.tipo === 'boolean' && 'Booleano'}
                        {kr.tipo === 'percentage' && 'Porcentagem'}
                      </TableCell>
                      <TableCell>
                        {kr.valor_inicial} {kr.unidade} para {kr.valor_meta} {kr.unidade}
                      </TableCell>
                      <TableCell className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={krCurrentValues[kr.id] !== undefined ? krCurrentValues[kr.id] : kr.valor_atual}
                          onChange={(e) => handleKrValueChange(kr.id, e.target.value)}
                          className="w-24 pr-8"
                          disabled={updatingKrId === kr.id}
                        />
                        {updatingKrId === kr.id && (
                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getKeyResultStatusBadgeClass(kr.status)}`}>
                          {kr.status === 'on_track' && 'No Caminho'}
                          {kr.status === 'at_risk' && 'Em Risco'}
                          {kr.status === 'off_track' && 'Fora do Caminho'}
                          {kr.status === 'completed' && 'Concluído'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditKeyResultClick(kr)}
                          className="mr-2"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar KR</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteKeyResultClick(kr.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Excluir KR</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedKeyResults.has(kr.id) && (
                      <TableRow>
                        <TableCell colSpan={7} className="p-0">
                          <div className="bg-gray-100 dark:bg-gray-700 p-4 border-t border-b">
                            <div className="flex justify-between items-center mb-3">
                              <h5 className="text-md font-semibold flex items-center">
                                <ListTodo className="mr-2 h-4 w-4" /> Atividades para "{kr.titulo}"
                              </h5>
                              <Button size="sm" onClick={() => handleAddAtividadeClick(kr)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Atividade
                              </Button>
                            </div>
                            {isLoadingAtividades ? (
                              <div className="flex justify-center items-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              </div>
                            ) : (
                              atividadesMap?.get(kr.id)?.length > 0 ? (
                                <Table className="bg-white dark:bg-gray-900">
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Título da Atividade</TableHead>
                                      <TableHead>Responsável</TableHead>
                                      <TableHead>Vencimento</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {atividadesMap.get(kr.id)?.map((atividade) => (
                                      <TableRow key={atividade.id}>
                                        <TableCell>{atividade.titulo}</TableCell>
                                        <TableCell>{atividade.assignee_name}</TableCell>
                                        <TableCell>
                                          {atividade.due_date ? format(new Date(atividade.due_date), "PPP") : "N/A"}
                                        </TableCell>
                                        <TableCell>
                                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getAtividadeStatusBadgeClass(atividade.status)}`}>
                                            {atividade.status === 'todo' && 'A Fazer'}
                                            {atividade.status === 'in_progress' && 'Em Progresso'}
                                            {atividade.status === 'done' && 'Concluído'}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEditAtividadeClick(atividade, kr)}
                                            className="mr-2"
                                          >
                                            <Edit className="h-4 w-4" />
                                            <span className="sr-only">Editar Atividade</span>
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteAtividadeClick(atividade.id)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Excluir Atividade</span>
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <p className="text-gray-600 text-center py-4">Nenhuma atividade cadastrada para este Key Result.</p>
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
            <p className="text-gray-600">Nenhum Key Result cadastrado para este objetivo.</p>
          )}
        </CardContent>
      </Card>

      {/* Objetivo Form */}
      <ObjetivoForm
        open={isObjetivoFormOpen}
        onOpenChange={setIsObjetivoFormOpen}
        onSubmit={handleUpdateObjetivo}
        initialData={objetivo}
        isLoading={updateObjetivoMutation.isPending}
      />

      {/* Objetivo Delete Confirmation */}
      <AlertDialog open={isObjetivoDeleteDialogOpen} onOpenChange={setIsObjetivoDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o objetivo "{objetivo.titulo}" e todos os Key Results (KRs) e Atividades associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteObjetivo} disabled={deleteObjetivoMutation.isPending}>
              {deleteObjetivoMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {deleteObjetivoMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Key Result Form */}
      <KeyResultForm
        open={isKeyResultFormOpen}
        onOpenChange={setIsKeyResultFormOpen}
        onSubmit={handleCreateOrUpdateKeyResult}
        initialData={editingKeyResult}
        isLoading={createKeyResultMutation.isPending || updateKeyResultMutation.isPending}
      />

      {/* Key Result Delete Confirmation */}
      <AlertDialog open={isKeyResultDeleteDialogOpen} onOpenChange={setIsKeyResultDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o Key Result selecionado e todas as atividades associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteKeyResult} disabled={deleteKeyResultMutation.isPending}>
              {deleteKeyResultMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {deleteKeyResultMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Atividade Form */}
      <AtividadeForm
        open={isAtividadeFormOpen}
        onOpenChange={setIsAtividadeFormOpen}
        onSubmit={handleCreateOrUpdateAtividade}
        initialData={editingAtividade}
        isLoading={createAtividadeMutation.isPending || updateAtividadeMutation.isPending}
      />

      {/* Atividade Delete Confirmation */}
      <AlertDialog open={isAtividadeDeleteDialogOpen} onOpenChange={setIsAtividadeDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a atividade selecionada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAtividade} disabled={deleteAtividadeMutation.isPending}>
              {deleteAtividadeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {deleteAtividadeMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ObjetivoDetails;