"use client";

import React from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { getObjetivos, getObjetivosSummary, Objetivo, ObjetivoSummary } from "@/integrations/supabase/api/objetivos";
import { getAllKeyResults, getKeyResultsSummary, KeyResult, KeyResultSummary, calculateKeyResultProgress } from "@/integrations/supabase/api/key_results";
import { getAtividadesSummary, AtividadeSummary } from "@/integrations/supabase/api/atividades";
import { Loader2, Target, ListTodo, CheckCircle, Hourglass, XCircle, Flag, TrendingUp, AlertTriangle, Clock, CircleDot, StopCircle, LayoutDashboard } from "lucide-react";
import StatusDistributionChart from "@/components/charts/StatusDistributionChart";
import { Progress } from "@/components/ui/progress";
import AreaProgressList from '@/components/dashboard/AreaProgressList';
import RecentActivitiesList from '@/components/dashboard/RecentActivitiesList';
import AlertsAndPending from '@/components/dashboard/AlertsAndPending';
import KeyResultsByPeriodList from '@/components/dashboard/KeyResultsByPeriodList';
import { useUserPermissions } from '@/hooks/use-user-permissions';

const Index = () => {
  const { can, isLoading: permissionsLoading } = useUserPermissions();
  const canViewDashboard = can('dashboard', 'view');

  const { data: objetivosSummary, isLoading: isLoadingObjetivosSummary, error: errorObjetivosSummary } = useQuery<ObjetivoSummary[], Error>({
    queryKey: ["objetivosSummary"],
    queryFn: getObjetivosSummary,
    enabled: canViewDashboard && !permissionsLoading,
  });

  const { data: keyResultsSummary, isLoading: isLoadingKeyResultsSummary, error: errorKeyResultsSummary } = useQuery<KeyResultSummary[], Error>({
    queryKey: ["keyResultsSummary"],
    queryFn: getKeyResultsSummary,
    enabled: canViewDashboard && !permissionsLoading,
  });

  const { data: atividadesSummary, isLoading: isLoadingAtividades, error: errorAtividades } = useQuery<AtividadeSummary[], Error>({
    queryKey: ["atividadesSummary"],
    queryFn: getAtividadesSummary,
    enabled: canViewDashboard && !permissionsLoading,
  });

  // Fetch all objectives and key results for overall progress calculation
  const { data: allObjetivos, isLoading: isLoadingAllObjetivos, error: errorAllObjetivos } = useQuery<Objetivo[], Error>({
    queryKey: ["allObjetivos"],
    queryFn: () => getObjetivos(),
    enabled: canViewDashboard && !permissionsLoading,
  });

  const { data: allKeyResults, isLoading: isLoadingAllKeyResults, error: errorAllKeyResults } = useQuery<KeyResult[], Error>({
    queryKey: ["allKeyResults"],
    queryFn: () => getAllKeyResults(),
    enabled: canViewDashboard && !permissionsLoading,
  });

  const getTotalCount = (summary: { count: number }[] | null) => {
    return summary?.reduce((acc, item) => acc + item.count, 0) || 0;
  };

  const getStatusCount = (summary: { status: string; count: number }[] | null, status: string) => {
    return summary?.find(item => item.status === status)?.count || 0;
  };

  const renderLoading = () => (
    <div className="flex justify-center items-center h-24">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  // Calculate overall Objective progress
  const overallObjetivoProgress = React.useMemo(() => {
    if (!allObjetivos || !allKeyResults || allObjetivos.length === 0) return 0;

    let totalObjectiveProgress = 0;
    let objectivesWithKRs = 0;

    allObjetivos.forEach(obj => {
      const krsForObjective = allKeyResults.filter(kr => kr.objetivo_id === obj.id);
      if (krsForObjective.length > 0) {
        const objectiveKRsProgress = krsForObjective.reduce((sum, kr) => sum + calculateKeyResultProgress(kr), 0);
        totalObjectiveProgress += (objectiveKRsProgress / krsForObjective.length);
        objectivesWithKRs++;
      }
    });

    return objectivesWithKRs > 0 ? Math.round(totalObjectiveProgress / objectivesWithKRs) : 0;
  }, [allObjetivos, allKeyResults]);

  // Calculate overall Key Result progress
  const overallKeyResultProgress = React.useMemo(() => {
    if (!allKeyResults || allKeyResults.length === 0) return 0;

    const totalProgress = allKeyResults.reduce((sum, kr) => sum + calculateKeyResultProgress(kr), 0);
    return Math.round(totalProgress / allKeyResults.length);
  }, [allKeyResults]);


  // Prepare data for Objetivo Status Chart
  const objetivoChartData = [
    { name: 'Rascunhos', value: getStatusCount(objetivosSummary || [], 'draft'), color: '#facc15' },
    { name: 'Ativos', value: getStatusCount(objetivosSummary || [], 'active'), color: '#3b82f6' },
    { name: 'Concluídos', value: getStatusCount(objetivosSummary || [], 'completed'), color: '#22c55e' },
    { name: 'Arquivados', value: getStatusCount(objetivosSummary || [], 'archived'), color: '#6b7280' },
  ].filter(item => item.value > 0);

  // Prepare data for Key Result Status Chart
  const keyResultChartData = [
    { name: 'No Caminho', value: getStatusCount(keyResultsSummary || [], 'on_track'), color: '#22c55e' },
    { name: 'Em Risco', value: getStatusCount(keyResultsSummary || [], 'at_risk'), color: '#facc15' },
    { name: 'Fora do Caminho', value: getStatusCount(keyResultsSummary || [], 'off_track'), color: '#ef4444' },
    { name: 'Concluídos', value: getStatusCount(keyResultsSummary || [], 'completed'), color: '#3b82f6' },
  ].filter(item => item.value > 0);

  // Prepare data for Atividade Status Chart
  const atividadeChartData = [
    { name: 'A Fazer', value: getStatusCount(atividadesSummary || [], 'todo'), color: '#1f2937' },
    { name: 'Em Progresso', value: getStatusCount(atividadesSummary || [], 'in_progress'), color: '#2563eb' },
    { name: 'Paradas', value: getStatusCount(atividadesSummary || [], 'stopped'), color: '#dc2626' },
    { name: 'Concluídas', value: getStatusCount(atividadesSummary || [], 'done'), color: '#16a34a' },
  ].filter(item => item.value > 0);

  const isLoadingOverallData = isLoadingAllObjetivos || isLoadingAllKeyResults || isLoadingObjetivosSummary || isLoadingKeyResultsSummary || isLoadingAtividades || permissionsLoading;
  const errorOverallData = errorAllObjetivos || errorAllKeyResults || errorObjetivosSummary || errorKeyResultsSummary || errorAtividades;

  if (permissionsLoading) {
    return renderLoading();
  }

  if (!canViewDashboard) {
    return (
      <div className="container mx-auto py-6 text-center text-red-500">
        Você não tem permissão para visualizar o Dashboard.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <LayoutDashboard className="mr-2 h-6 w-6 text-fade-red" /> Dashboard OKR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Bem-vindo ao sistema de gestão de OKRs da FADE-UFPE.
            Use a barra lateral para navegar entre as seções.
          </p>
          <p className="text-gray-600">
            Aqui você encontra um resumo rápido do status atual dos seus Objetivos, Key Results e Atividades.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {/* Objetivos Summary Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objetivos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingOverallData ? renderLoading() : errorOverallData ? <p className="text-red-500">Erro ao carregar</p> : (
              <>
                <div className="text-2xl font-bold">{getTotalCount(objetivosSummary || [])}</div>
                <p className="text-xs text-muted-foreground mt-2 mb-2">
                  <span className="text-yellow-600 mr-1"><CircleDot className="inline h-3 w-3" /> {getStatusCount(objetivosSummary || [], 'draft')} Rascunhos</span>
                  <span className="text-blue-600 mr-1"><Flag className="inline h-3 w-3" /> {getStatusCount(objetivosSummary || [], 'active')} Ativos</span>
                  <span className="text-green-600 mr-1"><CheckCircle className="inline h-3 w-3" /> {getStatusCount(objetivosSummary || [], 'completed')} Concluídos</span>
                </p>
                <div className="flex items-center gap-2">
                  <Progress value={overallObjetivoProgress} className="w-full" />
                  <span className="text-sm font-semibold">{overallObjetivoProgress}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Progresso Geral</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Key Results Summary Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Key Results</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingOverallData ? renderLoading() : errorOverallData ? <p className="text-red-500">Erro ao carregar</p> : (
              <>
                <div className="text-2xl font-bold">{getTotalCount(keyResultsSummary || [])}</div>
                <p className="text-xs text-muted-foreground mt-2 mb-2">
                  <span className="text-green-600 mr-1"><CheckCircle className="inline h-3 w-3" /> {getStatusCount(keyResultsSummary || [], 'on_track')} No Caminho</span>
                  <span className="text-yellow-600 mr-1"><AlertTriangle className="inline h-3 w-3" /> {getStatusCount(keyResultsSummary || [], 'at_risk')} Em Risco</span>
                  <span className="text-red-600 mr-1"><XCircle className="inline h-3 w-3" /> {getStatusCount(keyResultsSummary || [], 'off_track')} Fora do Caminho</span>
                </p>
                <div className="flex items-center gap-2">
                  <Progress value={overallKeyResultProgress} className="w-full" />
                  <span className="text-sm font-semibold">{overallKeyResultProgress}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Progresso Geral</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Atividades Summary Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividades</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingOverallData ? renderLoading() : errorOverallData ? <p className="text-red-500">Erro ao carregar</p> : (
              <>
                <div className="text-2xl font-bold">{getTotalCount(atividadesSummary || [])}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="text-gray-900 mr-1"><Clock className="inline h-3 w-3" /> {getStatusCount(atividadesSummary || [], 'todo')} A Fazer</span>
                  <span className="text-blue-600 mr-1"><Hourglass className="inline h-3 w-3" /> {getStatusCount(atividadesSummary || [], 'in_progress')} Em Progresso</span>
                  <span className="text-red-600 mr-1"><StopCircle className="inline h-3 w-3" /> {getStatusCount(atividadesSummary || [], 'stopped')} Paradas</span>
                  <span className="text-green-600 mr-1"><CheckCircle className="inline h-3 w-3" /> {getStatusCount(atividadesSummary || [], 'done')} Concluídas</span>
                </p>
                {/* Activities don't have a single numerical progress, so no progress bar here */}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3 mb-6">
        {isLoadingObjetivosSummary ? renderLoading() : errorObjetivosSummary ? <p className="text-red-500">Erro ao carregar gráfico de objetivos</p> : (
          <StatusDistributionChart title="Status dos Objetivos" data={objetivoChartData} />
        )}
        {isLoadingKeyResultsSummary ? renderLoading() : errorKeyResultsSummary ? <p className="text-red-500">Erro ao carregar gráfico de Key Results</p> : (
          <StatusDistributionChart title="Status dos Key Results" data={keyResultChartData} />
        )}
        {isLoadingAtividades ? renderLoading() : errorAtividades ? <p className="text-red-500">Erro ao carregar gráfico de atividades</p> : (
          <StatusDistributionChart title="Status das Atividades" data={atividadeChartData} />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3 mb-6">
        <AreaProgressList />
        <RecentActivitiesList />
      </div>

      {/* Alerts and Pending section - now full width */}
      <div className="mb-6">
        <AlertsAndPending />
      </div>

      {/* New section for Key Results by Period */}
      <div className="grid gap-4 mb-6">
        <KeyResultsByPeriodList />
      </div>

      <MadeWithDyad />
    </div>
  );
};

export default Index;