"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, ChevronDown, ChevronUp, Search, ArrowUp, ArrowDown } from "lucide-react";
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
import { getKeyResultsByObjetivoId, createKeyResult, updateKeyResult, deleteKeyResult, KeyResult, calculateKeyResultProgress } from "@/integrations/supabase/api/key_results";
import { getAreas, Area } from "@/integrations/supabase/api/areas";
import { showSuccess, showError } from "@/utils/toast";
import { useSession } from "@/components/auth/SessionContextProvider";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Link, useLocation } from "react-router-dom"; // Importar useLocation
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress"; // Import Progress component

const Objetivos = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const location = useLocation(); // Inicializar useLocation

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

  // Removed state for inline KR value editing and updatingKrId

  // State for expanded objective rows
  const [expandedObjetivos, setExpandedObjetivos] = React.useState<Set<string>>(new Set());

  // State for filters and sorting
  const [statusFilter, setStatusFilter] = React.useState<Objetivo['status'] | 'all'>('all');
  const [periodoFilter, setPeriodoFilter] = React.useState<string | 'all'>('all');
  const [areaFilter, setAreaFilter] = React.useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [sortBy, setSortBy] = React.useState<keyof Objetivo | 'area_name'>('created_at');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  // Effect to apply area filter from navigation state
  React.useEffect(() => {
    if (location.state && (location.state as any).areaId !== undefined) {
      const areaIdFromState = (location.state as any).areaId;
      setAreaFilter(areaIdFromState === null ? 'null' : areaIdFromState);
      // Clear the state after using it to avoid re-applying on subsequent visits
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.state]);

  const { data: objetivos, isLoading: isLoadingObjetivos, error: objetivosError } = useQuery<Objetivo[], Error>({
    queryKey: ["objetivos", { statusFilter, periodoFilter, areaFilter, search: debouncedSearchQuery, sortBy, sortOrder }],
    queryFn: () => getObjetivos({
      status: statusFilter,
      periodo: periodoFilter,
      area_id: areaFilter,
      search: debouncedSearchQuery,
      sortBy,
      sortOrder,
    }),
  });

  const { data: areas, isLoading: isLoadingAreas } = useQuery<Area[], Error>({
    queryKey: ["areas"],
    queryFn: getAreas,
  });

  // Fetch Key Results for a specific objective (now includes nested activities)
  const { data: keyResultsMap, isLoading: isLoadingKeyResults } = useQuery<Map<string, KeyResult[]>, Error>({
    queryKey: ["key_results_by_objetivo", objetivos], // Depend on filtered objectives
    queryFn: async () => {
      if (!objetivos) return new Map();
      const krPromises = objetivos.map(async (obj) => {
        const krs = await getKeyResultsByObjetivoId(obj.id); // This now fetches activities too
        return [obj.id, krs || []] as [string, KeyResult[]];
      });
      const results = await Promise.all(krPromises);
      return new Map(results);
    },
    enabled: !!objetivos, // Only run if objectives are loaded
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
        values.unidade,
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
        values.unidade,
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

  // Removed inlineUpdateKeyResultMutation

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

  // Removed inline KR value update logic and debouncing

  // Calculate Objective progress
  const calculateObjetivoOverallProgress = (objetivoId: string): number => {
    const krs = keyResultsMap?.get(objetivoId);
    if (!krs || krs.length === 0) {
      return 0;
    }
    const totalProgress = krs.reduce((sum, kr) => sum + calculateKeyResultProgress(kr), 0);
    return Math.round(totalProgress / krs.length);
  };


  if (isLoadingObjetivos || isLoadingAreas || isLoadingKeyResults) { // Added isLoadingKeyResults
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

  const periods = ["Q1 2024", "Q2 2024", "Q3 2024", "Q4 2024", "Anual 2024", "Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Anual 2025"];
  const statuses = [
    { value: "draft", label: "Rascunho" },
    { value: "active", label: "Ativo" },
    { value: "completed", label: "Concluído" },
    { value: "archived", label: "Arquivado" },
  ];

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
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar objetivos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value: Objetivo['status'] | 'all') => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={periodoFilter} onValueChange={(value: string | 'all') => setPeriodoFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Períodos</SelectItem>
                {periods.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={areaFilter} onValueChange={(value: string | 'all') => setAreaFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Áreas</SelectItem>
                <SelectItem value="null">Nenhuma Área</SelectItem>
                {areas?.map((area) => (
                  <SelectItem key={area.id} value={area.id}>{area.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              <span className="sr-only">Alterar Ordem</span>
            </Button>
          </div>

          {objetivos && objetivos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead> {/* For expand/collapse button */}
                  <TableHead>Título</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progresso</TableHead> {/* New column for Objective progress */}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {objetivos.map((objetivo) => {
                  const objectiveProgress = calculateObjetivoOverallProgress(objetivo.id);
                  return (
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
                        <TableCell className="font-medium">
                          <Link to={`/objetivos/${objetivo.id}`} className="text-blue-600 hover:underline">
                            {objetivo.titulo}
                          </Link>
                        </TableCell>
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
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={objectiveProgress} className="w-[100px]" />
                            <span className="text-sm text-muted-foreground">{objectiveProgress}%</span>
                          </div>
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
                          <TableCell colSpan={7} className="p-0">
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
                                        <TableHead>Meta</TableHead>
                                        <TableHead>Progresso (%)</TableHead> {/* Now directly shows calculated progress */}
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {keyResultsMap.get(objetivo.id)?.map((kr) => {
                                        const krProgress = calculateKeyResultProgress(kr); // Use the new calculation
                                        return (
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
                                            <TableCell>
                                              <div className="flex items-center gap-2">
                                                <Progress value={krProgress} className="w-[80px]" />
                                                <span className="text-sm text-muted-foreground">{krProgress}%</span>
                                              </div>
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
                                        );
                                      })}
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
                  );
                })}
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