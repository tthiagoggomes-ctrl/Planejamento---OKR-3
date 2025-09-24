"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CalendarDays, AlertTriangle, Clock, CheckCircle, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { getPeriodos, Periodo } from '@/integrations/supabase/api/periodos';
import { getAllKeyResults, KeyResult } from '@/integrations/supabase/api/key_results';
import { showError } from '@/utils/toast';
import { format, isPast, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Switch } from '@/components/ui/switch'; // Import Switch
import { Label } from '@/components/ui/label'; // Import Label
import { Progress } from '@/components/ui/progress'; // Import Progress

interface KeyResultsByPeriodListProps {
  // Pode aceitar filtros ou propriedades adicionais no futuro, se necessário
}

const KeyResultsByPeriodList: React.FC<KeyResultsByPeriodListProps> = () => {
  const { data: periods, isLoading: isLoadingPeriods, error: errorPeriods } = useQuery<Periodo[], Error>({
    queryKey: ["allPeriods"],
    queryFn: getPeriodos,
  });

  const { data: keyResults, isLoading: isLoadingKeyResults, error: errorKeyResults } = useQuery<KeyResult[], Error>({
    queryKey: ["allKeyResults"],
    queryFn: getAllKeyResults,
  });

  const [hideEmptyPeriods, setHideEmptyPeriods] = React.useState(false); // Novo estado

  const now = new Date();

  const groupedKRs = React.useMemo(() => {
    if (!periods || !keyResults) return [];

    const groups: Record<string, { period: Periodo; overdueKRs: KeyResult[]; attentionKRs: KeyResult[]; otherKRs: KeyResult[] }> = {};

    // Initialize groups for all periods
    periods.forEach(p => {
      groups[p.id] = {
        period: p,
        overdueKRs: [],
        attentionKRs: [],
        otherKRs: [],
      };
    });

    keyResults.forEach(kr => {
      const period = periods.find(p => p.nome === kr.periodo); // Find the actual period object by name
      if (!period) {
        // Se não encontrar um período correspondente, pode ser um KR sem período válido ou um período que não foi carregado
        // Por simplicidade, vamos ignorar KRs sem período correspondente por enquanto.
        return;
      }

      const periodEndDate = parseISO(period.end_date);
      const periodStartDate = parseISO(period.start_date);
      const isPeriodPast = isPast(periodEndDate, { now });
      const isPeriodCurrent = isWithinInterval(now, { start: periodStartDate, end: periodEndDate });

      if (kr.status !== 'completed') {
        if (isPeriodPast) {
          groups[period.id].overdueKRs.push(kr);
        } else if (isPeriodCurrent) {
          groups[period.id].attentionKRs.push(kr);
        } else {
          groups[period.id].otherKRs.push(kr); // KRs futuros ou em andamento em períodos futuros
        }
      } else {
        groups[period.id].otherKRs.push(kr); // KRs já concluídos
      }
    });

    // Sort periods: current first, then past (most recent first), then future
    const sortedPeriodGroups = Object.values(groups).sort((a, b) => {
      const aEndDate = parseISO(a.period.end_date);
      const bEndDate = parseISO(b.period.end_date);
      const aStartDate = parseISO(a.period.start_date);
      const bStartDate = parseISO(b.period.start_date);

      const aIsCurrent = isWithinInterval(now, { start: aStartDate, end: aEndDate });
      const bIsCurrent = isWithinInterval(now, { start: bStartDate, end: bEndDate });

      if (aIsCurrent && !bIsCurrent) return -1; // Current periods first
      if (!aIsCurrent && bIsCurrent) return 1;

      const aIsPast = isPast(aEndDate, { now });
      const bIsPast = isPast(bEndDate, { now });

      if (aIsPast && !bIsPast) return -1; // Past periods after current, before future
      if (!aIsPast && bIsPast) return 1;

      // For past periods, sort by end_date descending (most recent past first)
      if (aIsPast && bIsPast) return bEndDate.getTime() - aEndDate.getTime();

      // For future periods, sort by start_date ascending
      return aStartDate.getTime() - bStartDate.getTime();
    });

    return sortedPeriodGroups;
  }, [periods, keyResults, now]);

  if (isLoadingPeriods || isLoadingKeyResults) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <CalendarDays className="mr-2 h-5 w-5" /> Key Results por Período
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (errorPeriods || errorKeyResults) {
    showError("Erro ao carregar Key Results por período.");
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <CalendarDays className="mr-2 h-5 w-5" /> Key Results por Período
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-red-500">
          Erro ao carregar dados.
        </CardContent>
      </Card>
    );
  }

  const filteredGroups = hideEmptyPeriods
    ? groupedKRs.filter(group => group.overdueKRs.length > 0 || group.attentionKRs.length > 0 || group.otherKRs.length > 0)
    : groupedKRs;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center">
          <CalendarDays className="mr-2 h-5 w-5" /> Key Results por Período
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Switch
            id="hide-empty-periods"
            checked={hideEmptyPeriods}
            onCheckedChange={setHideEmptyPeriods}
          />
          <Label htmlFor="hide-empty-periods" className="flex items-center gap-1 text-sm text-muted-foreground">
            {hideEmptyPeriods ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            Ocultar vazios
          </Label>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {filteredGroups.length === 0 ? (
          <p className="text-gray-600">Nenhum Key Result encontrado ou período associado.</p>
        ) : (
          filteredGroups.map(({ period, overdueKRs, attentionKRs, otherKRs }) => {
            const periodEndDate = parseISO(period.end_date);
            const periodStartDate = parseISO(period.start_date);
            const isPeriodPast = isPast(periodEndDate, { now });
            const isPeriodCurrent = isWithinInterval(now, { start: periodStartDate, end: periodEndDate });

            const hasOverdue = overdueKRs.length > 0;
            const hasAttention = attentionKRs.length > 0;

            return (
              <div key={period.id} className="border rounded-lg p-4 shadow-sm">
                <h3 className={`font-bold text-lg mb-3 flex items-center gap-2 ${
                  hasOverdue ? 'text-red-600' : hasAttention ? 'text-orange-600' : 'text-primary'
                }`}>
                  {isPeriodPast && <Clock className="h-5 w-5" />}
                  {isPeriodCurrent && <AlertTriangle className="h-5 w-5" />}
                  {period.nome}
                  <span className="text-sm text-muted-foreground ml-auto">
                    ({format(periodStartDate, 'dd/MM/yyyy', { locale: ptBR })} - {format(periodEndDate, 'dd/MM/yyyy', { locale: ptBR })})
                  </span>
                </h3>

                {hasOverdue && (
                  <div className="mb-3">
                    <h4 className="font-semibold text-red-600 flex items-center gap-1 mb-2">
                      <Clock className="h-4 w-4" /> Atrasados ({overdueKRs.length})
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      {overdueKRs.map(kr => (
                        <li key={kr.id} className="cursor-pointer hover:text-blue-600 hover:underline">
                          <Link to={`/objetivos`} state={{ keyResultId: kr.id }}> {/* CORRIGIDO: Aponta para /objetivos */}
                            <div className="flex items-center justify-between">
                              <span>{kr.titulo}</span>
                              <span className="text-sm text-muted-foreground">{kr.valor_atual}%</span>
                            </div>
                            <Progress value={kr.valor_atual} className="h-2 mt-1" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {hasAttention && (
                  <div className="mb-3">
                    <h4 className="font-semibold text-orange-600 flex items-center gap-1 mb-2">
                      <AlertTriangle className="h-4 w-4" /> Atenção ({attentionKRs.length})
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      {attentionKRs.map(kr => (
                        <li key={kr.id} className="cursor-pointer hover:text-blue-600 hover:underline">
                          <Link to={`/objetivos`} state={{ keyResultId: kr.id }}> {/* CORRIGIDO: Aponta para /objetivos */}
                            <div className="flex items-center justify-between">
                              <span>{kr.titulo}</span>
                              <span className="text-sm text-muted-foreground">{kr.valor_atual}%</span>
                            </div>
                            <Progress value={kr.valor_atual} className="h-2 mt-1" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {otherKRs.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-2">
                      <TrendingUp className="h-4 w-4" /> Outros KRs ({otherKRs.length})
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      {otherKRs.map(kr => (
                        <li key={kr.id} className="cursor-pointer hover:text-blue-600 hover:underline">
                          <Link to={`/objetivos`} state={{ keyResultId: kr.id }}> {/* CORRIGIDO: Aponta para /objetivos */}
                            <div className="flex items-center justify-between">
                              <span>{kr.titulo} (Status: {kr.status === 'completed' ? 'Concluído' : 'No Caminho'})</span>
                              <span className="text-sm text-muted-foreground">{kr.valor_atual}%</span>
                            </div>
                            <Progress value={kr.valor_atual} className="h-2 mt-1" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!hasOverdue && !hasAttention && otherKRs.length === 0 && (
                  <p className="text-gray-600">Nenhum Key Result para este período.</p>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default KeyResultsByPeriodList;