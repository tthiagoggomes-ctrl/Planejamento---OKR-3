"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { getObjetivosSummary, ObjetivoSummary } from "@/integrations/supabase/api/objetivos";
import { getKeyResultsSummary, KeyResultSummary } from "@/integrations/supabase/api/key_results";
import { getAtividadesSummary, AtividadeSummary } from "@/integrations/supabase/api/atividades";
import { Loader2, Target, ListTodo, CheckCircle, Hourglass, XCircle, Flag, TrendingUp, AlertTriangle, Clock, CircleDot } from "lucide-react";

const Index = () => {
  const { data: objetivosSummary, isLoading: isLoadingObjetivos, error: errorObjetivos } = useQuery<ObjetivoSummary[], Error>({
    queryKey: ["objetivosSummary"],
    queryFn: getObjetivosSummary,
  });

  const { data: keyResultsSummary, isLoading: isLoadingKeyResults, error: errorKeyResults } = useQuery<KeyResultSummary[], Error>({
    queryKey: ["keyResultsSummary"],
    queryFn: getKeyResultsSummary,
  });

  const { data: atividadesSummary, isLoading: isLoadingAtividades, error: errorAtividades } = useQuery<AtividadeSummary[], Error>({
    queryKey: ["atividadesSummary"],
    queryFn: getAtividadesSummary,
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

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Dashboard FADE-UFPE OKR</CardTitle>
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
            {isLoadingObjetivos ? renderLoading() : errorObjetivos ? <p className="text-red-500">Erro ao carregar</p> : (
              <>
                <div className="text-2xl font-bold">{getTotalCount(objetivosSummary)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="text-yellow-600 mr-1"><CircleDot className="inline h-3 w-3" /> {getStatusCount(objetivosSummary, 'draft')} Rascunhos</span>
                  <span className="text-blue-600 mr-1"><Flag className="inline h-3 w-3" /> {getStatusCount(objetivosSummary, 'active')} Ativos</span>
                  <span className="text-green-600 mr-1"><CheckCircle className="inline h-3 w-3" /> {getStatusCount(objetivosSummary, 'completed')} Concluídos</span>
                </p>
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
            {isLoadingKeyResults ? renderLoading() : errorKeyResults ? <p className="text-red-500">Erro ao carregar</p> : (
              <>
                <div className="text-2xl font-bold">{getTotalCount(keyResultsSummary)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="text-green-600 mr-1"><CheckCircle className="inline h-3 w-3" /> {getStatusCount(keyResultsSummary, 'on_track')} No Caminho</span>
                  <span className="text-yellow-600 mr-1"><AlertTriangle className="inline h-3 w-3" /> {getStatusCount(keyResultsSummary, 'at_risk')} Em Risco</span>
                  <span className="text-red-600 mr-1"><XCircle className="inline h-3 w-3" /> {getStatusCount(keyResultsSummary, 'off_track')} Fora do Caminho</span>
                </p>
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
            {isLoadingAtividades ? renderLoading() : errorAtividades ? <p className="text-red-500">Erro ao carregar</p> : (
              <>
                <div className="text-2xl font-bold">{getTotalCount(atividadesSummary)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="text-gray-600 mr-1"><Clock className="inline h-3 w-3" /> {getStatusCount(atividadesSummary, 'todo')} A Fazer</span>
                  <span className="text-blue-600 mr-1"><Hourglass className="inline h-3 w-3" /> {getStatusCount(atividadesSummary, 'in_progress')} Em Progresso</span>
                  <span className="text-green-600 mr-1"><CheckCircle className="inline h-3 w-3" /> {getStatusCount(atividadesSummary, 'done')} Concluídas</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <MadeWithDyad />
    </div>
  );
};

export default Index;