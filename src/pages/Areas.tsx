"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AreaForm } from "@/components/forms/AreaForm";
import { getAreas, createArea, updateArea, deleteArea, Area } from "@/integrations/supabase/api/areas";
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
import { useUserPermissions } from '@/hooks/use-user-permissions';

const Areas = () => {
  const queryClient = useQueryClient();
  const { can, isLoading: permissionsLoading } = useUserPermissions();

  const canViewAreas = can('areas', 'view');
  const canInsertAreas = can('areas', 'insert');
  const canEditAreas = can('areas', 'edit');
  const canDeleteAreas = can('areas', 'delete');

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingArea, setEditingArea] = React.useState<Area | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [areaToDelete, setAreaToDelete] = React.useState<string | null>(null);

  const [sortBy, setSortBy] = React.useState<keyof Area>('nome');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  const { data: areas, isLoading, error } = useQuery<Area[], Error>({
    queryKey: ["areas", { sortBy, sortOrder }],
    queryFn: () => getAreas({ sortBy, sortOrder }),
    enabled: canViewAreas && !permissionsLoading,
  });

  const createAreaMutation = useMutation({
    mutationFn: createArea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      setIsFormOpen(false);
      showSuccess("Área criada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar área: ${err.message}`);
    },
  });

  const updateAreaMutation = useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) => updateArea(id, nome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      setIsFormOpen(false);
      setEditingArea(null);
      showSuccess("Área atualizada com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar área: ${err.message}`);
    },
  });

  const deleteAreaMutation = useMutation({
    mutationFn: deleteArea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      setIsDeleteDialogOpen(false);
      setAreaToDelete(null);
      showSuccess("Área excluída com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir área: ${err.message}`);
    },
  });

  const handleCreateOrUpdateArea = (values: { nome: string }) => {
    if (editingArea) {
      updateAreaMutation.mutate({ id: editingArea.id, nome: values.nome });
    } else {
      createAreaMutation.mutate(values.nome);
    }
  };

  const handleEditClick = (area: Area) => {
    setEditingArea(area);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setAreaToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (areaToDelete) {
      deleteAreaMutation.mutate(areaToDelete);
    }
  };

  const handleSort = (column: keyof Area) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (isLoading || permissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewAreas) {
    return (
      <div className="container mx-auto py-6 text-center text-red-500">
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        Erro ao carregar áreas: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Gestão de Áreas</CardTitle>
          {canInsertAreas && (
            <Button onClick={() => { setEditingArea(null); setIsFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Área
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {areas && areas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('nome')}
                      className="flex items-center px-0 py-0 h-auto"
                    >
                      Nome
                      {sortBy === 'nome' && (
                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areas.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell className="font-medium">{area.nome}</TableCell>
                    <TableCell className="text-right">
                      {canEditAreas && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(area)}
                          className="mr-2"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                      )}
                      {canDeleteAreas && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(area.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-600">Nenhuma área cadastrada ainda.</p>
          )}
        </CardContent>
      </Card>

      {(canInsertAreas || canEditAreas) && (
        <AreaForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleCreateOrUpdateArea}
          initialData={editingArea}
          isLoading={createAreaMutation.isPending || updateAreaMutation.isPending}
        />
      )}

      {canDeleteAreas && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente a área e todos os dados associados (objetivos, KRs, atividades, etc.).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} disabled={deleteAreaMutation.isPending}>
                {deleteAreaMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {deleteAreaMutation.isPending ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default Areas;