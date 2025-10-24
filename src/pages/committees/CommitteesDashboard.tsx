"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, GitCommit, LayoutDashboard, CalendarDays, MessageSquare, ListTodo } from "lucide-react";
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useQuery } from '@tanstack/react-query';
import { getComites, Comite } from '@/integrations/supabase/api/comites';
import { getReunioes, Reuniao } from '@/integrations/supabase/api/reunioes';
import { getEnquetes, Enquete } from '@/integrations/supabase/api/enquetes';
import { getAtividadesComite, AtividadeComite } from '@/integrations/supabase/api/atividades_comite';
import { showError } from '@/utils/toast';
import { parseISO, isWithinInterval, addDays, format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSession } from '@/components/auth/SessionContextProvider';

const CommitteesDashboard = () => {
  const { can, isLoading: permissionsLoading } = useUserPermissions();
  const { user } = useSession();

  const canViewCommitteesDashboard = can('dashboard', 'committees_view');
  const canViewComites = can('comites', 'view');
  const canViewReunioes = can('reunioes', 'view');
  const canViewEnquetes = can('enquetes', 'view');
  const canViewAtividadesComite = can('atividades_comite', 'view');

  const now = React.useRef(new Date()).current;

  // Fetch all committees
  const { data: comites, isLoading: isLoadingComites, error: errorComites } = useQuery<Comite[] | null, Error>({
    queryKey: ["comites"],
    queryFn: getComites,
    enabled: canViewComites && !permissionsLoading,
  });

  // Fetch all meetings
  const { data: allMeetings, isLoading: isLoadingMeetings, error: errorMeetings } = useQuery<Reuniao[] | null, Error>({
    queryKey: ["allMeetings"],
    queryFn: () => getReunioes(),
    enabled: canViewReunioes && !permissionsLoading,
  });

  // Fetch all polls
  const { data: allPolls, isLoading: isLoadingPolls, error: errorPolls } = useQuery<Enquete[] | null, Error>({
    queryKey: ["allPolls"],
    queryFn: () => getEnquetes({ currentUserId: user?.id }),
    enabled: canViewEnquetes && !permissionsLoading,
  });

  // Fetch all committee activities
  const { data: allCommitteeActivities, isLoading: isLoadingActivities, error: errorActivities } = useQuery<AtividadeComite[] | null, Error>({
    queryKey: ["allCommitteeActivities"],
    queryFn: () => getAtividadesComite({ comite_id: 'all' }),
    enabled: canViewAtividadesComite && !permissionsLoading,
  });

  // Process data for cards
  const committeeStats = React.useMemo(() => {
    const total = comites?.length || 0;
    const active = comites?.filter(c => c.status === 'active').length || 0;
    const archived = total - active;
    return { total, active, archived };
  }, [comites]);

  const upcomingMeetings = React.useMemo(() => {
    if (!allMeetings) return [];
    const startOfToday = startOfDay(now);
    const endOfNextSevenDays = endOfDay(addDays(startOfToday, 6)); // Inclui hoje + 6 dias = 7 dias no total

    return allMeetings
      .filter(m => {
        const meetingDate = parseISO(m.data_reuniao);
        return isWithinInterval(meetingDate, { start: startOfToday, end: endOfNextSevenDays });
      })
      .sort((a, b) => parseISO(a.data_reuniao).getTime() - parseISO(b.data_reuniao).getTime())
      .slice(0, 5); // Show up to 5 upcoming meetings
  }, [allMeetings, now]);

  const activePolls = React.useMemo(() => {
    if (!allPolls) return [];
    return allPolls
      .filter(p => isWithinInterval(now, { start: parseISO(p.start_date), end: parseISO(p.end_date) }))
      .slice(0, 5); // Show up to 5 active polls
  }, [allPolls, now]);

  // Pending Committee Activities
  const pendingCommitteeActivities = React.useMemo(() => {
    if (!allCommitteeActivities) return [];
    return allCommitteeActivities
      .filter(a => a.status === 'todo' || a.status === 'in_progress')
      .sort((a, b) => {
        const dateA = a.due_date ? parseISO(a.due_date) : new Date(8640000000000000); // Max date for null
        const dateB = b.due_date ? parseISO(b.due_date) : new Date(8640000000000000);
        return dateA.getTime() - dateB.getTime(); // Sort by due date ascending
      })
      .slice(0, 5); // Show up to 5 pending activities
  }, [allCommitteeActivities]);


  const isLoadingOverall = permissionsLoading || isLoadingComites || isLoadingMeetings || isLoadingPolls || isLoadingActivities;
  const errorOverall = errorComites || errorMeetings || errorPolls || errorActivities;

  if (isLoadingOverall) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewCommitteesDashboard) {
    return (
      <div className="container mx-auto py-6 text-center text-red-500">
        Você não tem permissão para visualizar o Dashboard de Comitês.
      </div>
    );
  }

  if (errorOverall) {
    showError("Erro ao carregar dados do dashboard de comitês.");
    return (
      <div className="text-center text-red-500">
        Erro ao carregar dados.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <LayoutDashboard className="mr-2 h-6 w-6 text-fade-red" /> Dashboard de Comitês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Bem-vindo ao dashboard do módulo de Comitês. Aqui você pode ver um resumo das informações mais importantes dos seus comitês.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Comitês Ativos Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comitês</CardTitle>
            <GitCommit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{committeeStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {committeeStats.active} Ativos, {committeeStats.archived} Arquivados
            </p>
          </CardContent>
        </Card>

        {/* Próximas Reuniões Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas Reuniões</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingMeetings.length}</div>
            {upcomingMeetings.length > 0 ? (
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                {upcomingMeetings.map(meeting => (
                  <li key={meeting.id} className="truncate">
                    {format(parseISO(meeting.data_reuniao), 'dd/MM HH:mm', { locale: ptBR })} - {meeting.titulo} ({meeting.comite_name})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">Nenhuma reunião futura.</p>
            )}
          </CardContent>
        </Card>

        {/* Enquetes Ativas Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enquetes Ativas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePolls.length}</div>
            {activePolls.length > 0 ? (
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                {activePolls.map(poll => (
                  <li key={poll.id} className="truncate">
                    {poll.titulo} ({poll.comite_name})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">Nenhuma enquete ativa.</p>
            )}
          </CardContent>
        </Card>

        {/* Atividades Pendentes do Comitê Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividades Pendentes</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCommitteeActivities.length}</div>
            {pendingCommitteeActivities.length > 0 ? (
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                {pendingCommitteeActivities.map(activity => (
                  <li key={activity.id} className="truncate">
                    {activity.titulo} ({activity.comite_nome}) - {activity.assignee_name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">Nenhuma atividade pendente.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CommitteesDashboard;