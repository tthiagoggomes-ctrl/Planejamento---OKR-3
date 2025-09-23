"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Building } from 'lucide-react';
import { getAreas, Area } from '@/integrations/supabase/api/areas';
import { getObjetivos, Objetivo } from '@/integrations/supabase/api/objetivos';
import { getAllKeyResults, KeyResult, calculateKeyResultProgress } from '@/integrations/supabase/api/key_results';
import { showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom'; // Importar useNavigate

const AreaProgressList: React.FC = () => {
  const navigate = useNavigate(); // Inicializar useNavigate

  const { data: areas, isLoading: isLoadingAreas, error: errorAreas } = useQuery<Area[], Error>({
    queryKey: ["areas"],
    queryFn: getAreas,
  });

  const { data: objetivos, isLoading: isLoadingObjetivos, error: errorObjetivos } = useQuery<Objetivo[], Error>({
    queryKey: ["objetivos"],
    queryFn: () => getObjetivos(),
  });

  const { data: keyResults, isLoading: isLoadingKeyResults, error: errorKeyResults } = useQuery<KeyResult[], Error>({
    queryKey: ["allKeyResults"],
    queryFn: getAllKeyResults,
  });

  const calculateAreaProgress = (areaId: string | null): number => {
    if (!objetivos || !keyResults) return 0;

    const areaObjetivos = objetivos.filter(obj => obj.area_id === areaId);
    if (areaObjetivos.length === 0) return 0;

    let totalObjectiveProgress = 0;
    let objectivesWithKRs = 0;

    areaObjetivos.forEach(obj => {
      const krsForObjective = keyResults.filter(kr => kr.objetivo_id === obj.id);
      if (krsForObjective.length > 0) {
        const objectiveKRsProgress = krsForObjective.reduce((sum, kr) => sum + calculateKeyResultProgress(kr), 0);
        totalObjectiveProgress += (objectiveKRsProgress / krsForObjective.length);
        objectivesWithKRs++;
      }
    });

    return objectivesWithKRs > 0 ? Math.round(totalObjectiveProgress / objectivesWithKRs) : 0;
  };

  const handleAreaClick = (areaId: string | null) => {
    navigate('/objetivos', { state: { areaId } });
  };

  if (isLoadingAreas || isLoadingObjetivos || isLoadingKeyResults) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <Building className="mr-2 h-5 w-5" /> Progresso por Área
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (errorAreas || errorObjetivos || errorKeyResults) {
    showError("Erro ao carregar progresso por área.");
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <Building className="mr-2 h-5 w-5" /> Progresso por Área
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-red-500">
          Erro ao carregar dados.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Building className="mr-2 h-5 w-5" /> Progresso por Área
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {areas && areas.length > 0 ? (
          areas.map((area) => {
            const progress = calculateAreaProgress(area.id);
            return (
              <div
                key={area.id}
                className="flex flex-col gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-md transition-colors"
                onClick={() => handleAreaClick(area.id)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{area.nome}</span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            );
          })
        ) : (
          <p className="text-gray-600">Nenhuma área cadastrada.</p>
        )}
        {/* Progress for objectives without an assigned area */}
        {objetivos && objetivos.some(obj => obj.area_id === null) && (
          <div
            className="flex flex-col gap-2 border-t pt-4 mt-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-md transition-colors"
            onClick={() => handleAreaClick(null)}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">Objetivos sem Área</span>
              <span className="text-sm text-muted-foreground">{calculateAreaProgress(null)}%</span>
            </div>
            <Progress value={calculateAreaProgress(null)} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AreaProgressList;