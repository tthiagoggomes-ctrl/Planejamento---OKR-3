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
import { ObjetivoForm, ObjetivoFormValues } from "@/components/forms/ObjetivoForm";
import { createObjetivo, updateObjetivo, deleteObjetivo, Objetivo } from "@/integrations/supabase/api/objetivos";
import { KeyResultForm, KeyResultFormValues } from "@/components/forms/KeyResultForm";
import { createKeyResult, updateKeyResult, deleteKeyResult, KeyResult } from "@/integrations/supabase/api/key_results";
import { AtividadeForm, AtividadeFormValues } from "@/components/forms/AtividadeForm";
import { createAtividade, updateAtividade, deleteAtividade, Atividade } from "@/integrations/supabase/api/atividades";
import { showSuccess, showError } from "@/utils/toast";
import { useSession } from "@/components/auth/SessionContextProvider";

interface ObjetivoModalsAndAlertsProps {
  // Objetivo states and setters
  isObjetivoFormOpen: boolean;
  setIsObjetivoFormOpen: (open: boolean) => void;
  editingObjetivo: Objetivo | null;
  setEditingObjetivo: (objetivo: Objetivo | null) => void;
  isObjetivoDeleteDialogOpen: boolean;
  setIsObjetivoDeleteDialogOpen: (open: boolean) => void;
  objetivoToDelete: string | null;
  setObjetivoToDelete: (id: string | null) => void;

  // Key Result states and setters
  isKeyResultFormOpen: boolean;
  setIsKeyResultFormOpen: (open: boolean) => void;
  editingKeyResult: KeyResult | null;
  setEditingKeyResult: (kr: KeyResult | null) => void;
  selectedObjetivoForKR: Objetivo | null;
  setSelectedObjetivoForKR: (objetivo: Objetivo | null) => void;
  isKeyResultDeleteDialogOpen: boolean;
  setIsKeyResultDeleteDialogOpen: (open: boolean) => void;
  keyResultToDelete: string | null;
  setKeyResultToDelete: (id: string | null) => void;

  // Atividade states and setters
  isAtividadeFormOpen: boolean;
  setIsAtividadeFormOpen: (open: boolean) => void;
  editingAtividade: Atividade | null;
  setEditingAtividade: (atividade: Atividade | null) => void;
  selectedKeyResultForAtividade: KeyResult | null;
  setSelectedKeyResultForAtividade: (kr: KeyResult | null) => void;
  isAtividadeDeleteDialogOpen: boolean;
  setIsAtividadeDeleteDialogOpen: (open: boolean) => void;
  atividadeToDelete: string | null;
  setAtividadeToDelete: (id: string | null) => void;
}

export const ObjetivoModalsAndAlerts: React.FC<ObjetivoModalsAndAlertsProps> = ({
  isObjetivoFormOpen,
  setIsObjetivoFormOpen,
  editingObjetivo,
  setEditingObjetivo,
  isObjetivoDeleteDialogOpen,
  setIsObjetivoDeleteDialogOpen,
  objetivoToDelete,
  setObjetivoToDelete,

  isKeyResultFormOpen,
  setIsKeyResultFormOpen,
  editingKeyResult,
  setEditingKeyResult,
  selectedObjetivoForKR,
  setSelectedObjetivoForKR,
  isKeyResultDeleteDialogOpen,
  setIsKeyResultDeleteDialogOpen,
  keyResultToDelete,
  setKeyResultToDelete,

  isAtividadeFormOpen,
  setIsAtividadeFormOpen,
  editingAtividade,
  setEditingAtividade,
  selectedKeyResultForAtividade,
  setSelectedKeyResultForAtividade,
  isAtividadeDeleteDialogOpen,
  setIsAtividadeDeleteDialogOpen,
  atividadeToDelete,
  setAtividadeToDelete,
}) => {
  const queryClient = useQueryClient();
  const { user } = useSession();

  // Helper function to format due_date for API
  const formatDueDateForApi = (date: Date | string | null | undefined): string | null => {
    if (date instanceof Date) {
      return date.toISOString();
    }
    if (typeof date === 'string') {
      return date; // Already an ISO string
    }
    return null;
  };

  // Mutations for Objetivos
  const createObjetivoMutation = useMutation({
    mutationFn: (values: ObjetivoFormValues) => {
      if (!user?.id) {
        throw new Error("User not authenticated.");
      }
      return createObjetivo(values.titulo, values.descricao, values.area_id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objetivos"] });
      setIsObjetivoFormOpen(false);
      showSuccess("Objetivo criado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar objetivo: ${err.message}`);
    },
  });

  const updateObjetivoMutation = useMutation({
    mutationFn: ({ id, ...values }: ObjetivoFormValues & { id: string }) =>
      updateObjetivo(id, values.titulo, values.descricao, values.area_id, values.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objetivos"] });
      setIsObjetivoFormOpen(false);
      setEditingObjetivo(null);
      showSuccess("Objetivo atualizado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar objetivo: ${err.message}`);
    },
  });

  const deleteObjetivoMutation = useMutation({
    mutationFn: deleteObjetivo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objetivos"] });
      setIsObjetivoDeleteDialogOpen(false);
      setObjetivoToDelete(null);
      showSuccess("Objetivo excluído com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir objetivo: ${err.message}`);
    },
  });

  // Mutations for Key Results
  const createKeyResultMutation = useMutation({
    mutationFn: (values: KeyResultFormValues) => {
      if (!user?.id || !selectedObjetivoForKR?.id) {
        throw new Error("User not authenticated or objective not selected.");
      }
      return createKeyResult(
        selectedObjetivoForKR.id,
        user.id,
        values.titulo,
        values.tipo,
        values.valor_inicial,
        values.valor_meta,
        values.unidade,
        values.periodo,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] });
      queryClient.invalidateQueries({ queryKey: ["allKeyResults"] }); // Invalidate for dashboard/other views
      setIsKeyResultFormOpen(false);
      setSelectedObjetivoForKR(null);
      showSuccess("Key Result criado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar Key Result: ${err.message}`);
    },
  });

  const updateKeyResultMutation = useMutation({
    mutationFn: ({ id, ...values }: KeyResultFormValues & { id: string }) =>
      updateKeyResult(
        id,
        values.titulo,
        values.tipo,
        values.valor_inicial,
        values.valor_meta,
        values.unidade,
        values.periodo,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] });
      queryClient.invalidateQueries({ queryKey: ["allKeyResults"] }); // Invalidate for dashboard/other views
      setIsKeyResultFormOpen(false);
      setEditingKeyResult(null);
      setSelectedObjetivoForKR(null);
      showSuccess("Key Result atualizado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar Key Result: ${err.message}`);
    },
  });

  const deleteKeyResultMutation = useMutation({
    mutationFn: deleteKeyResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] });
      queryClient.invalidateQueries({ queryKey: ["allKeyResults"] }); // Invalidate for dashboard/other views
      setIsKeyResultDeleteDialogOpen(false);
      setKeyResultToDelete(null);
      showSuccess("Key Result excluído com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir Key Result: ${err.message}`);
    },
  });

  // Mutations for Atividades
  const createAtividadeMutation = useMutation({
    mutationFn: (values: AtividadeFormValues) => {
      if (!user?.id || !selectedKeyResultForAtividade?.id) {
        throw new Error("User not authenticated or Key Result not selected.");
      }
      return createAtividade(
        selectedKeyResultForAtividade.id,
        user.id,
        values.titulo,
        values.descricao,
        formatDueDateForApi(values.due_date),
        values.status
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] });
      queryClient.invalidateQueries({ queryKey: ["atividades"] }); // Invalidate activities list
      queryClient.invalidateQueries({ queryKey: ["allKeyResults"] }); // Invalidate for dashboard/other views
      setIsAtividadeFormOpen(false);
      setSelectedKeyResultForAtividade(null);
      showSuccess("Atividade criada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar atividade: ${err.message}`);
    },
  });

  const updateAtividadeMutation = useMutation({
    mutationFn: ({ id: atividadeId, ...values }: AtividadeFormValues & { id: string }) => {
      if (!selectedKeyResultForAtividade?.id) {
        throw new Error("Key Result not selected for activity update.");
      }
      return updateAtividade(
        atividadeId,
        values.key_result_id,
        values.user_id,
        values.titulo,
        values.descricao,
        formatDueDateForApi(values.due_date),
        values.status
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] });
      queryClient.invalidateQueries({ queryKey: ["atividades"] }); // Invalidate activities list
      queryClient.invalidateQueries({ queryKey: ["allKeyResults"] }); // Invalidate for dashboard/other views
      setIsAtividadeFormOpen(false);
      setEditingAtividade(null);
      showSuccess("Atividade atualizada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar atividade: ${err.message}`);
    },
  });

  const deleteAtividadeMutation = useMutation({
    mutationFn: deleteAtividade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_results_by_objetivo"] });
      queryClient.invalidateQueries({ queryKey: ["atividades"] }); // Invalidate activities list
      queryClient.invalidateQueries({ queryKey: ["allKeyResults"] }); // Invalidate for dashboard/other views
      setIsAtividadeDeleteDialogOpen(false);
      setAtividadeToDelete(null);
      showSuccess("Atividade excluída com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir atividade: ${err.message}`);
    },
  });

  // Handlers for forms
  const handleCreateOrUpdateObjetivo = (values: ObjetivoFormValues) => {
    if (editingObjetivo) {
      updateObjetivoMutation.mutate({ id: editingObjetivo.id, ...values });
    } else {
      createObjetivoMutation.mutate(values);
    }
  };

  const handleCreateOrUpdateKeyResult = (values: KeyResultFormValues) => {
    if (editingKeyResult) {
      updateKeyResultMutation.mutate({ id: editingKeyResult.id, ...values });
    } else {
      createKeyResultMutation.mutate(values);
    }
  };

  const handleCreateOrUpdateAtividade = (values: AtividadeFormValues) => {
    if (editingAtividade) {
      updateAtividadeMutation.mutate({ id: editingAtividade.id, ...values });
    } else {
      createAtividadeMutation.mutate(values);
    }
  };

  // Handlers for delete confirmations
  const confirmDeleteObjetivo = () => {
    if (objetivoToDelete) {
      deleteObjetivoMutation.mutate(objetivoToDelete);
    }
  };

  const confirmDeleteKeyResult = () => {
    if (keyResultToDelete) {
      deleteKeyResultMutation.mutate(keyResultToDelete);
    }
  };

  const confirmDeleteAtividade = () => {
    if (atividadeToDelete) {
      deleteAtividadeMutation.mutate(atividadeToDelete);
    }
  };

  return (
    <>
      {/* Objetivo Form */}
      <ObjetivoForm
        open={isObjetivoFormOpen}
        onOpenChange={setIsObjetivoFormOpen}
        onSubmit={handleCreateOrUpdateObjetivo}
        initialData={editingObjetivo}
        isLoading={createObjetivoMutation.isPending || updateObjetivoMutation.isPending}
      />

      {/* Objetivo Delete Confirmation */}
      <AlertDialog open={isObjetivoDeleteDialogOpen} onOpenChange={setIsObjetivoDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o objetivo e todos os Key Results (KRs) e Atividades associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteObjetivo} disabled={deleteObjetivoMutation.isPending}>
              {deleteObjetivoMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {deleteObjetivoMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Key Result Form */}
      <KeyResultForm
        open={isKeyResultFormOpen}
        onOpenChange={setIsKeyResultFormOpen}
        onSubmit={handleCreateOrUpdateKeyResult}
        initialData={editingKeyResult}
        isLoading={createKeyResultMutation.isPending || updateKeyResultMutation.isPending}
      />

      {/* Key Result Delete Confirmation */}
      <AlertDialog open={isKeyResultDeleteDialogOpen} onOpenChange={setIsKeyResultDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o Key Result selecionado e todas as atividades associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteKeyResult} disabled={deleteKeyResultMutation.isPending}>
              {deleteKeyResultMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {deleteKeyResultMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Atividade Form */}
      <AtividadeForm
        open={isAtividadeFormOpen}
        onOpenChange={setIsAtividadeFormOpen}
        onSubmit={handleCreateOrUpdateAtividade}
        initialData={editingAtividade}
        isLoading={createAtividadeMutation.isPending || updateAtividadeMutation.isPending}
        preselectedKeyResultId={selectedKeyResultForAtividade?.id}
      />

      {/* Atividade Delete Confirmation */}
      <AlertDialog open={isAtividadeDeleteDialogOpen} onOpenChange={setIsAtividadeDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a atividade selecionada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAtividade} disabled={deleteAtividadeMutation.isPending}>
              {deleteAtividadeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {deleteAtividadeMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};