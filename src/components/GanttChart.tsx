"use client";

import React from 'react';
import { format, parseISO, startOfWeek, endOfWeek, eachWeekOfInterval, differenceInWeeks, min, max } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";

// Define a interface genérica para atividades que o GanttChart pode exibir
interface GenericActivityForGantt {
  id: string;
  titulo: string;
  status: 'todo' | 'in_progress' | 'done' | 'stopped';
  assignee_name?: string;
  created_at?: string;
  due_date?: string | null;
  key_result_title?: string; // Pode ser o título do KR ou da Reunião
  key_result_objetivo_id?: string; // Pode ser o ID do Objetivo ou do Comitê
}

interface GanttChartProps<T extends GenericActivityForGantt> {
  atividades: T[];
  groupByKr: boolean;
  onGroupByKrChange: (checked: boolean) => void;
  ganttSortBy: 'date' | 'krTitle';
  onGanttSortByChange: (value: 'date' | 'krTitle') => void;
  ganttSortOrder: 'asc' | 'desc';
  onGanttSortOrderChange: (order: 'asc' | 'desc') => void;
}

const GanttChart = <T extends GenericActivityForGantt>({
  atividades,
  groupByKr,
  onGroupByKrChange,
  ganttSortBy,
  onGanttSortByChange,
  ganttSortOrder,
  onGanttSortOrderChange,
}: GanttChartProps<T>) => {
  if (atividades.length === 0) {
    return (
      <p className="text-gray-600 text-center py-8">Nenhuma atividade para exibir no gráfico de Gantt.</p>
    );
  }

  const sortedActivities = React.useMemo(() => {
    const sortableActivities = [...atividades]; // Create a shallow copy to avoid mutating props

    sortableActivities.sort((a, b) => {
      let compareA: string | Date | null = null;
      let compareB: string | Date | null = null;

      if (ganttSortBy === 'date') {
        compareA = a.due_date ? parseISO(a.due_date) : (a.created_at ? parseISO(a.created_at) : null);
        compareB = b.due_date ? parseISO(b.due_date) : (b.created_at ? parseISO(b.created_at) : null);

        // Handle null dates: nulls go to end for asc, beginning for desc
        if (compareA === null && compareB !== null) return ganttSortOrder === 'asc' ? 1 : -1;
        if (compareA !== null && compareB === null) return ganttSortOrder === 'asc' ? -1 : 1;
        if (compareA === null && compareB === null) return 0;

        return ganttSortOrder === 'asc'
          ? (compareA as Date).getTime() - (compareB as Date).getTime()
          : (compareB as Date).getTime() - (compareA as Date).getTime();

      } else if (ganttSortBy === 'krTitle') {
        compareA = a.key_result_title || '';
        compareB = b.key_result_title || '';

        return ganttSortOrder === 'asc'
          ? compareA.localeCompare(compareB)
          : compareB.localeCompare(compareA);
      }
      return 0;
    });
    return sortableActivities;
  }, [atividades, ganttSortBy, ganttSortOrder]);


  // Determine overall date range
  const allDates = sortedActivities.flatMap(ativ => {
    const dates: Date[] = [];
    if (ativ.created_at) dates.push(parseISO(ativ.created_at));
    if (ativ.due_date) dates.push(parseISO(ativ.due_date));
    return dates;
  }).filter(Boolean);

  if (allDates.length === 0) {
    return (
      <p className="text-gray-600 text-center py-8">Atividades sem datas para exibir no gráfico de Gantt.</p>
    );
  }

  const now = new Date();
  const minDate = startOfWeek(min([min(allDates), now]), { locale: ptBR }); // Ensure current week is included
  const maxDate = endOfWeek(max([max(allDates), now]), { locale: ptBR }); // Ensure current week is included

  const weeks = eachWeekOfInterval({ start: minDate, end: maxDate }, { locale: ptBR });
  const totalWeeks = weeks.length;

  // Group activities if required
  const groupedActivities = groupByKr
    ? sortedActivities.reduce((acc, ativ) => {
        const krTitle = ativ.key_result_title || 'Sem Key Result';
        if (!acc[krTitle]) {
          acc[krTitle] = [];
        }
        acc[krTitle].push(ativ);
        return acc;
      }, {} as Record<string, T[]>)
    : { 'Todas as Atividades': sortedActivities }; // Single group if not grouping by KR

  const getStatusColor = (atividade: T) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to start of day for comparison

    const dueDate = atividade.due_date ? parseISO(atividade.due_date) : null;
    const normalizedDueDate = dueDate ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()) : null;

    switch (atividade.status) {
      case 'done': return 'bg-green-500'; // Concluída
      case 'stopped': return 'bg-red-500'; // Parada (vermelho específico para status 'stopped')
      case 'todo':
      case 'in_progress':
        if (normalizedDueDate && normalizedDueDate < today) {
          return 'bg-red-500'; // Atrasada (vermelho para atividades não concluídas com data de vencimento passada)
        } else {
          return 'bg-blue-500'; // Em andamento / A fazer (azul para atividades não concluídas e dentro do prazo)
        }
      default: return 'bg-gray-400'; // Default para outros status ou sem data
    }
  };

  const calculateProgress = (status: T['status']) => {
    switch (status) {
      case 'done': return 100;
      case 'in_progress': return 50; // Arbitrary progress for in_progress
      case 'todo':
      case 'stopped':
      default: return 0;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Gráfico de Gantt</CardTitle>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="group-by-kr">Agrupar por KR</Label>
            <Switch
              id="group-by-kr"
              checked={groupByKr}
              onCheckedChange={onGroupByKrChange}
            />
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center space-x-2">
            <Label>Ordenar por:</Label>
            <Select value={ganttSortBy} onValueChange={onGanttSortByChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Data</SelectItem>
                <SelectItem value="krTitle">Key Result</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onGanttSortOrderChange(ganttSortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {ganttSortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              <span className="sr-only">Alterar Ordem</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="grid gap-y-2 min-w-[800px]" style={{ gridTemplateColumns: `250px repeat(${totalWeeks}, minmax(50px, 1fr))` }}>
            {/* Header Row */}
            <div className="sticky left-0 z-10 bg-background border-b border-r p-2 font-semibold text-sm">Atividade / KR</div>
            {weeks.map((weekStart, index) => (
              <div key={index} className="border-b p-2 text-center text-xs font-semibold">
                {format(weekStart, 'dd/MM', { locale: ptBR })}
              </div>
            ))}

            {Object.entries(groupedActivities).map(([groupTitle, activitiesInGroup]) => (
              <React.Fragment key={groupTitle}>
                {groupByKr && (
                  <div className="sticky left-0 z-10 bg-muted border-b border-r p-2 font-semibold text-sm col-span-full">
                    {groupTitle}
                  </div>
                )}
                {activitiesInGroup.map((atividade) => {
                  const startDate = atividade.created_at ? parseISO(atividade.created_at) : null;
                  const endDate = atividade.due_date ? parseISO(atividade.due_date) : null;

                  if (!startDate && !endDate) return null; // Skip if no dates

                  const effectiveStartDate = startDate || endDate || now;
                  const effectiveEndDate = endDate || startDate || now;

                  const startOffsetWeeks = differenceInWeeks(startOfWeek(effectiveStartDate, { locale: ptBR }), minDate);
                  const durationWeeks = differenceInWeeks(endOfWeek(effectiveEndDate, { locale: ptBR }), startOfWeek(effectiveStartDate, { locale: ptBR })) + 1;

                  const progress = calculateProgress(atividade.status);

                  return (
                    <React.Fragment key={atividade.id}>
                      <div className="sticky left-0 z-10 bg-background border-r p-2 text-sm truncate">
                        {atividade.titulo}
                        <p className="text-xs text-muted-foreground">{atividade.assignee_name}</p>
                      </div>
                      <div
                        className="relative col-span-full h-8 flex items-center"
                        style={{
                          gridColumnStart: startOffsetWeeks + 2, // +1 for the first column, +1 for 1-based indexing
                          gridColumnEnd: startOffsetWeeks + durationWeeks + 2,
                        }}
                      >
                        <div
                          className={cn(
                            "absolute h-6 rounded-sm flex items-center justify-center text-white text-xs px-2",
                            getStatusColor(atividade) // Pass atividade object
                          )}
                          style={{ width: `${progress}%` }}
                        >
                          {progress > 0 && `${progress}%`}
                        </div>
                        <div
                          className={cn(
                            "absolute h-6 rounded-sm border border-gray-300 dark:border-gray-600",
                            getStatusColor(atividade) // Pass atividade object
                          )}
                          style={{ width: `100%`, opacity: 0.3 }} // Full bar for context, with some transparency
                        >
                          {/* Full bar for context */}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GanttChart;