"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { getObjetivos, createObjetivo, updateObjetivo, deleteObjetivo, Objetivo } from "@/integrations/supabase/api/objetivos";
import { showSuccess, showError } from "@/utils/toast";
import { useSession } from "@/components/auth/SessionContextProvider"; // Import useSession

const Objetivos = () => {
  const queryClient = useQueryClient();
  const { user } = useSession(); // Get the current user from session
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingObjetivo, setEditingObjetivo] = React.useState<Objetivo | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [objetivoToDelete, setObjetivoToDelete] = React.useState<string | null>(null);

  const { data: objetivos, isLoading, error } = useQuery<Objetivo[], Error>({
    queryKey: ["objetivos"],
    queryFn: getObjetivos,
  });

  const createObjetivoMutation = useMutation({
    mutationFn: (values: ObjetivoFormValues) => {
      if (!user?.id) {
        throw new Error("User not authenticated.");
      }
      return createObjetivo(values.titulo, values.descricao, values.periodo, values.area_id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objetivos"] });
      setIsFormOpen(false);
      showSuccess("Objetivo criado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar objetivo: ${err.message}`);
    },
  });

  const updateObjetivoMutation = useMutation({
    mutationFn: ({ id, ...values }: ObjetivoFormValues & { id: string }) =>
      updateObjetivo(id, values.titulo, values.descricao, values.periodo, values.area_id, values.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objetivos"] });
      setIsFormOpen(false);
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
      setIsDeleteDialogOpen(false);
      setObjetivoToDelete(null);
      showSuccess("Objetivo excluído com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir objetivo: ${err.message}`);
    },
  });

  const handleCreateOrUpdateObjetivo = (values: ObjetivoFormValues) => {
    if (editingObjetivo) {
      updateObjetivoMutation.mutate({ id: editingObjetivo.id, ...values });
    } else {
      createObjetivoMutation.mutate(values);
    }
  };

  const handleEditClick = (objetivo: Objetivo) => {
    setEditingObjetivo(objetivo);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setObjetivoToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (objetivoToDelete) {
      deleteObjetivoMutation.mutate(objetivoToDelete);
    }
  };

  const getStatusBadgeClass = (status: Objetivo['status']) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      case 'draft':
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        Erro ao carregar objetivos: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Gestão de Objetivos</CardTitle>
          <Button onClick={() => { setEditingObjetivo(null); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Objetivo
          </Button>
        </CardHeader>
        <CardContent>
          {objetivos && objetivos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {objetivos.map((objetivo) => (
                  <TableRow key={objetivo.id}>
                    <TableCell className="font-medium">{objetivo.titulo}</TableCell>
                    <TableCell>{objetivo.periodo}</TableCell>
                    <TableCell>{objetivo.area_name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(objetivo.status)}`}>
                        {objetivo.status === 'draft' && 'Rascunho'}
                        {objetivo.status === 'active' && 'Ativo'}
                        {objetivo.status === 'completed' && 'Concluído'}
                        {objetivo.status === 'archived' && 'Arquivado'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(objetivo)}
                        className="mr-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(objetivo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Excluir</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-600">Nenhum objetivo cadastrado ainda.</p>
          )}
        </CardContent>
      </Card>

      <ObjetivoForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreateOrUpdateObjetivo}
        initialData={editingObjetivo}
        isLoading={createObjetivoMutation.isPending || updateObjetivoMutation.isPending}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o objetivo e todos os Key Results (KRs) associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteObjetivoMutation.isPending}>
              {deleteObjetivoMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {deleteObjetivoMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Objetivos;