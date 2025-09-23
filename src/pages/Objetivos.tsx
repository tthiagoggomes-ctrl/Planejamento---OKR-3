"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
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
import { getObjetivos, createObjetivo, updateObjetivo, deleteObjetivo, Objetivo } from "@/integrations/supabase/api/objetivos";
import { KeyResultForm, KeyResultFormValues } from "@/components/forms/KeyResultForm";
import { getKeyResultsByObjetivoId, createKeyResult, updateKeyResult, deleteKeyResult, KeyResult } from "@/integrations/supabase/api/key_results";
import { showSuccess, showError } from "@/utils/toast";
import { useSession } from "@/components/auth/SessionContextProvider";
import { Input } from "@/components/ui/input"; // Import Input component
import { useDebounce } from "@/hooks/use-debounce"; // Import useDebounce hook

const Objetivos = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();

  // State for Objetivo management
  const [isObjetivoFormOpen, setIsObjetivoFormOpen] = React.useState(false);
  const [editingObjetivo, setEditingObjetivo] = React.useState<Objetivo | null>(null);
  const [isObjetivoDeleteDialogOpen, setIsObjetivoDeleteDialogOpen] = React.useState(false);
  const [objetivoToDelete, setObjetivoToDelete] = React.useState<string | null>(null);

  // State for Key Result management
  const [isKeyResultFormOpen, setIsKeyResultFormOpen] = React.useState(false);
  const [editingKeyResult, setEditingKeyResult] = React.useState<KeyResult | null>(null);
  const [selectedObjetivoForKR, setSelectedObjetivoForKR] = React.useState<Objetivo | null>(null);
  const [isKeyResultDeleteDialogOpen, setIsKeyResultDeleteDialogOpen] = React.useState(false);
  const [keyResultToDelete, setKeyResultToDelete] = React.useState<string | null>(null);

  // State for inline KR value editing
  const [krCurrentValues, setKrCurrentValues] = React.useState<Record<string, number>>({});
  const [updatingKrId, setUpdatingKrId] = React.useState<string | null>(null);

  // State for expanded objective rows
  const [expandedObjetivos, setExpandedObjetivos] = React.useState<Set<string>>(new Set());

  const { data: objetivos, isLoading: isLoadingObjetivos, error: objetivosError } = useQuery<Objetivo[], Error>({
    queryKey: ["objetivos"],
    queryFn: getObjetivos,
  });

  // Fetch Key Results for a specific objective
  const { data: keyResultsMap, isLoading: isLoadingKeyResults } = useQuery<Map<string, KeyResult[]>, Error>({
    queryKey: ["key_results_by_objetivo"],
    queryFn: async () => {
      if (!objetivos) return new Map();
      const krPromises = objetivos.map(async (obj) => {
        const krs = await getKeyResultsByObjetivoId(obj.id);
        return [obj.id, krs || []] as [string, KeyResult[]];
      });
      const results = await Promise.all(krPromises);
      return new Map(results);
    },
    enabled: !!objetivos, // Only run if objectives are loaded
    onSuccess: (data) => {
      // Initialize krCurrentValues when key results are loaded
      const initialValues: Record<string, number> = {};
      data.forEach(krs => {
        krs.forEach(kr => {
          initialValues[kr.id] = kr.valor_atual;
        });
      });
      setKrCurrentValues(initialValues);
    }
  });

  // Mutations for Objetivos
  const createObjetivoMutation = useMutation({
    mutationFn: (values: ObjetivoFormValues) => {
      if (!user?.id) {
        throw new Error("User not authenticated.");
      }
      return createObjetivo(values.titulo, values.descricao, values.periodo, values.area_id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objetivos"] });
      setIsObjetivoFormOpen(false);
      showSuccess("Objetivo criado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar objetivo: ${err.message}`);
    },
  });

  const updateObjetivoMutation = useMutation({
    mutationFn: ({ id, ...values }: ObjetivoFormValues & { id: string }) =>
      updateObjetivo(id, values.titulo, values.descricao, values.periodo, values.area_id, values.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objetivos"] });
      setIsObjetivoFormOpen(false);
      setEditingObjetivo(null);
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
      setIsObjetivoDeleteDialogOpen(false);
      setObjetivoToDelete(null);
      showSuccess("Objetivo excluído com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir objetivo: ${err.message}`);
    },
  });

  // Mutations for Key Results
  const createKeyResultMutation = useMutation({
    mutationFn: (values: KeyResultFormValues) => {
      if (!user?.id || !selectedObjetivoForKR?.id) {
        throw new Error("User not authenticated or objective not selected.");
      }
      return createKeyResult(
        selectedObjetivoForKR.id,
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
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] });
      setIsKeyResultFormOpen(false);
      setSelectedObjetivoForKR(null);
      showSuccess("Key Result criado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar Key Result: ${err.message}`);
    },
  });

  const updateKeyResultMutation = useMutation({
    mutationFn: ({ id, ...values }: KeyResultFormValues & { id: string }) =>
      updateKeyResult(
        id,
        values.titulo,
        values.tipo,
        values.valor_inicial,
        values.valor_meta,
        values.valor_atual,
        values.unidade,
        values.status
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] });
      setIsKeyResultFormOpen(false);
      setEditingKeyResult(null);
      setSelectedObjetivoForKR(null);
      showSuccess("Key Result atualizado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar Key Result: ${err.message}`);
    },
  });

  // Mutation for inline KR value update
  const inlineUpdateKeyResultMutation = useMutation({
    mutationFn: async ({ id, valor_atual }: { id: string; valor_atual: number }) => {
      const currentKRs = keyResultsMap?.get(selectedObjetivoForKR?.id || '') || [];
      const krToUpdate = currentKRs.find(kr => kr.id === id);
      if (!krToUpdate) throw new Error("Key Result not found for inline update.");

      setUpdatingKrId(id); // Set loading state for this specific KR
      const updatedKr = await updateKeyResult(
        id,
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
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] });
      showSuccess("Valor atual do Key Result atualizado!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar valor do Key Result: ${err.message}`);
      // Revert local state if update fails
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] });
    },
  });

  const deleteKeyResultMutation = useMutation({
    mutationFn: deleteKeyResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] });
      setIsKeyResultDeleteDialogOpen(false);
      setKeyResultToDelete(null);
      showSuccess("Key Result excluído com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir Key Result: ${err.message}`);
    },
  });

  // Handlers for Objetivos
  const handleCreateOrUpdateObjetivo = (values: ObjetivoFormValues) => {
    if (editingObjetivo) {
      updateObjetivoMutation.mutate({ id: editingObjetivo.id, ...values });
    } else {
      createObjetivoMutation.mutate(values);
    }
  };

  const handleEditObjetivoClick = (objetivo: Objetivo) => {
    setEditingObjetivo(objetivo);
    setIsObjetivoFormOpen(true);
  };

  const handleDeleteObjetivoClick = (id: string) => {
    setObjetivoToDelete(id);
    setIsObjetivoDeleteDialogOpen(true);
  };

  const confirmDeleteObjetivo = () => {
    if (objetivoToDelete) {
      deleteObjetivoMutation.mutate(objetivoToDelete);
    }
  };

  // Handlers for Key Results
  const handleAddKeyResultClick = (objetivo: Objetivo) => {
    setEditingKeyResult(null);
    setSelectedObjetivoForKR(objetivo);
    setIsKeyResultFormOpen(true);
  };

  const handleEditKeyResultClick = (kr: KeyResult, objetivo: Objetivo) => {
    setEditingKeyResult(kr);
    setSelectedObjetivoForKR(objetivo);
    setIsKeyResultFormOpen(true);
  };

  const handleDeleteKeyResultClick = (id: string) => {
    setKeyResultToDelete(id);
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

  const toggleObjetivoExpansion = (objetivoId: string) => {
    setExpandedObjetivos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(objetivoId)) {
        newSet.delete(objetivoId);
      } else {
        newSet.add(objetivoId);
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
      const currentKRs = Array.from(keyResultsMap?.values() || []).flat();
      const originalKr = currentKRs.find(kr => kr.id === krId);

      if (originalKr && originalKr.valor_atual !== newValue && updatingKrId !== krId) {
        inlineUpdateKeyResultMutation.mutate({ id: krId, valor_atual: newValue });
      }
    }
  }, [debouncedKrCurrentValues, keyResultsMap, inlineUpdateKeyResultMutation, updatingKrId]);


  if (isLoadingObjetivos) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (objetivosError) {
    return (
      <div className="text-center text-red-500">
        Erro ao carregar objetivos: {objetivosError.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Gestão de Objetivos & KRs</CardTitle>
          <Button onClick={() => { setEditingObjetivo(null); setIsObjetivoFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Objetivo
          </Button>
        </CardHeader>
        <CardContent>
          {objetivos && objetivos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead> {/* For expand/collapse button */}
                  <TableHead>Título</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {objetivos.map((objetivo) => (
                  <React.Fragment key={objetivo.id}>
                    <TableRow>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleObjetivoExpansion(objetivo.id)}
                        >
                          {expandedObjetivos.has(objetivo.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span className="sr-only">Expandir/Colapsar KRs</span>
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{objetivo.titulo}</TableCell>
                      <TableCell>{objetivo.periodo}</TableCell>
                      <TableCell>{objetivo.area_name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getObjetivoStatusBadgeClass(objetivo.status)}`}>
                          {objetivo.status === 'draft' && 'Rascunho'}
                          {objetivo.status === 'active' && 'Ativo'}
                          {objetivo.status === 'completed' && 'Concluído'}
                          {objetivo.status === 'archived' && 'Arquivado'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditObjetivoClick(objetivo)}
                          className="mr-2"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar Objetivo</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteObjetivoClick(objetivo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Excluir Objetivo</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedObjetivos.has(objetivo.id) && (
                      <TableRow>
                        <TableCell colSpan={6} className="p-0">
                          <div className="bg-gray-50 dark:bg-gray-800 p-4 border-t border-b">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-lg font-semibold">Key Results para "{objetivo.titulo}"</h4>
                              <Button size="sm" onClick={() => handleAddKeyResultClick(objetivo)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar KR
                              </Button>
                            </div>
                            {isLoadingKeyResults ? (
                              <div className="flex justify-center items-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              </div>
                            ) : (
                              keyResultsMap?.get(objetivo.id)?.length > 0 ? (
                                <Table className="bg-white dark:bg-gray-900">
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Título do KR</TableHead>
                                      <TableHead>Tipo</TableHead>
                                      <TableHead>Progresso</TableHead>
                                      <TableHead>Valor Atual</TableHead> {/* New column for inline edit */}
                                      <TableHead>Status</TableHead>
                                      <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {keyResultsMap.get(objetivo.id)?.map((kr) => (
                                      <TableRow key={kr.id}>
                                        <TableCell>{kr.titulo}</TableCell>
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
                                            onClick={() => handleEditKeyResultClick(kr, objetivo)}
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
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <p className="text-gray-600 text-center py-4">Nenhum Key Result cadastrado para este objetivo.</p>
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
            <p className="text-gray-600">Nenhum objetivo cadastrado ainda.</p>
          )}
        </CardContent>
      </Card>

      {/* Objetivo Form */}
      <ObjetivoForm
        open={isObjetivoFormOpen}
        onOpenChange={setIsObjetivoFormOpen}
        onSubmit={handleCreateOrUpdateObjetivo}
        initialData={editingObjetivo}
        isLoading={createObjetivoMutation.isPending || updateObjetivoMutation.isPending}
      />

      {/* Objetivo Delete Confirmation */}
      <AlertDialog open={isObjetivoDeleteDialogOpen} onOpenChange={setIsObjetivoDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o objetivo e todos os Key Results (KRs) associados.
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
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o Key Result selecionado.
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
    </div>
  );
};

export default Objetivos;