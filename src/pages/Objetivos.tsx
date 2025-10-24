"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { getObjetivos, Objetivo } from "@/integrations/supabase/api/objetivos";
import { getKeyResultsByObjetivoId, KeyResult, calculateKeyResultProgress } from "@/integrations/supabase/api/key_results";
import { Atividade } from "@/integrations/supabase/api/atividades";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocation } from "react-router-dom";

// Importar os novos componentes modulares
import { ObjetivoFilters } from "@/components/objetivos/ObjetivoFilters";
import { ObjetivoList } from "@/components/objetivos/ObjetivoList";
import { ObjetivoModalsAndAlerts } from "@/components/objetivos/ObjetivoModalsAndAlerts";
import { useUserPermissions } from '@/hooks/use-user-permissions'; // Importar o hook de permissões

const Objetivos = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { can, isLoading: permissionsLoading } = useUserPermissions();

  // Permissões para Objetivos
  const canViewObjetivos = can('objetivos', 'view');
  const canInsertObjetivos = can('objetivos', 'insert');
  const canEditObjetivos = can('objetivos', 'edit');
  const canDeleteObjetivos = can('objetivos', 'delete');

  // Permissões para Key Results
  const canViewKeyResults = can('key_results', 'view');
  const canInsertKeyResults = can('key_results', 'insert');
  const canEditKeyResults = can('key_results', 'edit');
  const canDeleteKeyResults = can('key_results', 'delete');

  // Permissões para Atividades
  const canInsertAtividades = can('atividades', 'insert');
  const canEditAtividades = can('atividades', 'edit');
  const canDeleteAtividades = can('atividades', 'delete');


  // State for filters and sorting
  const [statusFilter, setStatusFilter] = useState<Objetivo['status'] | 'all'>('all');
  const [areaFilter, setAreaFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [sortBy, setSortBy] = useState<keyof Objetivo | 'area_name'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // State for Objetivo management (passed to ModalsAndAlerts)
  const [isObjetivoFormOpen, setIsObjetivoFormOpen] = useState(false);
  const [editingObjetivo, setEditingObjetivo] = useState<Objetivo | null>(null);
  const [isObjetivoDeleteDialogOpen, setIsObjetivoDeleteDialogOpen] = useState(false);
  const [objetivoToDelete, setObjetivoToDelete] = useState<string | null>(null);
  const [expandedObjetivos, setExpandedObjetivos] = useState<Set<string>>(new Set());

  // State for Key Result management (passed to ModalsAndAlerts)
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

  // State for Activity management (passed to ModalsAndAlerts)
  const [isAtividadeFormOpen, setIsAtividadeFormOpen] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState<Atividade | null>(null);
  const [selectedKeyResultForAtividade, setSelectedKeyResultForAtividade] = useState<KeyResult | null>(null);
  const [isAtividadeDeleteDialogOpen, setIsAtividadeDeleteDialogOpen] = useState(false);
  const [atividadeToDelete, setAtividadeToDelete] = useState<string | null>(null);

  // Effect to apply area filter from navigation state
  useEffect(() => {
    if (location.state && (location.state as any).areaId !== undefined) {
      const areaIdFromState = (location.state as any).areaId;
      setAreaFilter(areaIdFromState === null ? 'null' : areaIdFromState);
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.state]);

  const { data: objetivos, isLoading: isLoadingObjetivos, error: objetivosError } = useQuery<Objetivo[] | null, Error>({
    queryKey: ["objetivos", { statusFilter, areaFilter, search: debouncedSearchQuery, sortBy, sortOrder }],
    queryFn: ({ queryKey }) => {
      const params = queryKey[1] as {
        statusFilter: Objetivo['status'] | 'all';
        areaFilter: string | 'all';
        search: string;
        sortBy: keyof Objetivo | 'area_name';
        sortOrder: 'asc' | 'desc';
      };
      return getObjetivos({
        status: params.statusFilter,
        area_id: params.areaFilter,
        search: params.search,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      });
    },
    enabled: canViewObjetivos && !permissionsLoading, // Habilitar query apenas se tiver permissão
  });

  const { data: keyResultsMap, isLoading: isLoadingKeyResults } = useQuery<Map<string, KeyResult[]>, Error>({
    queryKey: ["key_results_by_objetivo", objetivos],
    queryFn: async ({ queryKey }) => {
      const currentObjetivos = queryKey[1] as Objetivo[] | null;
      if (!currentObjetivos) return new Map();

      const krPromises = currentObjetivos.map(async (obj) => {
        const krs = await getKeyResultsByObjetivoId(obj.id);
        return [obj.id, krs || []] as [string, KeyResult[]];
      });
      const results = await Promise.all(krPromises);
      return new Map(results);
    },
    enabled: !!objetivos && canViewKeyResults && !permissionsLoading, // Habilitar query apenas se tiver permissão
  });

  // NEW: Effect to expand objective and KR if keyResultId is in location.state
  useEffect(() => {
    if (location.state && (location.state as any).keyResultId && keyResultsMap && objetivos) {
      const targetKeyResultId = (location.state as any).keyResultId;
      let foundObjetivoId: string | null = null;

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
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.state, keyResultsMap, objetivos]);

  // Handlers for Objetivos
  const handleEditObjetivoClick = (objetivo: Objetivo) => {
    setEditingObjetivo(objetivo);
    setIsObjetivoFormOpen(true);
  };

  const handleDeleteObjetivoClick = (id: string) => {
    setObjetivoToDelete(id);
    setIsObjetivoDeleteDialogOpen(true);
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

  // Helper functions for badge classes
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
      case 'todo': return 'bg-gray-900 text-white';
      case 'in_progress': return 'bg-blue-600 text-white';
      case 'done': return 'bg-green-600 text-white';
      case 'stopped': return 'bg-red-600 text-white';
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

  if (isLoadingObjetivos || permissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewObjetivos) {
    return (
      <div className="container mx-auto py-6 text-center text-red-500">
        Você não tem permissão para visualizar esta página.
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
          {canInsertObjetivos && (
            <Button onClick={() => { setEditingObjetivo(null); setIsObjetivoFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Objetivo
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <ObjetivoFilters
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            areaFilter={areaFilter}
            setAreaFilter={setAreaFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
          />

          <ObjetivoList
            objetivos={objetivos || null} // Explicitly pass null if undefined
            keyResultsMap={keyResultsMap}
            isLoadingKeyResults={isLoadingKeyResults}
            expandedObjetivos={expandedObjetivos}
            toggleObjetivoExpansion={toggleObjetivoExpansion}
            expandedKeyResults={expandedKeyResults}
            toggleKeyResultExpansion={toggleKeyResultExpansion}
            onEditObjetivo={handleEditObjetivoClick}
            onDeleteObjetivo={handleDeleteObjetivoClick}
            onAddKeyResult={handleAddKeyResultClick}
            onEditKeyResult={handleEditKeyResultClick}
            onDeleteKeyResult={handleDeleteKeyResultClick}
            onAddAtividade={handleAddAtividadeClick}
            onEditAtividade={handleEditAtividadeClick}
            onDeleteAtividade={handleDeleteAtividadeClick}
            calculateObjetivoOverallProgress={calculateObjetivoOverallProgress}
            getObjetivoStatusBadgeClass={getObjetivoStatusBadgeClass}
            getKeyResultStatusBadgeClass={getKeyResultStatusBadgeClass}
            getAtividadeStatusBadgeClass={getAtividadeStatusBadgeClass}
            canEditObjetivos={canEditObjetivos} // Pass permissions to children
            canDeleteObjetivos={canDeleteObjetivos}
            canInsertKeyResults={canInsertKeyResults}
            canEditKeyResults={canEditKeyResults}
            canDeleteKeyResults={canDeleteKeyResults}
            canInsertAtividades={canInsertAtividades}
            canEditAtividades={canEditAtividades}
            canDeleteAtividades={canDeleteAtividades}
          />
        </CardContent>
      </Card>

      <ObjetivoModalsAndAlerts
        isObjetivoFormOpen={isObjetivoFormOpen}
        setIsObjetivoFormOpen={setIsObjetivoFormOpen}
        editingObjetivo={editingObjetivo}
        setEditingObjetivo={setEditingObjetivo}
        isObjetivoDeleteDialogOpen={isObjetivoDeleteDialogOpen}
        setIsObjetivoDeleteDialogOpen={setIsObjetivoDeleteDialogOpen}
        objetivoToDelete={objetivoToDelete}
        setObjetivoToDelete={setObjetivoToDelete}

        isKeyResultFormOpen={isKeyResultFormOpen}
        setIsKeyResultFormOpen={setIsKeyResultFormOpen}
        editingKeyResult={editingKeyResult}
        setEditingKeyResult={setEditingKeyResult}
        selectedObjetivoForKR={selectedObjetivoForKR}
        setSelectedObjetivoForKR={setSelectedObjetivoForKR}
        isKeyResultDeleteDialogOpen={isKeyResultDeleteDialogOpen}
        setIsKeyResultDeleteDialogOpen={setIsKeyResultDeleteDialogOpen}
        keyResultToDelete={keyResultToDelete}
        setKeyResultToDelete={setKeyResultToDelete}

        isAtividadeFormOpen={isAtividadeFormOpen}
        setIsAtividadeFormOpen={setIsAtividadeFormOpen}
        editingAtividade={editingAtividade}
        setEditingAtividade={setEditingAtividade}
        selectedKeyResultForAtividade={selectedKeyResultForAtividade}
        setSelectedKeyResultForAtividade={setSelectedKeyResultForAtividade}
        isAtividadeDeleteDialogOpen={isAtividadeDeleteDialogOpen}
        setIsAtividadeDeleteDialogOpen={setIsAtividadeDeleteDialogOpen}
        atividadeToDelete={atividadeToDelete}
        setAtividadeToDelete={setAtividadeToDelete}
      />
    </div>
  );
};

export default Objetivos;