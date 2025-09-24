"use client";

import { useState, useEffect, useMemo } from "react"; // Usar imports nomeados para hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, ChevronDown, ChevronUp, Search, ArrowUp, ArrowDown, ListTodo } from "lucide-react";
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
import { getAtividadesByKeyResultId, createAtividade, updateAtividade, deleteAtividade, Atividade } from "@/integrations/supabase/api/atividades"; // Import Atividade API
import { AtividadeForm, AtividadeFormValues } from "@/components/forms/AtividadeForm"; // Import AtividadeForm
import { getAreas, Area } from "@/integrations/supabase/api/areas";
import { showSuccess, showError } from "@/utils/toast";
import { useSession } from "@/components/auth/SessionContextProvider";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Link, useLocation } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns"; // Import format for dates
import { Periodo, getPeriodos } from "@/integrations/supabase/api/periodos"; // Import Periodo and getPeriodos

const Objetivos = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const location = useLocation();

  // State for Objetivo management
  const [isObjetivoFormOpen, setIsObjetivoFormOpen] = useState(false);
  const [editingObjetivo, setEditingObjetivo] = useState<Objetivo | null>(null);
  const [isObjetivoDeleteDialogOpen, setIsObjetivoDeleteDialogOpen] = useState(false);
  const [objetivoToDelete, setObjetivoToDelete] = useState<string | null>(null);
  const [expandedObjetivos, setExpandedObjetivos] = useState<Set<string>>(new Set()); // Adicionado: Estado para expandir/colapsar objetivos

  // State for Key Result management
  const [isKeyResultFormOpen, setIsKeyResultFormOpen] = useState(false);
  const [editingKeyResult, setEditingKeyResult] = useState<KeyResult | null>(null);
  const [selectedObjetivoForKR, setSelectedObjetivoForKR] = useState<Objetivo | null>(null);
  const [isKeyResultDeleteDialogOpen, setIsKeyResultDeleteDialogOpen] = useState(false);
  const [keyResultToDelete, setKeyResultToDelete] = useState<string | null>(null);
  const [expandedKeyResults, setExpandedKeyResults] = useState<Set<string>>(() => {
    const initialState = new Set<string>();
    if (location.state && (location.state as any).keyResultId) {
      initialState.add((location.state as any).keyResultId);
    }
    return initialState;
  });

  // State for Activity management
  const [isAtividadeFormOpen, setIsAtividadeFormOpen] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState<Atividade | null>(null);
  const [selectedKeyResultForAtividade, setSelectedKeyResultForAtividade] = useState<KeyResult | null>(null);
  const [isAtividadeDeleteDialogOpen, setIsAtividadeDeleteDialogOpen] = useState(false);
  const [atividadeToDelete, setAtividadeToDelete] = useState<string | null>(null);

  // State for filters and sorting
  const [statusFilter, setStatusFilter] = useState<Objetivo['status'] | 'all'>('all');
  const [areaFilter, setAreaFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [sortBy, setSortBy] = useState<keyof Objetivo | 'area_name'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Effect to apply area filter from navigation state
  useEffect(() => {
    if (location.state && (location.state as any).areaId !== undefined) {
      const areaIdFromState = (location.state as any).areaId;
      setAreaFilter(areaIdFromState === null ? 'null' : areaIdFromState);
      // Clear the state after using it to avoid re-applying on subsequent visits
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.state]);

  const { data: objetivos, isLoading: isLoadingObjetivos, error: objetivosError } = useQuery<Objetivo[], Error>({
    queryKey: ["objetivos", { statusFilter, areaFilter, search: debouncedSearchQuery, sortBy, sortOrder }],
    queryFn: () => getObjetivos({
      status: statusFilter,
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

  const { data: periods, isLoading: isLoadingPeriods } = useQuery<Periodo[], Error>({
    queryKey: ["periods"],
    queryFn: getPeriodos,
  });

  // Fetch Key Results for a specific objective (now includes nested activities)
  const { data: keyResultsMap, isLoading: isLoadingKeyResults } = useQuery<Map<string, KeyResult[]>, Error>({
    queryKey: ["key_results_by_objetivo"], // Simplificado: Removido 'objetivos' da chave
    queryFn: async () => {
      // Obter os objetivos mais recentes do cache
      const currentObjetivos = queryClient.getQueryData<Objetivo[]>(["objetivos", { statusFilter, areaFilter, search: debouncedSearchQuery, sortBy, sortOrder }]);
      if (!currentObjetivos) return new Map();

      const krPromises = currentObjetivos.map(async (obj) => {
        const krs = await getKeyResultsByObjetivoId(obj.id); // This now fetches activities too
        return [obj.id, krs || []] as [string, KeyResult[]];
      });
      const results = await Promise.all(krPromises);
      return new Map(results);
    },
    enabled: !!objetivos, // Ainda habilitado apenas quando os objetivos são carregados
  });

  // NEW: Effect to expand objective and KR if keyResultId is in location.state
  useEffect(() => {
    if (location.state && (location.state as any).keyResultId && keyResultsMap && objetivos) {
      const targetKeyResultId = (location.state as any).keyResultId;
      let foundObjetivoId: string | null = null;

      // Find the objective ID for the target Key Result
      for (const [objetivoId, krs] of keyResultsMap.entries()) {
        if (krs.some(kr => kr.id === targetKeyResultId)) {
          foundObjetivoId = objetivoId;
          break;
        }
      }

      if (foundObjetivoId) {
        setExpandedObjetivos(prev => new Set(prev).add(foundObjetivoId!));
        setExpandedKeyResults(prev => new Set(prev).add(targetKeyResultId));
      }

      // Clear the state after using it to avoid re-applying on subsequent visits
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.state, keyResultsMap, objetivos]); // Dependencies

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

  // Mutations for Objetivos
  const createObjetivoMutation = useMutation({
    mutationFn: (values: ObjetivoFormValues) => {
      if (!user?.id) {
        throw new Error("User not authenticated.");
      }
      return createObjetivo(values.titulo, values.descricao, values.area_id, user.id);
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
      updateObjetivo(id, values.titulo, values.descricao, values.area_id, values.status),
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
        values.periodo,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] }); // Invalida a consulta de KRs
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
        values.periodo,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] }); // Invalida a consulta de KRs
      setIsKeyResultFormOpen(false);
      setEditingKeyResult(null);
      setSelectedObjetivoForKR(null);
      showSuccess("Key Result atualizado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar Key Result: ${err.message}`);
    },
  });

  const deleteKeyResultMutation = useMutation({
    mutationFn: deleteKeyResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] }); // Invalida a consulta de KRs
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
        formatDueDateForApi(values.due_date),
        values.status
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] }); // Invalidate KRs to recalculate progress
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
        values.key_result_id,
        values.user_id,
        values.titulo,
        values.descricao,
        formatDueDateForApi(values.due_date),
        values.status
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] }); // Invalidate KRs to recalculate progress
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
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] }); // Invalidate KRs to recalculate progress
      setIsAtividadeDeleteDialogOpen(false);
      setAtividadeToDelete(null);
      showSuccess("Atividade excluída com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir atividade: ${err.message}`);
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

  // Handlers for Atividades
  const handleAddAtividadeClick = (kr: KeyResult) => {
    setEditingAtividade(null);
    setSelectedKeyResultForAtividade(kr);
    setIsAtividadeFormOpen(true);
  };

  const handleEditAtividadeClick = (atividade: Atividade, kr: KeyResult) => {
    setEditingAtividade(atividade);
    setSelectedKeyResultForAtividade(kr);
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
      case 'todo': return 'bg-gray-900 text-white'; // Preto
      case 'in_progress': return 'bg-blue-600 text-white'; // Azul
      case 'done': return 'bg-green-600 text-white'; // Verde
      case 'stopped': return 'bg-red-600 text-white'; // Vermelho
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate Objective progress
  const calculateObjetivoOverallProgress = (objetivoId: string): number => {
    const krs = keyResultsMap?.get(objetivoId);
    if (!krs || krs.length === 0) {
      return 0;
    }
    const totalProgress = krs.reduce((sum, kr) => sum + calculateKeyResultProgress(kr), 0);
    return Math.round(totalProgress / krs.length);
  };


  if (isLoadingObjetivos || isLoadingAreas || isLoadingKeyResults || isLoadingPeriods) {
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

  const statuses = [
    { value: "draft", label: "Rascunho" },
    { value: "active", label: "Ativo" },
    { value: "completed", label: "Concluído" },
    { value: "archived", label: "Arquivado" },
  ];

  return (
    <>
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
                                          <TableHead className="w-[50px]"></TableHead> {/* For expand/collapse button */}
                                          <TableHead>Título do KR</TableHead>
                                          <TableHead>Período</TableHead>
                                          <TableHead>Tipo</TableHead>
                                          <TableHead>Meta</TableHead>
                                          <TableHead>Progresso (%)</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {keyResultsMap.get(objetivo.id)?.map((kr) => {
                                          const krProgress = calculateKeyResultProgress(kr);
                                          return (
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
                                                    <span className="sr-only">Detalhar KR</span>
                                                  </Button>
                                                </TableCell>
                                                <TableCell className="font-medium">{kr.titulo}</TableCell>
                                                <TableCell>{kr.periodo}</TableCell>
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
                                              {expandedKeyResults.has(kr.id) && (
                                                <TableRow>
                                                  <TableCell colSpan={8} className="p-0">
                                                    <div className="bg-gray-100 dark:bg-gray-700 p-4 border-t border-b">
                                                      <div className="flex justify-between items-center mb-3">
                                                        <h5 className="text-md font-semibold flex items-center">
                                                          <ListTodo className="mr-2 h-4 w-4" /> Atividades para "{kr.titulo}"
                                                        </h5>
                                                        <Button size="sm" onClick={() => handleAddAtividadeClick(kr)}>
                                                          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Atividade
                                                        </Button>
                                                      </div>
                                                      {kr.atividades && kr.atividades.length > 0 ? (
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
                                                              {kr.atividades.map((atividade) => (
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
                                                                      {atividade.status === 'stopped' && 'Parado'}
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
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o objetivo e todos os Key Results (KRs) e Atividades associados.
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
          preselectedKeyResultId={selectedKeyResultForAtividade?.id} {/* NOVO: Passando o ID do KR */}
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
    </>
  );
};

export default Objetivos;