"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, CalendarDays } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PeriodoForm, PeriodoFormValues } from "@/components/forms/PeriodoForm";
import { getPeriodos, createPeriodo, updatePeriodo, deletePeriodo, Periodo } from "@/integrations/supabase/api/periodos";
import { showSuccess, showError } from "@/utils/toast";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Periodos = () => {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingPeriodo, setEditingPeriodo] = React.useState<Periodo | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [periodoToDelete, setPeriodoToDelete] = React.useState<string | null>(null);

  const { data: periodos, isLoading, error } = useQuery<Periodo[], Error>({
    queryKey: ["periodos"],
    queryFn: getPeriodos,
  });

  const createPeriodoMutation = useMutation({
    mutationFn: (values: PeriodoFormValues) =>
      createPeriodo(
        values.nome,
        values.start_date.toISOString(),
        values.end_date.toISOString(),
        values.status
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos"] });
      setIsFormOpen(false);
      showSuccess("Período criado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar período: ${err.message}`);
    },
  });

  const updatePeriodoMutation = useMutation({
    mutationFn: ({ id, ...values }: PeriodoFormValues & { id: string }) =>
      updatePeriodo(
        id,
        values.nome,
        values.start_date.toISOString(),
        values.end_date.toISOString(),
        values.status
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos"] });
      setIsFormOpen(false);
      setEditingPeriodo(null);
      showSuccess("Período atualizado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar período: ${err.message}`);
    },
  });

  const deletePeriodoMutation = useMutation({
    mutationFn: deletePeriodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos"] });
      setIsDeleteDialogOpen(false);
      setPeriodoToDelete(null);
      showSuccess("Período excluído com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir período: ${err.message}`);
    },
  });

  const handleCreateOrUpdatePeriodo = (values: PeriodoFormValues) => {
    if (editingPeriodo) {
      updatePeriodoMutation.mutate({ id: editingPeriodo.id, ...values });
    } else {
      createPeriodoMutation.mutate(values);
    }
  };

  const handleEditClick = (periodo: Periodo) => {
    setEditingPeriodo(periodo);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setPeriodoToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (periodoToDelete) {
      deletePeriodoMutation.mutate(periodoToDelete);
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
        Erro ao carregar períodos: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Gestão de Períodos</CardTitle>
          <Button onClick={() => { setEditingPeriodo(null); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Período
          </Button>
        </CardHeader>
        <CardContent>
          {periodos && periodos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodos.map((periodo) => (
                  <TableRow key={periodo.id}>
                    <TableCell className="font-medium">{periodo.nome}</TableCell>
                    <TableCell>{format(new Date(periodo.start_date), "PPP", { locale: ptBR })}</TableCell>
                    <TableCell>{format(new Date(periodo.end_date), "PPP", { locale: ptBR })}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        periodo.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {periodo.status === 'active' ? 'Ativo' : 'Arquivado'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(periodo)}
                        className="mr-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(periodo.id)}
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
            <p className="text-gray-600">Nenhum período cadastrado ainda.</p>
          )}
        </CardContent>
      </Card>

      <PeriodoForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreateOrUpdatePeriodo}
        initialData={editingPeriodo}
        isLoading={createPeriodoMutation.isPending || updatePeriodoMutation.isPending}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o período selecionado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deletePeriodoMutation.isPending}>
              {deletePeriodoMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {deletePeriodoMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Periodos;