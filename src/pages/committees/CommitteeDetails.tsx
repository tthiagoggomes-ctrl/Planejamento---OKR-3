"use client";

import React from "react";
import { useParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react"; // Importar ChevronDown e ChevronUp
import { getComiteById, getComiteMembers, Comite, ComiteMember } from "@/integrations/supabase/api/comites";
import { getReunioes, Reuniao } from "@/integrations/supabase/api/reunioes"; 
import { AtaReuniao, getAtasReuniaoByReuniaoId } from "@/integrations/supabase/api/atas_reuniao";
import { getEnquetes, Enquete, voteOnEnquete } from "@/integrations/supabase/api/enquetes";
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useSession } from "@/components/auth/SessionContextProvider";
import { showSuccess, showError } from "@/utils/toast";

// Importar os novos componentes modulares
import { CommitteeDetailsHeader } from "@/components/committees/CommitteeDetailsHeader";
import { CommitteeMembersSection } from "@/components/committees/CommitteeMembersSection";
import { CommitteeMeetingsSection } from "@/components/committees/CommitteeMeetingsSection";
import { CommitteePollsSection } from "@/components/committees/CommitteePollsSection";
import { CommitteeModalsAndAlerts } from "@/components/committees/CommitteeModalsAndAlerts";
import { CommitteeRulesDisplay } from "@/components/committees/CommitteeRulesDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible, // NOVO
  CollapsibleContent, // NOVO
  CollapsibleTrigger, // NOVO
} from "@/components/ui/collapsible"; // NOVO
import { Button } from "@/components/ui/button"; // Garantir que Button está importado
import {
  Table, // NOVO
  TableBody, // NOVO
  TableCell, // NOVO
  TableHead, // NOVO
  TableHeader, // NOVO
  TableRow, // NOVO
} from "@/components/ui/table"; // NOVO

// NOVO: Interface para os membros da composição recomendada (para parsing)
interface ComiteCompositionMember {
  representante: string;
  cargo_funcao: string;
  papel_no_comite: string;
}

const CommitteeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { can, isLoading: permissionsLoading } = useUserPermissions();
  const { user } = useSession();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Permissões
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

  // Estados para expansão de seções
  const [expandedMeetings, setExpandedMeetings] = React.useState<Set<string>>(new Set());
  const [expandedMinutes, setExpandedMinutes] = React.useState<Set<string>>(new Set());
  const [expandedPolls, setExpandedPolls] = React.useState<Set<string>>(new Set());
  const [isDetailsExpanded, setIsDetailsExpanded] = React.useState(false); // NOVO: Estado para detalhes

  // Estados para modais e dados de edição/exclusão
  const [isCommitteeFormOpen, setIsCommitteeFormOpen] = React.useState(false);
  const [editingComite, setEditingComite] = React.useState<Comite | null>(null);

  const [isReuniaoFormOpen, setIsReuniaoFormOpen] = React.useState(false);
  const [editingReuniao, setEditingReuniao] = React.useState<Reuniao | null>(null);
  const [isReuniaoDeleteDialogOpen, setIsReuniaoDeleteDialogOpen] = React.useState(false);
  const [reuniaoToDelete, setReuniaoToDelete] = React.useState<string | null>(null);
  const [isDeleteRecurringDialogOpen, setIsDeleteRecurringDialogOpen] = React.useState(false);
  const [recurringMeetingToDelete, setRecurringMeetingToDelete] = React.useState<Reuniao | null>(null);
  const [deleteRecurringOption, setDeleteRecurringOption] = React.useState<'single' | 'series'>('single');

  const [isAtaFormOpen, setIsAtaFormOpen] = React.useState(false);
  const [editingAta, setEditingAta] = React.useState<AtaReuniao | null>(null);
  const [selectedMeetingForAta, setSelectedMeetingForAta] = React.useState<Reuniao | null>(null);
  const [isAtaDeleteDialogOpen, setIsAtaDeleteDialogOpen] = React.useState(false);
  const [ataToDelete, setAtaToDelete] = React.useState<string | null>(null);

  const [isEnqueteFormOpen, setIsEnqueteFormOpen] = React.useState(false);
  const [editingEnquete, setEditingEnquete] = React.useState<Enquete | null>(null);
  const [isEnqueteDeleteDialogOpen, setIsEnqueteDeleteDialogOpen] = React.useState(false);
  const [enqueteToDelete, setEnqueteToDelete] = React.useState<string | null>(null);
  const [selectedVoteOptions, setSelectedVoteOptions] = React.useState<Record<string, string | null>>({}); 

  const [isRulesDisplayOpen, setIsRulesDisplayOpen] = React.useState(false);

  // Queries
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

  const { data: meetings, isLoading: isLoadingMeetings, error: errorMeetings } = useQuery<Reuniao[] | null, Error>({
    queryKey: ["reunioes", id],
    queryFn: () => getReunioes({ comite_id: id! }),
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

  const { data: polls, isLoading: isLoadingPolls, error: errorPolls } = useQuery<Enquete[] | null, Error>({
    queryKey: ["enquetes", id, user?.id],
    queryFn: ({ queryKey }) => getEnquetes({ comite_id: queryKey[1] as string, currentUserId: queryKey[2] as string | undefined }),
    enabled: !!id && canViewEnquetes && !permissionsLoading,
  });

  // Mutation for voting on polls
  const voteOnEnqueteMutation = useMutation({
    mutationFn: ({ enqueteId, opcaoId }: { enqueteId: string; opcaoId: string }) => {
      if (!user?.id) {
        throw new Error("User not authenticated.");
      }
      if (!canVoteEnquete) {
        throw new Error("Você não tem permissão para votar em enquetes.");
      }
      return voteOnEnquete(enqueteId, opcaoId, user.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["enquetes", id, user?.id] }); // Invalidate specific poll query
      showSuccess("Voto registrado com sucesso!");
      handleVoteEnqueteSuccess(variables.enqueteId, variables.opcaoId);
    },
    onError: (err) => {
      showError(`Erro ao registrar voto: ${err.message}`);
    },
  });

  // Effects para inicialização de estados
  React.useEffect(() => {
    if (comite) {
      setEditingComite(comite);
    }
  }, [comite]);

  React.useEffect(() => {
    if (polls) {
      const initialSelections: Record<string, string | null> = {};
      polls.forEach(poll => {
        initialSelections[poll.id] = poll.user_vote?.opcao_id || null;
      });
      setSelectedVoteOptions(initialSelections);
    }
  }, [polls]);

  React.useEffect(() => {
    if (location.state && (location.state as any).ataId && meetings && minutesMap) {
      const targetAtaId = (location.state as any).ataId;
      let foundMeetingId: string | null = null;

      for (const meeting of meetings) {
        const minutesForMeeting = minutesMap.get(meeting.id);
        if (minutesForMeeting?.some(ata => ata.id === targetAtaId)) {
          foundMeetingId = meeting.id;
          break;
        }
      }

      if (foundMeetingId) {
        setExpandedMeetings(prev => new Set(prev).add(foundMeetingId!));
        setExpandedMinutes(prev => new Set(prev).add(targetAtaId));
      }
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.state, meetings, minutesMap]);

  // Handlers para abrir modais e definir dados de edição/exclusão
  const handleManageMembersClick = () => setIsCommitteeFormOpen(true);

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

  const handleAddAtaClick = (meeting: Reuniao) => {
    setEditingAta(null);
    setSelectedMeetingForAta(meeting);
    setIsAtaFormOpen(true);
  };
  const handleEditAtaClick = (ata: AtaReuniao) => {
    setEditingAta(ata);
    setSelectedMeetingForAta(null);
    setIsAtaFormOpen(true);
  };
  const handleDeleteAtaClick = (ataId: string) => {
    setAtaToDelete(ataId);
    setIsAtaDeleteDialogOpen(true);
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

  const handleVoteEnqueteSuccess = (enqueteId: string, opcaoId: string) => {
    setSelectedVoteOptions(prev => ({ ...prev, [enqueteId]: opcaoId }));
  };

  const handleViewRulesClick = () => {
    setIsRulesDisplayOpen(true);
  };

  // NOVO: Função para parsear a string JSON da composição recomendada
  const parsedComposicaoRecomendada: ComiteCompositionMember[] = React.useMemo(() => {
    if (comite?.composicao_recomendada) {
      try {
        return JSON.parse(comite.composicao_recomendada) as ComiteCompositionMember[];
      } catch (e) {
        console.error("Erro ao parsear composicao_recomendada:", e);
        return [];
      }
    }
    return [];
  }, [comite?.composicao_recomendada]);

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
      <CommitteeDetailsHeader comite={comite} onViewRulesClick={handleViewRulesClick} />

      {/* NEW: Detailed Information Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Informações Detalhadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comite.objetivo && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Objetivo</p>
              <pre className="whitespace-pre-wrap font-sans text-base text-foreground">{comite.objetivo}</pre>
            </div>
          )}

          {/* Collapsible section for the rest of the details */}
          <Collapsible open={isDetailsExpanded} onOpenChange={setIsDetailsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="link" className="p-0 h-auto text-sm">
                {isDetailsExpanded ? (
                  <>
                    <ChevronUp className="mr-1 h-4 w-4" /> Ocultar Detalhes
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 h-4 w-4" /> Ver Mais Detalhes
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              {comite.justificativa && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Justificativa</p>
                  <pre className="whitespace-pre-wrap font-sans text-base text-foreground">{comite.justificativa}</pre>
                </div>
              )}
              {comite.atribuicoes_comite && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Atribuições do Comitê</p>
                  <pre className="whitespace-pre-wrap font-sans text-base text-foreground">{comite.atribuicoes_comite}</pre>
                </div>
              )}
              
              {/* NOVO: Exibição da Composição Recomendada como tabela */}
              {parsedComposicaoRecomendada.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Composição Recomendada</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Representante</TableHead>
                        <TableHead>Cargo / Função</TableHead>
                        <TableHead>Papel no Comitê</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedComposicaoRecomendada.map((member, index) => (
                        <TableRow key={index}>
                          <TableCell>{member.representante}</TableCell>
                          <TableCell>{member.cargo_funcao}</TableCell>
                          <TableCell>{member.papel_no_comite}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* NOVO: Exibição do campo adicional da composição */}
              {comite.composicao_recomendada_adicional && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Informações Adicionais sobre a Composição</p>
                  <pre className="whitespace-pre-wrap font-sans text-base text-foreground">{comite.composicao_recomendada_adicional}</pre>
                </div>
              )}

              {comite.periodicidade_reunioes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Periodicidade das Reuniões</p>
                  <pre className="whitespace-pre-wrap font-sans text-base text-foreground">{comite.periodicidade_reunioes}</pre>
                </div>
              )}
              {comite.fluxo_demandas && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fluxo de Demandas</p>
                  <pre className="whitespace-pre-wrap font-sans text-base text-foreground">{comite.fluxo_demandas}</pre>
                </div>
              )}
              {comite.criterios_priorizacao && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critérios de Priorização</p>
                  <pre className="whitespace-pre-wrap font-sans text-base text-foreground">{comite.criterios_priorizacao}</pre>
                </div>
              )}
              {comite.beneficios_esperados && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Benefícios Esperados</p>
                  <pre className="whitespace-pre-wrap font-sans text-base text-foreground">{comite.beneficios_esperados}</pre>
                </div>
              )}
              {(!comite.justificativa && !comite.atribuicoes_comite && parsedComposicaoRecomendada.length === 0 && !comite.composicao_recomendada_adicional &&
                !comite.periodicidade_reunioes && !comite.fluxo_demandas && !comite.criterios_priorizacao && !comite.beneficios_esperados) && (
                <p className="text-muted-foreground text-center py-4">Nenhuma informação detalhada adicional disponível para este comitê.</p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <CommitteeMembersSection
          members={members}
          isLoadingMembers={isLoadingMembers}
          errorMembers={errorMembers}
          canManageComiteMembers={canManageComiteMembers}
          onManageMembersClick={handleManageMembersClick}
        />

        <CommitteeMeetingsSection
          comiteId={id!}
          meetings={meetings}
          minutesMap={minutesMap || new Map()}
          isLoadingMeetings={isLoadingMeetings}
          errorMeetings={errorMeetings}
          isLoadingMinutes={isLoadingMinutes}
          canViewReunioes={canViewReunioes}
          canInsertReunioes={canInsertReunioes}
          canEditReunioes={canEditReunioes}
          canDeleteReunioes={canDeleteReunioes}
          canViewAtasReuniao={canViewAtasReuniao}
          canInsertAtasReuniao={canInsertAtasReuniao}
          canEditAtasReuniao={canEditAtasReuniao}
          canDeleteAtasReuniao={canDeleteAtasReuniao}
          canViewAtividadesComite={canViewAtividadesComite}
          onAddReuniaoClick={handleAddReuniaoClick}
          onEditReuniaoClick={handleEditReuniaoClick}
          onDeleteReuniaoClick={handleDeleteReuniaoClick}
          onAddAtaClick={handleAddAtaClick}
          onEditAtaClick={handleEditAtaClick}
          onDeleteAtaClick={handleDeleteAtaClick}
          expandedMeetings={expandedMeetings}
          toggleMeetingExpansion={(meetingId) => setExpandedMeetings(prev => {
            const newSet = new Set(prev);
            if (newSet.has(meetingId)) { newSet.delete(meetingId); } else { newSet.add(meetingId); }
            return newSet;
          })}
          expandedMinutes={expandedMinutes}
          toggleMinutesExpansion={(minutesId) => setExpandedMinutes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(minutesId)) { newSet.delete(minutesId); } else { newSet.add(minutesId); }
            return newSet;
          })}
        />

        <CommitteePollsSection
          polls={polls}
          isLoadingPolls={isLoadingPolls}
          errorPolls={errorPolls}
          canViewEnquetes={canViewEnquetes}
          canInsertEnquetes={canInsertEnquetes}
          canEditEnquetes={canEditEnquetes}
          canDeleteEnquetes={canDeleteEnquetes}
          canViewVotosEnquete={canViewVotosEnquete}
          canVoteEnquete={canVoteEnquete}
          onAddEnqueteClick={handleAddEnqueteClick}
          onEditEnqueteClick={handleEditEnqueteClick}
          onDeleteEnqueteClick={handleDeleteEnqueteClick}
          onVoteEnquete={(enqueteId, opcaoId) => voteOnEnqueteMutation.mutate({ enqueteId, opcaoId })}
          expandedPolls={expandedPolls}
          togglePollExpansion={(pollId) => setExpandedPolls(prev => {
            const newSet = new Set(prev);
            if (newSet.has(pollId)) { newSet.delete(pollId); } else { newSet.add(pollId); }
            return newSet;
          })}
          selectedVoteOptions={selectedVoteOptions}
          setSelectedVoteOptions={setSelectedVoteOptions}
          isVotingPending={voteOnEnqueteMutation.isPending}
        />
      </div>

      <CommitteeModalsAndAlerts
        comiteId={id!}
        userSessionId={user?.id}
        canManageComiteMembers={canManageComiteMembers}
        canInsertReunioes={canInsertReunioes}
        canEditReunioes={canEditReunioes}
        canDeleteReunioes={canDeleteReunioes}
        canInsertAtasReuniao={canInsertAtasReuniao}
        canEditAtasReuniao={canEditAtasReuniao}
        canDeleteAtasReuniao={canDeleteAtasReuniao}
        canInsertEnquetes={canInsertEnquetes}
        canEditEnquetes={canEditEnquetes}
        canDeleteEnquetes={canDeleteEnquetes}
        canVoteEnquete={canVoteEnquete}

        isCommitteeFormOpen={isCommitteeFormOpen}
        setIsCommitteeFormOpen={setIsCommitteeFormOpen}
        editingComite={editingComite}
        initialMembers={members}

        isReuniaoFormOpen={isReuniaoFormOpen}
        setIsReuniaoFormOpen={setIsReuniaoFormOpen}
        editingReuniao={editingReuniao}
        isReuniaoDeleteDialogOpen={isReuniaoDeleteDialogOpen}
        setIsReuniaoDeleteDialogOpen={setIsReuniaoDeleteDialogOpen}
        reuniaoToDelete={reuniaoToDelete}
        setReuniaoToDelete={setReuniaoToDelete}
        isDeleteRecurringDialogOpen={isDeleteRecurringDialogOpen}
        setIsDeleteRecurringDialogOpen={setIsDeleteRecurringDialogOpen}
        recurringMeetingToDelete={recurringMeetingToDelete}
        setRecurringMeetingToDelete={setRecurringMeetingToDelete}
        deleteRecurringOption={deleteRecurringOption}
        setDeleteRecurringOption={setDeleteRecurringOption}

        isAtaFormOpen={isAtaFormOpen}
        setIsAtaFormOpen={setIsAtaFormOpen}
        editingAta={editingAta}
        selectedMeetingForAta={selectedMeetingForAta}
        isAtaDeleteDialogOpen={isAtaDeleteDialogOpen}
        setIsAtaDeleteDialogOpen={setIsAtaDeleteDialogOpen}
        ataToDelete={ataToDelete}
        setAtaToDelete={setAtaToDelete}

        isEnqueteFormOpen={isEnqueteFormOpen}
        setIsEnqueteFormOpen={setIsEnqueteFormOpen}
        editingEnquete={editingEnquete}
        isEnqueteDeleteDialogOpen={isEnqueteDeleteDialogOpen}
        setIsEnqueteDeleteDialogOpen={setIsEnqueteDeleteDialogOpen}
        enqueteToDelete={enqueteToDelete}
        setEnqueteToDelete={setEnqueteToDelete}
        onVoteEnqueteSuccess={handleVoteEnqueteSuccess}
      />

      {/* NOVO: Modal para exibir as regras do comitê */}
      <CommitteeRulesDisplay
        open={isRulesDisplayOpen}
        onOpenChange={setIsRulesDisplayOpen}
        comiteName={comite.nome}
        rulesContent={comite.regras_comite}
      />
    </div>
  );
};

export default CommitteeDetails;