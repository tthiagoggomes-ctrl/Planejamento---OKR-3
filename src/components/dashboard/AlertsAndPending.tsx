"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, Target, TrendingUp, Building, ChevronDown, ChevronUp } from 'lucide-react';
import { getAllKeyResults, KeyResult, calculateKeyResultProgress } from '@/integrations/supabase/api/key_results';
import { getObjetivos, Objetivo } from '@/integrations/supabase/api/objetivos';
import { getAtividades, Atividade } from '@/integrations/supabase/api/atividades';
import { getAreas, Area } from '@/integrations/supabase/api/areas';
import { showError } from '@/utils/toast';
import { subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const AlertsAndPending: React.FC = () => {
  const navigate = useNavigate();
  const [showAllKRsAtRisk, setShowAllKRsAtRisk] = React.useState(false);

  const { data: keyResults, isLoading: isLoadingKeyResults, error: errorKeyResults } = useQuery<KeyResult[], Error>({
    queryKey: ["allKeyResults"],
    queryFn: async () => (await getAllKeyResults()) || [],
  });

  const { data: objetivos, isLoading: isLoadingObjetivos, error: errorObjetivos } = useQuery<Objetivo[], Error>({
    queryKey: ["objetivos"],
    queryFn: async () => (await getObjetivos()) || [],
  });

  const { data: atividades, isLoading: isLoadingAtividades, error: errorAtividades } = useQuery<Atividade[], Error>({
    queryKey: ["allActivities"],
    queryFn: async () => (await getAtividades()) || [],
  });

  const { data: areas, isLoading: isLoadingAreas, error: errorAreas } = useQuery<Area[], Error>({
    queryKey: ["areas"],
    queryFn: async () => (await getAreas()) || [],
  });

  const krsAtRiskOrOffTrack = React.useMemo(() => {
    return keyResults?.filter(kr => kr.status === 'at_risk' || kr.status === 'off_track') || [];
  }, [keyResults]);

  const objectivesBelow30Percent = React.useMemo(() => {
    if (!objetivos || !keyResults) return [];
    return objetivos.filter(obj => {
      const krsForObjective = keyResults.filter(kr => kr.objetivo_id === obj.id);
      if (krsForObjective.length === 0) return false;
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
        if (obj.updated_at) {
          const objUpdatedAt = new Date(obj.updated_at);
          if (objUpdatedAt > (latestUpdate || new Date(0))) {
            latestUpdate = objUpdatedAt;
          }
        }
      });

      // Check key results for objectives in this area
      const krsInArea = keyResults.filter(kr => objetivos.some(obj => obj.id === kr.objetivo_id && obj.area_id === area.id));
      krsInArea.forEach(kr => {
        if (kr.updated_at) {
          const krUpdatedAt = new Date(kr.updated_at);
          if (krUpdatedAt > (latestUpdate || new Date(0))) {
            latestUpdate = krUpdatedAt;
          }
        }
      });

      // Check activities for key results in this area
      const activitiesInArea = atividades.filter(ativ => krsInArea.some(kr => kr.id === ativ.key_result_id));
      activitiesInArea.forEach(ativ => {
        if (ativ.updated_at) {
          const ativUpdatedAt = new Date(ativ.updated_at);
          if (ativUpdatedAt > (latestUpdate || new Date(0))) {
            latestUpdate = ativUpdatedAt;
          }
        }
      });

      if (latestUpdate === null || latestUpdate < sevenDaysAgo) {
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

  if (errorAreas || errorObjetivos || errorKeyResults || errorAtividades) {
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Key Results em Risco/Fora do Caminho Card */}
            {krsAtRiskOrOffTrack.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-md font-semibold flex items-center text-orange-600">
                    <TrendingUp className="mr-2 h-4 w-4" /> Key Results em Risco/Fora do Caminho ({krsAtRiskOrOffTrack.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            )}

            {/* Objetivos Abaixo de 30% de Conclusão Card */}
            {objectivesBelow30Percent.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-md font-semibold flex items-center text-red-600">
                    <Target className="mr-2 h-4 w-4" /> Objetivos Abaixo de 30% de Conclusão ({objectivesBelow30Percent.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            )}

            {/* Áreas sem Atualizações Recentes Card */}
            {areasWithoutRecentUpdates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-md font-semibold flex items-center text-yellow-600">
                    <Building className="mr-2 h-4 w-4" /> Áreas sem Atualizações Recentes ({areasWithoutRecentUpdates.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsAndPending;