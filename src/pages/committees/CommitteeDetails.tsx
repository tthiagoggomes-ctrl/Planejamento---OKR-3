"use client";

import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, GitCommit, Users, CalendarDays, MessageSquare, ListTodo, PlusCircle, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { getComiteById, getComiteMembers, Comite, ComiteMember } from "@/integrations/supabase/api/comites";
import { getReunioesByComiteId, Reuniao, createReuniao, updateReuniao, deleteReuniao } from "@/integrations/supabase/api/reunioes";
import { getAtasReuniaoByReuniaoId, AtaReuniao, createAtaReuniao, updateAtaReuniao, deleteAtaReuniao } from "@/integrations/supabase/api/atas_reuniao";
import { getAtividadesComiteByAtaId, AtividadeComite } from "@/integrations/supabase/api/atividades_comite";
import { getEnquetesByComiteId, Enquete } from "@/integrations/supabase/api/enquetes";
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/components/auth/SessionContextProvider"; // Import useSession
import { showError, showSuccess } from "@/utils/toast"; // Import toast functions
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
import { AtaReuniaoForm, AtaReuniaoFormValues } from "@/components/forms/AtaReuniaoForm"; // Import AtaReuniaoForm

const CommitteeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { can, isLoading: permissionsLoading } = useUserPermissions();
  const { user } = useSession(); // Get current user for created_by

  const canViewComiteDetails = can('comites', 'view');
  const canManageComiteMembers = can('comite_membros', 'manage');
  const canViewReunioes = can('reunioes', 'view');
  const canInsertReunioes = can('reunioes', 'insert');
  const canEditReunioes = can('reunioes', 'edit');
  const canDeleteReunioes = can('reunioes', 'delete');
  const canViewAtasReuniao = can('atas_reuniao', 'view');
  const canInsertAtasReuniao = can('atas_reuniao', 'insert');
  const canEditAtasReuniao = can('atas_reuniao', 'edit');
  const canDeleteAtasReuniao = can('atas_reuniao', 'delete');
  const canViewAtividadesComite = can('atividades_comite', 'view');
  const canViewEnquetes = can('enquetes', 'view');
  const canViewVotosEnquete = can('votos_enquete', 'view');

  const [expandedMeetings, setExpandedMeetings] = React.useState<Set<string>>(new Set());
  const [expandedMinutes, setExpandedMinutes] = React.useState<Set<string>>(new Set());

  // State for AtaReuniao Form
  const [isAtaFormOpen, setIsAtaFormOpen] = React.useState(false);
  const [editingAta, setEditingAta] = React.useState<AtaReuniao | null>(null);
  const [selectedMeetingForAta, setSelectedMeetingForAta] = React.useState<Reuniao | null>(null);
  const [isAtaDeleteDialogOpen, setIsAtaDeleteDialogOpen] = React.useState(false);
  const [ataToDelete, setAtaToDelete] = React.useState<string | null>(null);

  const { data: comite, isLoading: isLoadingComite, error: errorComite } = useQuery<Comite | null, Error>({
    queryKey: ["comite", id],
    queryFn: () => getComiteById(id!),
    enabled: !!id && canViewComiteDetails && !permissionsLoading,
  });

  const { data: members, isLoading: isLoadingMembers, error: errorMembers } = useQuery<ComiteMember[] | null, Error>({
    queryKey: ["comiteMembers", id],
    queryFn: () => getComiteMembers(id!),
    enabled: !!id && canViewComiteDetails && !permissionsLoading, // Members are part of committee details view
  });

  const { data: meetings, isLoading: isLoadingMeetings, error: errorMeetings } = useQuery<Reuniao[] | null, Error>({
    queryKey: ["reunioes", id],
    queryFn: () => getReunioesByComiteId(id!),
    enabled: !!id && canViewReunioes && !permissionsLoading,
  });

  const { data: minutesMap, isLoading: isLoadingMinutes } = useQuery<Map<string, AtaReuniao[]>, Error>({
    queryKey: ["atasReuniaoByMeeting", meetings],
    queryFn: async ({ queryKey }) => {
      const currentMeetings = queryKey[1] as Reuniao[] | null;
      if (!currentMeetings) return new Map();
      const minutesPromises = currentMeetings.map(async (reuniao) => {
        const minutes = await getAtasReuniaoByReuniaoId(reuniao.id);
        return [reuniao.id, minutes || []] as [string, AtaReuniao[]];
      });
      const results = await Promise.all(minutesPromises);
      return new Map(results);
    },
    enabled: !!meetings && canViewAtasReuniao && !permissionsLoading,
  });

  const { data: activitiesMap, isLoading: isLoadingActivities } = useQuery<Map<string, AtividadeComite[]>, Error>({
    queryKey: ["atividadesComiteByMinutes", minutesMap],
    queryFn: async ({ queryKey }) => {
      const currentMinutesMap = queryKey[1] as Map<string, AtaReuniao[]> | undefined;
      if (!currentMinutesMap) return new Map();
      const allMinutes = Array.from(currentMinutesMap.values()).flat();
      const activitiesPromises = allMinutes.map(async (ata) => {
        const activities = await getAtividadesComiteByAtaId(ata.id);
        return [ata.id, activities || []] as [string, AtividadeComite[]];
      });
      const results = await Promise.all(activitiesPromises);
      return new Map(results);
    },
    enabled: !!minutesMap && canViewAtividadesComite && !permissionsLoading,
  });

  const { data: polls, isLoading: isLoadingPolls, error: errorPolls } = useQuery<Enquete[] | null, Error>({
    queryKey: ["enquetes", id],
    queryFn: () => getEnquetesByComiteId(id!),
    enabled: !!id && canViewEnquetes && !permissionsLoading,
  });

  // Mutations for AtaReuniao
  const createAtaReuniaoMutation = useMutation({
    mutationFn: (values: AtaReuniaoFormValues) => {
      if (!user?.id || !selectedMeetingForAta?.id) {
        throw new Error("User not authenticated or meeting not selected.");
      }
      if (!canInsertAtasReuniao) {
        throw new Error("Você não tem permissão para criar atas de reunião.");
      }
      return createAtaReuniao(selectedMeetingForAta.id, values.conteudo, values.decisoes_tomadas, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atasReuniaoByMeeting"] });
      setIsAtaFormOpen(false);
      setSelectedMeetingForAta(null);
      showSuccess("Ata de reunião criada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar ata de reunião: ${err.message}`);
    },
  });

  const updateAtaReuniaoMutation = useMutation({
    mutationFn: ({ id: ataId, ...values }: AtaReuniaoFormValues & { id: string }) => {
      if (!canEditAtasReuniao) {
        throw new Error("Você não tem permissão para editar atas de reunião.");
      }
      return updateAtaReuniao(ataId, values.conteudo, values.decisoes_tomadas);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atasReuniaoByMeeting"] });
      setIsAtaFormOpen(false);
      setEditingAta(null);
      showSuccess("Ata de reunião atualizada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar ata de reunião: ${err.message}`);
    },
  });

  const deleteAtaReuniaoMutation = useMutation({
    mutationFn: (ataId: string) => {
      if (!canDeleteAtasReuniao) {
        throw new Error("Você não tem permissão para excluir atas de reunião.");
      }
      return deleteAtaReuniao(ataId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atasReuniaoByMeeting"] });
      setIsAtaDeleteDialogOpen(false);
      setAtaToDelete(null);
      showSuccess("Ata de reunião excluída com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir ata de reunião: ${err.message}`);
    },
  });

  const handleCreateOrUpdateAta = (values: AtaReuniaoFormValues) => {
    if (editingAta) {
      updateAtaReuniaoMutation.mutate({ id: editingAta.id, ...values });
    } else {
      createAtaReuniaoMutation.mutate(values);
    }
  };

  const handleAddAtaClick = (meeting: Reuniao) => {
    setEditingAta(null);
    setSelectedMeetingForAta(meeting);
    setIsAtaFormOpen(true);
  };

  const handleEditAtaClick = (ata: AtaReuniao) => {
    setEditingAta(ata);
    setIsAtaFormOpen(true);
  };

  const handleDeleteAtaClick = (ataId: string) => {
    setAtaToDelete(ataId);
    setIsAtaDeleteDialogOpen(true);
  };

  const confirmDeleteAta = () => {
    if (ataToDelete) {
      deleteAtaReuniaoMutation.mutate(ataToDelete);
    }
  };

  const toggleMeetingExpansion = (meetingId: string) => {
    setExpandedMeetings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(meetingId)) {
        newSet.delete(meetingId);
      } else {
        newSet.add(meetingId);
      }
      return newSet;
    });
  };

  const toggleMinutesExpansion = (minutesId: string) => {
    setExpandedMinutes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(minutesId)) {
        newSet.delete(minutesId);
      } else {
        newSet.add(minutesId);
      }
      return newSet;
    });
  };

  if (isLoadingComite || permissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewComiteDetails) {
    return (
      <div className="container mx-auto py-6 text-center text-red-500">
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  if (errorComite || !comite) {
    return (
      <div className="text-center text-red-500">
        Erro ao carregar comitê ou comitê não encontrado.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <GitCommit className="mr-3 h-8 w-8" /> {comite.nome}
          </CardTitle>
          <p className="text-muted-foreground">{comite.descricao}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Status: <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
              comite.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {comite.status === 'active' ? 'Ativo' : 'Arquivado'}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end gap-2">
            {/* Add buttons for editing committee details, managing members, etc. */}
            {/* These will be added in future steps with proper permission checks */}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Membros do Comitê */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold flex items-center">
              <Users className="mr-2 h-5 w-5" /> Membros ({members?.length || 0})
            </CardTitle>
            {canManageComiteMembers && (
              <Button size="sm" variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" /> Gerenciar Membros
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingMembers ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : errorMembers ? (
              <p className="text-red-500">Erro ao carregar membros.</p>
            ) : members && members.length > 0 ? (
              <ul className="space-y-2">
                {members.map(member => (
                  <li key={member.user_id} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <p className="font-medium">{member.user_name}</p>
                      <p className="text-sm text-muted-foreground">{member.user_email}</p>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">{member.role}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">Nenhum membro cadastrado.</p>
            )}
          </CardContent>
        </Card>

        {/* Reuniões e Atas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold flex items-center">
              <CalendarDays className="mr-2 h-5 w-5" /> Reuniões ({meetings?.length || 0})
            </CardTitle>
            {canInsertReunioes && (
              <Button size="sm" variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" /> Agendar Reunião
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingMeetings ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : errorMeetings ? (
              <p className="text-red-500">Erro ao carregar reuniões.</p>
            ) : meetings && meetings.length > 0 ? (
              <div className="space-y-4">
                {meetings.map(meeting => (
                  <div key={meeting.id} className="border rounded-md p-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">{meeting.titulo}</h3>
                      <Button variant="ghost" size="icon" onClick={() => toggleMeetingExpansion(meeting.id)}>
                        {expandedMeetings.has(meeting.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(meeting.data_reuniao), "PPP 'às' HH:mm", { locale: ptBR })} - {meeting.local || 'Local não informado'}
                    </p>
                    {expandedMeetings.has(meeting.id) && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium flex items-center">
                            <MessageSquare className="mr-2 h-4 w-4" /> Atas de Reunião ({minutesMap?.get(meeting.id)?.length || 0})
                          </h4>
                          {canInsertAtasReuniao && (
                            <Button size="sm" variant="outline" onClick={() => handleAddAtaClick(meeting)}>
                              <PlusCircle className="mr-2 h-4 w-4" /> Nova Ata
                            </Button>
                          )}
                        </div>
                        {isLoadingMinutes ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : minutesMap?.get(meeting.id)?.length > 0 ? (
                          <ul className="space-y-2 pl-4">
                            {minutesMap.get(meeting.id)?.map(minutes => (
                              <li key={minutes.id} className="border rounded-md p-2">
                                <div className="flex justify-between items-center">
                                  <p className="font-medium">Ata de {format(new Date(minutes.created_at!), "PPP", { locale: ptBR })}</p>
                                  <div className="flex items-center gap-2">
                                    {canEditAtasReuniao && (
                                      <Button variant="ghost" size="icon" onClick={() => handleEditAtaClick(minutes)}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {canDeleteAtasReuniao && (
                                      <Button variant="ghost" size="icon" onClick={() => handleDeleteAtaClick(minutes.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="icon" onClick={() => toggleMinutesExpansion(minutes.id)}>
                                      {expandedMinutes.has(minutes.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                </div>
                                {expandedMinutes.has(minutes.id) && (
                                  <div className="mt-2 text-sm text-muted-foreground">
                                    <p>Conteúdo: {minutes.conteudo}</p>
                                    <p>Decisões: {minutes.decisoes_tomadas || 'N/A'}</p>
                                    <p>Criado por: {minutes.created_by_name}</p>

                                    <Separator className="my-3" />

                                    <div className="flex justify-between items-center mb-2">
                                      <h5 className="font-medium flex items-center">
                                        <ListTodo className="mr-2 h-4 w-4" /> Atividades ({activitiesMap?.get(minutes.id)?.length || 0})
                                      </h5>
                                      {can('atividades_comite', 'insert') && (
                                        <Button size="sm" variant="outline">
                                          <PlusCircle className="mr-2 h-4 w-4" /> Nova Atividade
                                        </Button>
                                      )}
                                    </div>
                                    {isLoadingActivities ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    ) : activitiesMap?.get(minutes.id)?.length > 0 ? (
                                      <ul className="space-y-1 pl-4">
                                        {activitiesMap.get(minutes.id)?.map(activity => (
                                          <li key={activity.id} className="p-1 border-l-2 border-blue-500">
                                            <p className="font-normal">{activity.titulo}</p>
                                            <p className="text-xs text-muted-foreground">
                                              Responsável: {activity.assignee_name || 'N/A'} | Status: {activity.status}
                                              {activity.due_date && ` | Vencimento: ${format(new Date(activity.due_date), "PPP", { locale: ptBR })}`}
                                            </p>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-gray-500 text-center py-2">Nenhuma atividade gerada.</p>
                                    )}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-600 text-center py-2">Nenhuma ata de reunião para esta reunião.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">Nenhuma reunião agendada.</p>
            )}
          </CardContent>
        </Card>

        {/* Enquetes */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" /> Enquetes ({polls?.length || 0})
            </CardTitle>
            {can('enquetes', 'insert') && (
              <Button size="sm" variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" /> Criar Enquete
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingPolls ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : errorPolls ? (
              <p className="text-red-500">Erro ao carregar enquetes.</p>
            ) : polls && polls.length > 0 ? (
              <div className="space-y-4">
                {polls.map(poll => (
                  <div key={poll.id} className="border rounded-md p-3">
                    <h3 className="font-semibold text-lg">{poll.titulo}</h3>
                    <p className="text-sm text-muted-foreground">{poll.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      Período: {format(new Date(poll.start_date), "PPP", { locale: ptBR })} - {format(new Date(poll.end_date), "PPP", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">Criado por: {poll.created_by_name}</p>

                    {canViewVotosEnquete && poll.opcoes && poll.opcoes.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <h4 className="font-medium mb-2">Resultados da Votação ({poll.total_votes} votos)</h4>
                        <div className="space-y-2">
                          {poll.opcoes.map(option => (
                            <div key={option.id}>
                              <div className="flex justify-between text-sm">
                                <span>{option.texto_opcao}</span>
                                <span>{option.vote_count} votos ({(poll.total_votes || 0) > 0 ? ((option.vote_count || 0) / poll.total_votes! * 100).toFixed(1) : 0}%)</span>
                              </div>
                              <Progress value={(poll.total_votes || 0) > 0 ? ((option.vote_count || 0) / poll.total_votes! * 100) : 0} className="h-2" />
                            </div>
                          ))}
                        </div>
                        {can('votos_enquete', 'vote') && (
                          <Button size="sm" className="mt-3">Votar</Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">Nenhuma enquete ativa para este comitê.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AtaReuniao Form */}
      {(canInsertAtasReuniao || canEditAtasReuniao) && (
        <AtaReuniaoForm
          open={isAtaFormOpen}
          onOpenChange={setIsAtaFormOpen}
          onSubmit={handleCreateOrUpdateAta}
          initialData={editingAta}
          isLoading={createAtaReuniaoMutation.isPending || updateAtaReuniaoMutation.isPending}
        />
      )}

      {/* AtaReuniao Delete Confirmation */}
      {canDeleteAtasReuniao && (
        <AlertDialog open={isAtaDeleteDialogOpen} onOpenChange={setIsAtaDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente a ata de reunião selecionada e todas as atividades do comitê associadas a ela.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteAta} disabled={deleteAtaReuniaoMutation.isPending}>
                {deleteAtaReuniaoMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {deleteAtaReuniaoMutation.isPending ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default CommitteeDetails;