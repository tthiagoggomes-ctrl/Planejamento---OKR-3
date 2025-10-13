"use client";

import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, GitCommit, Users, CalendarDays, MessageSquare, ListTodo, PlusCircle, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { getComiteById, getComiteMembers, Comite, ComiteMember, updateComite } from "@/integrations/supabase/api/comites"; // Importar updateComite
import { getReunioesByComiteId, Reuniao, createReuniao, updateReuniao, deleteReuniao } from "@/integrations/supabase/api/reunioes";
import { AtaReuniao, createAtaReuniao, updateAtaReuniao, deleteAtaReuniao, getAtasReuniaoByReuniaoId } from "@/integrations/supabase/api/atas_reuniao";
import { getAtividadesComiteByAtaId, AtividadeComite } from "@/integrations/supabase/api/atividades_comite";
import { getEnquetesByComiteId, Enquete, createEnquete, updateEnquete, deleteEnquete } from "@/integrations/supabase/api/enquetes";
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/components/auth/SessionContextProvider";
import { showError, showSuccess } from "@/utils/toast";
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
import { AtaReuniaoForm, AtaReuniaoFormValues } from "@/components/forms/AtaReuniaoForm";
import { ReuniaoForm, ReuniaoFormValues } from "@/components/forms/ReuniaoForm";
import { EnqueteForm, EnqueteFormValues, EnqueteSubmitValues } from "@/components/forms/EnqueteForm";
import { MeetingCalendar } from "@/components/committees/MeetingCalendar";
import { CommitteeForm, CommitteeFormValues } from "@/components/forms/CommitteeForm"; // Importar CommitteeForm

const CommitteeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { can, isLoading: permissionsLoading } = useUserPermissions();
  const { user } = useSession();

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
  const canInsertEnquetes = can('enquetes', 'insert');
  const canEditEnquetes = can('enquetes', 'edit');
  const canDeleteEnquetes = can('enquetes', 'delete');
  const canViewVotosEnquete = can('votos_enquete', 'view');
  const canVoteEnquete = can('votos_enquete', 'vote');

  const [expandedMeetings, setExpandedMeetings] = React.useState<Set<string>>(new Set());
  const [expandedMinutes, setExpandedMinutes] = React.useState<Set<string>>(new Set());

  // State for CommitteeForm (for managing members)
  const [isCommitteeFormOpen, setIsCommitteeFormOpen] = React.useState(false);

  // State for Reuniao Form
  const [isReuniaoFormOpen, setIsReuniaoFormOpen] = React.useState(false);
  const [editingReuniao, setEditingReuniao] = React.useState<Reuniao | null>(null);
  const [isReuniaoDeleteDialogOpen, setIsReuniaoDeleteDialogOpen] = React.useState(false);
  const [reuniaoToDelete, setReuniaoToDelete] = React.useState<string | null>(null);

  // State for Recurring Meeting Delete Confirmation
  const [isDeleteRecurringDialogOpen, setIsDeleteRecurringDialogOpen] = React.useState(false);
  const [recurringMeetingToDelete, setRecurringMeetingToDelete] = React.useState<Reuniao | null>(null);
  const [deleteRecurringOption, setDeleteRecurringOption] = React.useState<'single' | 'series'>('single');


  // State for AtaReuniao Form
  const [isAtaFormOpen, setIsAtaFormOpen] = React.useState(false);
  const [editingAta, setEditingAta] = React.useState<AtaReuniao | null>(null);
  const [selectedMeetingForAta, setSelectedMeetingForAta] = React.useState<Reuniao | null>(null);
  const [isAtaDeleteDialogOpen, setIsAtaDeleteDialogOpen] = React.useState(false);
  const [ataToDelete, setAtaToDelete] = React.useState<string | null>(null);

  // State for Enquete Form
  const [isEnqueteFormOpen, setIsEnqueteFormOpen] = React.useState(false);
  const [editingEnquete, setEditingEnquete] = React.useState<Enquete | null>(null);
  const [isEnqueteDeleteDialogOpen, setIsEnqueteDeleteDialogOpen] = React.useState(false);
  const [enqueteToDelete, setEnqueteToDelete] = React.useState<string | null>(null);

  const { data: comite, isLoading: isLoadingComite, error: errorComite } = useQuery<Comite | null, Error>({
    queryKey: ["comite", id],
    queryFn: () => getComiteById(id!),
    enabled: !!id && canViewComiteDetails && !permissionsLoading,
  });

  const { data: members, isLoading: isLoadingMembers, error: errorMembers } = useQuery<ComiteMember[] | null, Error>({
    queryKey: ["comiteMembers", id],
    queryFn: () => getComiteMembers(id!),
    enabled: !!id && canViewComiteDetails && !permissionsLoading,
  });

  // Log para depuração de membros
  // React.useEffect(() => {
  //   if (errorMembers) {
  //     console.error("Erro ao carregar membros do comitê (query):", errorMembers);
  //     showError(`Erro ao carregar membros do comitê: ${errorMembers.message}`);
  //   }
  //   if (members) {
  //     console.log("Membros carregados:", members);
  //   }
  // }, [members, errorMembers]);


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

  // Mutations for Committee (for members management)
  const updateComiteMutation = useMutation({
    mutationFn: ({ id: comiteId, ...values }: CommitteeFormValues & { id: string }) => {
      if (!canManageComiteMembers) {
        throw new Error("Você não tem permissão para gerenciar membros do comitê.");
      }
      return updateComite(
        comiteId,
        values.nome,
        values.descricao,
        values.status,
        (values.members || []).filter(m => m.user_id && m.role) as { user_id: string; role: 'membro' | 'presidente' | 'secretario' }[]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comite", id] }); // Invalidate committee details
      queryClient.invalidateQueries({ queryKey: ["comiteMembers", id] }); // Invalidate members list
      setIsCommitteeFormOpen(false);
      showSuccess("Membros do comitê atualizados com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar membros do comitê: ${err.message}`);
    },
  });

  const handleUpdateComiteMembers = (values: CommitteeFormValues) => {
    if (comite) {
      updateComiteMutation.mutate({ id: comite.id, ...values });
    }
  };

  // Mutations for Reuniao
  const createReuniaoMutation = useMutation({
    mutationFn: (values: ReuniaoFormValues) => {
      if (!user?.id || !id) {
        throw new Error("User not authenticated or committee ID not available.");
      }
      if (!canInsertReunioes) {
        throw new Error("Você não tem permissão para agendar reuniões.");
      }
      return createReuniao(
        id, // comite_id
        values.titulo,
        values.data_reuniao.toISOString(),
        values.local,
        user.id, // created_by
        values.recurrence_type,
        values.recurrence_end_date?.toISOString() || null
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reunioes"] });
      setIsReuniaoFormOpen(false);
      showSuccess("Reunião agendada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao agendar reunião: ${err.message}`);
    },
  });

  const updateReuniaoMutation = useMutation({
    mutationFn: ({ id: reuniaoId, ...values }: ReuniaoFormValues & { id: string }) => {
      if (!canEditReunioes) {
        throw new Error("Você não tem permissão para editar reuniões.");
      }
      // When updating, recurrence fields are not passed from the form, so use existing values
      const existingMeeting = meetings?.find(m => m.id === reuniaoId);
      return updateReuniao(
        reuniaoId,
        values.titulo,
        values.data_reuniao.toISOString(),
        values.local,
        existingMeeting?.recurrence_type || 'none', // Use existing recurrence type
        existingMeeting?.recurrence_end_date || null // Use existing recurrence end date
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reunioes"] });
      setIsReuniaoFormOpen(false);
      setEditingReuniao(null);
      showSuccess("Reunião atualizada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar reunião: ${err.message}`);
    },
  });

  const deleteReuniaoMutation = useMutation({
    mutationFn: ({ id: reuniaoId, option }: { id: string; option: 'single' | 'series' }) => {
      if (!canDeleteReunioes) {
        throw new Error("Você não tem permissão para excluir reuniões.");
      }
      return deleteReuniao(reuniaoId, option);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reunioes"] });
      setIsReuniaoDeleteDialogOpen(false);
      setIsDeleteRecurringDialogOpen(false);
      setReuniaoToDelete(null);
      setRecurringMeetingToDelete(null);
      showSuccess("Reunião(ões) excluída(s) com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir reunião: ${err.message}`);
    },
  });

  const handleCreateOrUpdateReuniao = (values: ReuniaoFormValues) => {
    if (editingReuniao) {
      updateReuniaoMutation.mutate({ id: editingReuniao.id, ...values });
    } else {
      createReuniaoMutation.mutate(values);
    }
  };

  const handleAddReuniaoClick = () => {
    setEditingReuniao(null);
    setIsReuniaoFormOpen(true);
  };

  const handleEditReuniaoClick = (reuniao: Reuniao) => {
    setEditingReuniao(reuniao);
    setIsReuniaoFormOpen(true);
  };

  const handleDeleteReuniaoClick = (reuniao: Reuniao) => {
    if (reuniao.recurrence_type !== 'none') {
      setRecurringMeetingToDelete(reuniao);
      setIsDeleteRecurringDialogOpen(true);
    } else {
      setReuniaoToDelete(reuniao.id);
      setIsReuniaoDeleteDialogOpen(true);
    }
  };

  const confirmDeleteReuniao = () => {
    if (reuniaoToDelete) {
      deleteReuniaoMutation.mutate({ id: reuniaoToDelete, option: 'single' });
    } else if (recurringMeetingToDelete) {
      deleteReuniaoMutation.mutate({ id: recurringMeetingToDelete.id, option: deleteRecurringOption });
    }
  };

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

  // Mutations for Enquetes
  const createEnqueteMutation = useMutation({
    mutationFn: (values: EnqueteSubmitValues) => {
      if (!user?.id || !id) {
        throw new Error("User not authenticated or committee ID not available.");
      }
      if (!canInsertEnquetes) {
        throw new Error("Você não tem permissão para criar enquetes.");
      }
      return createEnquete(
        id,
        values.titulo,
        values.descricao,
        values.start_date.toISOString(),
        values.end_date.toISOString(),
        user.id,
        values.opcoes_texto
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enquetes"] });
      setIsEnqueteFormOpen(false);
      showSuccess("Enquete criada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar enquete: ${err.message}`);
    },
  });

  const updateEnqueteMutation = useMutation({
    mutationFn: ({ id: enqueteId, ...values }: EnqueteSubmitValues & { id: string }) => {
      if (!canEditEnquetes) {
        throw new Error("Você não tem permissão para editar enquetes.");
      }
      return updateEnquete(
        enqueteId,
        values.titulo,
        values.descricao,
        values.start_date.toISOString(),
        values.end_date.toISOString(),
        values.opcoes_texto
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enquetes"] });
      setIsEnqueteFormOpen(false);
      setEditingEnquete(null);
      showSuccess("Enquete atualizada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar enquete: ${err.message}`);
    },
  });

  const deleteEnqueteMutation = useMutation({
    mutationFn: (enqueteId: string) => {
      if (!canDeleteEnquetes) {
        throw new Error("Você não tem permissão para excluir enquetes.");
      }
      return deleteEnquete(enqueteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enquetes"] });
      setIsEnqueteDeleteDialogOpen(false);
      setEnqueteToDelete(null);
      showSuccess("Enquete excluída com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir enquete: ${err.message}`);
    },
  });

  const handleCreateOrUpdateEnquete = (values: EnqueteSubmitValues) => {
    if (editingEnquete) {
      updateEnqueteMutation.mutate({ id: editingEnquete.id, ...values });
    } else {
      createEnqueteMutation.mutate(values);
    }
  };

  const handleAddEnqueteClick = () => {
    setEditingEnquete(null);
    setIsEnqueteFormOpen(true);
  };

  const handleEditEnqueteClick = (enquete: Enquete) => {
    setEditingEnquete(enquete);
    setIsEnqueteFormOpen(true);
  };

  const handleDeleteEnqueteClick = (enqueteId: string) => {
    setEnqueteToDelete(enqueteId);
    setIsEnqueteDeleteDialogOpen(true);
  };

  const confirmDeleteEnquete = () => {
    if (enqueteToDelete) {
      deleteEnqueteMutation.mutate(enqueteToDelete);
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
              <Button size="sm" variant="outline" onClick={() => setIsCommitteeFormOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Gerenciar Membros
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingMembers ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : errorMembers ? (
              <p className="text-red-500">Erro ao carregar membros: {errorMembers.message}</p>
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

        {/* Calendário de Reuniões */}
        {canViewReunioes && (
          <MeetingCalendar meetings={meetings} />
        )}

        {/* Reuniões e Atas */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold flex items-center">
              <CalendarDays className="mr-2 h-5 w-5" /> Reuniões ({meetings?.length || 0})
            </CardTitle>
            {canInsertReunioes && (
              <Button size="sm" variant="outline" onClick={handleAddReuniaoClick}>
                <PlusCircle className="mr-2 h-4 w-4" /> Agendar Reunião
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingMeetings ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : errorMeetings ? (
              <p className="text-red-500">Erro ao carregar reuniões: {errorMeetings.message}</p>
            ) : meetings && meetings.length > 0 ? (
              <div className="space-y-4">
                {meetings.map(meeting => (
                  <div key={meeting.id} className="border rounded-md p-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">{meeting.titulo}</h3>
                      <div className="flex items-center gap-2">
                        {canEditReunioes && (
                          <Button variant="ghost" size="icon" onClick={() => handleEditReuniaoClick(meeting)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteReunioes && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteReuniaoClick(meeting)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => toggleMeetingExpansion(meeting.id)}>
                          {expandedMeetings.has(meeting.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(meeting.data_reuniao), "PPP 'às' HH:mm", { locale: ptBR })} - {meeting.local || 'Local não informado'}
                      {meeting.recurrence_type !== 'none' && ` (Recorrência: ${meeting.recurrence_type === 'weekly' ? 'Semanal' : meeting.recurrence_type === 'bi_weekly' ? 'Quinzenal' : 'Mensal'} até ${format(new Date(meeting.recurrence_end_date!), 'PPP', { locale: ptBR })})`}
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
            {canInsertEnquetes && (
              <Button size="sm" variant="outline" onClick={handleAddEnqueteClick}>
                <PlusCircle className="mr-2 h-4 w-4" /> Criar Enquete
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingPolls ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : errorPolls ? (
              <p className="text-red-500">Erro ao carregar enquetes: {errorPolls.message}</p>
            ) : polls && polls.length > 0 ? (
              <div className="space-y-4">
                {polls.map(poll => (
                  <div key={poll.id} className="border rounded-md p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-lg">{poll.titulo}</h3>
                      <div className="flex items-center gap-2">
                        {canEditEnquetes && (
                          <Button variant="ghost" size="icon" onClick={() => handleEditEnqueteClick(poll)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteEnquetes && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteEnqueteClick(poll.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
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
                                <span>{(poll.total_votes || 0) > 0 ? ((option.vote_count || 0) / poll.total_votes! * 100).toFixed(1) : 0}%</span>
                              </div>
                              <Progress value={(poll.total_votes || 0) > 0 ? ((option.vote_count || 0) / poll.total_votes! * 100) : 0} className="h-2" />
                            </div>
                          ))}
                        </div>
                        {canVoteEnquete && (
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

      {/* Committee Form (for managing members) */}
      {canManageComiteMembers && comite && (
        <CommitteeForm
          open={isCommitteeFormOpen}
          onOpenChange={setIsCommitteeFormOpen}
          onSubmit={handleUpdateComiteMembers}
          initialData={comite}
          initialMembers={members}
          isLoading={updateComiteMutation.isPending}
        />
      )}

      {/* Reuniao Form */}
      {(canInsertReunioes || canEditReunioes) && (
        <ReuniaoForm
          open={isReuniaoFormOpen}
          onOpenChange={setIsReuniaoFormOpen}
          onSubmit={handleCreateOrUpdateReuniao}
          initialData={editingReuniao}
          isLoading={createReuniaoMutation.isPending || updateReuniaoMutation.isPending}
        />
      )}

      {/* Reuniao Delete Confirmation (for non-recurring meetings) */}
      {canDeleteReunioes && (
        <AlertDialog open={isReuniaoDeleteDialogOpen} onOpenChange={setIsReuniaoDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente a reunião selecionada e todas as atas e atividades do comitê associadas a ela.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteReuniao} disabled={deleteReuniaoMutation.isPending}>
                {deleteReuniaoMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {deleteReuniaoMutation.isPending ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* NEW: Recurring Reuniao Delete Confirmation */}
      {canDeleteReunioes && (
        <AlertDialog open={isDeleteRecurringDialogOpen} onOpenChange={setIsDeleteRecurringDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Reunião Recorrente</AlertDialogTitle>
              <AlertDialogDescription>
                Esta reunião faz parte de uma série recorrente. O que você gostaria de excluir?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2">
              <AlertDialogCancel onClick={() => {
                setIsDeleteRecurringDialogOpen(false);
                setRecurringMeetingToDelete(null);
              }}>Cancelar</AlertDialogCancel>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteRecurringOption('single');
                  confirmDeleteReuniao();
                }}
                disabled={deleteReuniaoMutation.isPending}
              >
                {deleteReuniaoMutation.isPending && deleteRecurringOption === 'single' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Apenas esta reunião
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setDeleteRecurringOption('series');
                  confirmDeleteReuniao();
                }}
                disabled={deleteReuniaoMutation.isPending}
              >
                {deleteReuniaoMutation.isPending && deleteRecurringOption === 'series' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Todas as reuniões da série
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

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

      {/* Enquete Form */}
      {(canInsertEnquetes || canEditEnquetes) && (
        <EnqueteForm
          open={isEnqueteFormOpen}
          onOpenChange={setIsEnqueteFormOpen}
          onSubmit={handleCreateOrUpdateEnquete}
          initialData={editingEnquete}
          isLoading={createEnqueteMutation.isPending || updateEnqueteMutation.isPending}
        />
      )}

      {/* Enquete Delete Confirmation */}
      {canDeleteEnquetes && (
        <AlertDialog open={isEnqueteDeleteDialogOpen} onOpenChange={setIsEnqueteDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente a enquete selecionada e todas as suas opções e votos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteEnquete} disabled={deleteEnqueteMutation.isPending}>
                {deleteEnqueteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {deleteEnqueteMutation.isPending ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default CommitteeDetails;