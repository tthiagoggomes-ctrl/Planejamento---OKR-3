"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, Target, Clock, XCircle, TrendingUp, Building, ChevronDown, ChevronUp } from 'lucide-react';
import { getAllKeyResults, KeyResult, calculateKeyResultProgress } from '@/integrations/supabase/api/key_results';
import { getObjetivos, Objetivo } from '@/integrations/supabase/api/objetivos';
import { getAtividades, Atividade } from '@/integrations/supabase/api/atividades';
import { getAreas, Area } from '@/integrations/supabase/api/areas';
import { showError } from '@/utils/toast';
import { formatDistanceToNow, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { Button } from '@/components/ui/button'; // Import Button

const AlertsAndPending: React.FC = () => {
  const navigate = useNavigate(); // Initialize useNavigate
  const [showAllKRsAtRisk, setShowAllKRsAtRisk] = React.useState(false); // Novo estado para controlar a expansão

  const { data: keyResults, isLoading: isLoadingKeyResults, error: errorKeyResults } = useQuery<KeyResult[], Error>({
    queryKey: ["allKeyResults"],
    queryFn: getAllKeyResults,
  });

  const { data: objetivos, isLoading: isLoadingObjetivos, error: errorObjetivos } = useQuery<Objetivo[], Error>({
    queryKey: ["objetivos"],
    queryFn: () => getObjetivos(),
  });

  const { data: atividades, isLoading: isLoadingAtividades, error: errorAtividades } = useQuery<Atividade[], Error>({
    queryKey: ["allActivities"],
    queryFn: () => getAtividades(),
  });

  const { data: areas, isLoading: isLoadingAreas, error: errorAreas } = useQuery<Area[], Error>({
    queryKey: ["areas"],
    queryFn: getAreas,
  });

  const krsAtRiskOrOffTrack = React.useMemo(() => {
    return keyResults?.filter(kr => kr.status === 'at_risk' || kr.status === 'off_track') || [];
  }, [keyResults]);

  const objectivesBelow30Percent = React.useMemo(() => {
    if (!objetivos || !keyResults) return [];
    return objetivos.filter(obj => {
      const krsForObjective = keyResults.filter(kr => kr.objetivo_id === obj.id);
      if (krsForObjective.length === 0) return false; // Consider objectives without KRs as not having progress
      const totalProgress = krsForObjective.reduce((sum, kr) => sum + calculateKeyResultProgress(kr), 0);
      const averageProgress = totalProgress / krsForObjective.length;
      return averageProgress < 30;
    });
  }, [objetivos, keyResults]);

  const areasWithoutRecentUpdates = React.useMemo(() => {
    if (!areas || !objetivos || !keyResults || !atividades) return [];

    const sevenDaysAgo = subDays(new Date(), 7);
    const areasWithNoRecentUpdate: Area[] = [];

    areas.forEach(area => {
      let latestUpdate: Date | null = null;

      // Check objectives for this area
      objetivos.filter(obj => obj.area_id === area.id).forEach(obj => {
        if (obj.updated_at && new Date(obj.updated_at) > (latestUpdate || new Date(0))) {
          latestUpdate = new Date(obj.updated_at);
        }
      });

      // Check key results for objectives in this area
      const krsInArea = keyResults.filter(kr => objetivos.some(obj => obj.id === kr.objetivo_id && obj.area_id === area.id));
      krsInArea.forEach(kr => {
        if (kr.updated_at && new Date(kr.updated_at) > (latestUpdate || new Date(0))) {
          latestUpdate = new Date(kr.updated_at);
        }
      });

      // Check activities for key results in this area
      const activitiesInArea = atividades.filter(ativ => krsInArea.some(kr => kr.id === ativ.key_result_id));
      activitiesInArea.forEach(ativ => {
        if (ativ.updated_at && new Date(ativ.updated_at) > (latestUpdate || new Date(0))) {
          latestUpdate = new Date(ativ.updated_at);
        }
      });

      if (!latestUpdate || latestUpdate < sevenDaysAgo) {
        areasWithNoRecentUpdate.push(area);
      }
    });

    return areasWithNoRecentUpdate;
  }, [areas, objetivos, keyResults, atividades]);

  const handleAreaClick = (areaId: string | null) => {
    navigate('/objetivos', { state: { areaId } });
  };

  const handleObjectiveClick = (objectiveId: string) => {
    navigate(`/objetivos/${objectiveId}`);
  };

  const handleKeyResultClick = (objetivoId: string, keyResultId: string) => {
    navigate(`/objetivos/${objetivoId}`, { state: { keyResultId } });
  };


  if (isLoadingKeyResults || isLoadingObjetivos || isLoadingAtividades || isLoadingAreas) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center text-red-600">
            <AlertTriangle className="mr-2 h-5 w-5" /> Alertas e Pendências
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (errorKeyResults || errorObjetivos || errorAtividades || errorAreas) {
    showError("Erro ao carregar alertas e pendências.");
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center text-red-600">
            <AlertTriangle className="mr-2 h-5 w-5" /> Alertas e Pendências
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-red-500">
          Erro ao carregar dados.
        </CardContent>
      </Card>
    );
  }

  const hasAlerts = krsAtRiskOrOffTrack.length > 0 || objectivesBelow30Percent.length > 0 || areasWithoutRecentUpdates.length > 0;

  // KRs a serem exibidos (limitado a 5 ou todos)
  const displayedKRsAtRisk = showAllKRsAtRisk ? krsAtRiskOrOffTrack : krsAtRiskOrOffTrack.slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className={`text-lg font-semibold flex items-center ${hasAlerts ? 'text-red-600' : 'text-green-600'}`}>
          <AlertTriangle className="mr-2 h-5 w-5" /> Alertas e Pendências
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAlerts ? (
          <p className="text-green-600 text-center py-4">Nenhum alerta ou pendência crítica no momento. Bom trabalho!</p>
        ) : (
          <div className="space-y-4"> {/* This was the original structure, not a grid */}
            {/* Key Results em Risco/Fora do Caminho Card */}
            {krsAtRiskOrOffTrack.length > 0 && (
              <div>
                <h4 className="font-semibold text-orange-600 flex items-center gap-1 mb-2">
                  <TrendingUp className="mr-2 h-4 w-4" /> Key Results em Risco/Fora do Caminho ({krsAtRiskOrOffTrack.length})
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {displayedKRsAtRisk.map(kr => (
                    <li
                      key={kr.id}
                      className="cursor-pointer hover:text-blue-600 hover:underline"
                      onClick={() => handleKeyResultClick(kr.objetivo_id, kr.id)}
                    >
                      {kr.titulo} (Status: {kr.status === 'at_risk' ? 'Em Risco' : 'Fora do Caminho'})
                    </li>
                  ))}
                </ul>
                {krsAtRiskOrOffTrack.length > 5 && (
                  <Button
                    variant="link"
                    className="mt-2 p-0 h-auto text-sm"
                    onClick={() => setShowAllKRsAtRisk(!showAllKRsAtRisk)}
                  >
                    {showAllKRsAtRisk ? (
                      <>
                        <ChevronUp className="mr-1 h-4 w-4" /> Ocultar
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-1 h-4 w-4" /> Ver todos ({krsAtRiskOrOffTrack.length - 5} mais)
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Objetivos Abaixo de 30% de Conclusão Card */}
            {objectivesBelow30Percent.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-600 flex items-center gap-1 mb-2">
                  <Target className="mr-2 h-4 w-4" /> Objetivos Abaixo de 30% de Conclusão ({objectivesBelow30Percent.length})
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {objectivesBelow30Percent.map(obj => (
                    <li
                      key={obj.id}
                      className="cursor-pointer hover:text-blue-600 hover:underline"
                      onClick={() => handleObjectiveClick(obj.id)}
                    >
                      {obj.titulo}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Áreas sem Atualizações Recentes Card */}
            {areasWithoutRecentUpdates.length > 0 && (
              <div>
                <h4 className="font-semibold text-yellow-600 flex items-center gap-1 mb-2">
                  <Building className="mr-2 h-4 w-4" /> Áreas sem Atualizações Recentes ({areasWithoutRecentUpdates.length})
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {areasWithoutRecentUpdates.map(area => (
                    <li
                      key={area.id}
                      className="cursor-pointer hover:text-blue-600 hover:underline"
                      onClick={() => handleAreaClick(area.id)}
                    >
                      {area.nome}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsAndPending;