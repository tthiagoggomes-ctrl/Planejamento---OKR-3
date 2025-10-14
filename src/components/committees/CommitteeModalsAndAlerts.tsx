"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import { useSession } from "@/components/auth/SessionContextProvider";

// Forms
import { CommitteeForm, CommitteeFormValues } from "@/components/forms/CommitteeForm";
import { ReuniaoForm, ReuniaoFormValues } from "@/components/forms/ReuniaoForm";
import { AtaReuniaoForm, AtaReuniaoSubmitValues } from "@/components/forms/AtaReuniaoForm";
import { EnqueteForm, EnqueteSubmitValues } from "@/components/forms/EnqueteForm";

// API functions
import { Comite, ComiteMember, updateComite, deleteComite, createComite } from "@/integrations/supabase/api/comites"; // Import createComite
import { Reuniao, createReuniao, updateReuniao, deleteReuniao } from "@/integrations/supabase/api/reunioes";
import { AtaReuniao, createAtaReuniao, updateAtaReuniao, deleteAtaReuniao } from "@/integrations/supabase/api/atas_reuniao";
import { Enquete, createEnquete, updateEnquete, deleteEnquete, voteOnEnquete } from "@/integrations/supabase/api/enquetes";

interface CommitteeModalsAndAlertsProps {
  comiteId: string;
  userSessionId: string | undefined;
  canManageComiteMembers: boolean;
  canInsertReunioes: boolean;
  canEditReunioes: boolean;
  canDeleteReunioes: boolean;
  canInsertAtasReuniao: boolean;
  canEditAtasReuniao: boolean;
  canDeleteAtasReuniao: boolean;
  canInsertEnquetes: boolean;
  canEditEnquetes: boolean;
  canDeleteEnquetes: boolean;
  canVoteEnquete: boolean;

  // Committee Form
  isCommitteeFormOpen: boolean;
  setIsCommitteeFormOpen: (open: boolean) => void;
  editingComite: Comite | null;
  initialMembers: ComiteMember[] | null;

  // Meeting Form
  isReuniaoFormOpen: boolean;
  setIsReuniaoFormOpen: (open: boolean) => void;
  editingReuniao: Reuniao | null;
  isReuniaoDeleteDialogOpen: boolean;
  setIsReuniaoDeleteDialogOpen: (open: boolean) => void;
  reuniaoToDelete: string | null;
  setReuniaoToDelete: (id: string | null) => void;
  isDeleteRecurringDialogOpen: boolean;
  setIsDeleteRecurringDialogOpen: (open: boolean) => void;
  recurringMeetingToDelete: Reuniao | null;
  setRecurringMeetingToDelete: (reuniao: Reuniao | null) => void;
  deleteRecurringOption: 'single' | 'series';
  setDeleteRecurringOption: (option: 'single' | 'series') => void;

  // Meeting Minutes Form
  isAtaFormOpen: boolean;
  setIsAtaFormOpen: (open: boolean) => void;
  editingAta: AtaReuniao | null;
  selectedMeetingForAta: Reuniao | null;
  isAtaDeleteDialogOpen: boolean;
  setIsAtaDeleteDialogOpen: (open: boolean) => void;
  ataToDelete: string | null;
  setAtaToDelete: (id: string | null) => void;

  // Poll Form
  isEnqueteFormOpen: boolean;
  setIsEnqueteFormOpen: (open: boolean) => void;
  editingEnquete: Enquete | null;
  isEnqueteDeleteDialogOpen: boolean;
  setIsEnqueteDeleteDialogOpen: (open: boolean) => void;
  enqueteToDelete: string | null;
  setEnqueteToDelete: (id: string | null) => void;
  onVoteEnqueteSuccess: (enqueteId: string, opcaoId: string) => void;
}

export const CommitteeModalsAndAlerts: React.FC<CommitteeModalsAndAlertsProps> = ({
  comiteId,
  userSessionId,
  canManageComiteMembers,
  canInsertReunioes,
  canEditReunioes,
  canDeleteReunioes,
  canInsertAtasReuniao,
  canEditAtasReuniao,
  canDeleteAtasReuniao,
  canInsertEnquetes,
  canEditEnquetes,
  canDeleteEnquetes,
  canVoteEnquete,

  isCommitteeFormOpen,
  setIsCommitteeFormOpen,
  editingComite,
  initialMembers,

  isReuniaoFormOpen,
  setIsReuniaoFormOpen,
  editingReuniao,
  isReuniaoDeleteDialogOpen,
  setIsReuniaoDeleteDialogOpen,
  reuniaoToDelete,
  setReuniaoToDelete,
  isDeleteRecurringDialogOpen,
  setIsDeleteRecurringDialogOpen,
  recurringMeetingToDelete,
  setRecurringMeetingToDelete,
  deleteRecurringOption,
  setDeleteRecurringOption,

  isAtaFormOpen,
  setIsAtaFormOpen,
  editingAta,
  selectedMeetingForAta,
  isAtaDeleteDialogOpen,
  setIsAtaDeleteDialogOpen,
  ataToDelete,
  setAtaToDelete,

  isEnqueteFormOpen,
  setIsEnqueteFormOpen,
  editingEnquete,
  isEnqueteDeleteDialogOpen,
  setIsEnqueteDeleteDialogOpen,
  enqueteToDelete,
  setEnqueteToDelete,
  onVoteEnqueteSuccess,
}) => {
  const queryClient = useQueryClient();

  // --- Committee Mutations ---
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
        (values.members || []).filter(m => m.user_id && m.role) as { user_id: string; role: 'membro' | 'presidente' | 'secretario' }[],
        values.documentFile, // Pass the new document file
        values.document_url // Pass the existing document URL for replacement logic
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comite", comiteId] });
      queryClient.invalidateQueries({ queryKey: ["comiteMembers", comiteId] });
      setIsCommitteeFormOpen(false);
      showSuccess("Membros do comitê atualizados com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar membros do comitê: ${err.message}`);
    },
  });

  const handleUpdateComiteMembers = (values: CommitteeFormValues) => {
    if (editingComite) {
      updateComiteMutation.mutate({ id: editingComite.id, ...values });
    }
  };

  // --- Meeting Mutations ---
  const createReuniaoMutation = useMutation({
    mutationFn: (values: ReuniaoFormValues) => {
      if (!userSessionId || !comiteId) {
        throw new Error("User not authenticated or committee ID not available.");
      }
      if (!canInsertReunioes) {
        throw new Error("Você não tem permissão para agendar reuniões.");
      }
      return createReuniao(
        comiteId,
        values.titulo,
        values.data_reuniao.toISOString(),
        values.local,
        userSessionId,
        values.recurrence_type,
        values.recurrence_end_date?.toISOString() || null
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reunioes", comiteId] });
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
      // We need to fetch the existing recurrence type and end date as they are not in the form for editing
      // This is a simplification, ideally the form would handle this or the API would ignore if not provided
      const existingMeeting = queryClient.getQueryData<Reuniao[]>(["reunioes", comiteId])?.find(m => m.id === reuniaoId);
      return updateReuniao(
        reuniaoId,
        values.titulo,
        values.data_reuniao.toISOString(),
        values.local,
        existingMeeting?.recurrence_type || 'none',
        existingMeeting?.recurrence_end_date || null
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reunioes", comiteId] });
      setIsReuniaoFormOpen(false);
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
      queryClient.invalidateQueries({ queryKey: ["reunioes", comiteId] });
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

  const confirmDeleteReuniao = () => {
    if (reuniaoToDelete) {
      deleteReuniaoMutation.mutate({ id: reuniaoToDelete, option: 'single' });
    } else if (recurringMeetingToDelete) {
      deleteReuniaoMutation.mutate({ id: recurringMeetingToDelete.id, option: deleteRecurringOption });
    }
  };

  // --- Meeting Minutes Mutations ---
  const createAtaReuniaoMutation = useMutation({
    mutationFn: (values: AtaReuniaoSubmitValues) => {
      if (!userSessionId || !selectedMeetingForAta?.id) {
        throw new Error("User not authenticated or meeting not selected.");
      }
      if (!canInsertAtasReuniao) {
        throw new Error("Você não tem permissão para criar atas de reunião.");
      }
      return createAtaReuniao(
        selectedMeetingForAta.id,
        values.conteudo,
        values.decisoes_tomadas,
        userSessionId,
        values.data_reuniao,
        values.horario_inicio,
        values.horario_fim,
        values.local_reuniao,
        values.participantes,
        values.objetivos_reuniao,
        values.pauta_tratada,
        values.novos_topicos,
        values.pendencias,
        values.proximos_passos
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atasReuniaoByMeeting"] });
      setIsAtaFormOpen(false);
      showSuccess("Ata de reunião criada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar ata de reunião: ${err.message}`);
    },
  });

  const updateAtaReuniaoMutation = useMutation({
    mutationFn: ({ id: ataId, ...values }: AtaReuniaoSubmitValues & { id: string }) => {
      if (!canEditAtasReuniao) {
        throw new Error("Você não tem permissão para editar atas de reunião.");
      }
      return updateAtaReuniao(
        ataId,
        values.conteudo,
        values.decisoes_tomadas,
        values.data_reuniao,
        values.horario_inicio,
        values.horario_fim,
        values.local_reuniao,
        values.participantes,
        values.objetivos_reuniao,
        values.pauta_tratada,
        values.novos_topicos,
        values.pendencias,
        values.proximos_passos
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atasReuniaoByMeeting"] });
      setIsAtaFormOpen(false);
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

  const handleCreateOrUpdateAta = (values: AtaReuniaoSubmitValues) => {
    if (editingAta) {
      updateAtaReuniaoMutation.mutate({ id: editingAta.id, ...values });
    } else {
      createAtaReuniaoMutation.mutate(values);
    }
  };

  const confirmDeleteAta = () => {
    if (ataToDelete) {
      deleteAtaReuniaoMutation.mutate(ataToDelete);
    }
  };

  // --- Poll Mutations ---
  const createEnqueteMutation = useMutation({
    mutationFn: (values: EnqueteSubmitValues) => {
      if (!userSessionId || !comiteId) {
        throw new Error("User not authenticated or committee ID not available.");
      }
      if (!canInsertEnquetes) {
        throw new Error("Você não tem permissão para criar enquetes.");
      }
      return createEnquete(
        comiteId,
        values.titulo,
        values.descricao,
        values.start_date.toISOString(),
        values.end_date.toISOString(),
        userSessionId,
        values.opcoes_texto
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enquetes", comiteId] });
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
      queryClient.invalidateQueries({ queryKey: ["enquetes", comiteId] });
      setIsEnqueteFormOpen(false);
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
      queryClient.invalidateQueries({ queryKey: ["enquetes", comiteId] });
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

  const confirmDeleteEnquete = () => {
    if (enqueteToDelete) {
      deleteEnqueteMutation.mutate(enqueteToDelete);
    }
  };

  const voteOnEnqueteMutation = useMutation({
    mutationFn: ({ enqueteId, opcaoId }: { enqueteId: string; opcaoId: string }) => {
      if (!userSessionId) {
        throw new Error("User not authenticated.");
      }
      if (!canVoteEnquete) {
        throw new Error("Você não tem permissão para votar em enquetes.");
      }
      return voteOnEnquete(enqueteId, opcaoId, userSessionId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["enquetes", comiteId] });
      showSuccess("Voto registrado com sucesso!");
      onVoteEnqueteSuccess(variables.enqueteId, variables.opcaoId);
    },
    onError: (err) => {
      showError(`Erro ao registrar voto: ${err.message}`);
    },
  });

  return (
    <>
      {/* Committee Form (for managing members) */}
      {canManageComiteMembers && editingComite && (
        <CommitteeForm
          open={isCommitteeFormOpen}
          onOpenChange={setIsCommitteeFormOpen}
          onSubmit={handleUpdateComiteMembers}
          initialData={editingComite}
          initialMembers={initialMembers}
          isLoading={updateComiteMutation.isPending}
        />
      )}

      {/* Meeting Form */}
      {(canInsertReunioes || canEditReunioes) && (
        <ReuniaoForm
          open={isReuniaoFormOpen}
          onOpenChange={setIsReuniaoFormOpen}
          onSubmit={handleCreateOrUpdateReuniao}
          initialData={editingReuniao}
          isLoading={createReuniaoMutation.isPending || updateReuniaoMutation.isPending}
        />
      )}

      {/* Meeting Delete Confirmation */}
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

      {/* Recurring Meeting Delete Confirmation */}
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

      {/* Meeting Minutes Form */}
      {(canInsertAtasReuniao || canEditAtasReuniao) && (
        <AtaReuniaoForm
          open={isAtaFormOpen}
          onOpenChange={setIsAtaFormOpen}
          onSubmit={handleCreateOrUpdateAta}
          initialData={editingAta}
          isLoading={createAtaReuniaoMutation.isPending || updateAtaReuniaoMutation.isPending}
          selectedMeeting={selectedMeetingForAta}
        />
      )}

      {/* Meeting Minutes Delete Confirmation */}
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

      {/* Poll Form */}
      {(canInsertEnquetes || canEditEnquetes) && (
        <EnqueteForm
          open={isEnqueteFormOpen}
          onOpenChange={setIsEnqueteFormOpen}
          onSubmit={handleCreateOrUpdateEnquete}
          initialData={editingEnquete}
          isLoading={createEnqueteMutation.isPending || updateEnqueteMutation.isPending}
        />
      )}

      {/* Poll Delete Confirmation */}
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
    </>
  );
};