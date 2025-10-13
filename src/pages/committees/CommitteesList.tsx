/// <reference types="react" />
"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, GitCommit, Users, CalendarDays, MessageSquare } from "lucide-react";
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
import { getComites, createComite, updateComite, deleteComite, Comite } from "@/integrations/supabase/api/comites";
import { showSuccess, showError } from "@/utils/toast";
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { Link } from "react-router-dom";

// Placeholder for CommitteeForm (will be created in a later step)
interface CommitteeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: any) => void;
  initialData?: Comite | null;
  isLoading?: boolean;
}
const CommitteeForm: React.FC<CommitteeFormProps> = ({ open, onOpenChange, onSubmit, initialData, isLoading }) => {
  // This is a placeholder. Actual form implementation will come later.
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{initialData ? "Editar Comitê" : "Criar Novo Comitê"}</AlertDialogTitle>
          <AlertDialogDescription>
            Formulário de comitê em desenvolvimento.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button onClick={() => {
            onSubmit({ nome: "Novo Comitê", descricao: "Descrição", status: "active" });
            onOpenChange(false);
          }} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? "Salvando..." : "Salvar (Placeholder)"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


const CommitteesList = () => {
  const queryClient = useQueryClient();
  const { can, isLoading: permissionsLoading } = useUserPermissions();

  const canViewComites = can('comites', 'view');
  const canInsertComites = can('comites', 'insert');
  const canEditComites = can('comites', 'edit');
  const canDeleteComites = can('comites', 'delete');

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingComite, setEditingComite] = React.useState<Comite | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [comiteToDelete, setComiteToDelete] = React.useState<string | null>(null);

  const { data: comites, isLoading, error } = useQuery<Comite[] | null, Error>({
    queryKey: ["comites"],
    queryFn: getComites,
    enabled: canViewComites && !permissionsLoading,
  });

  const createComiteMutation = useMutation({
    mutationFn: (values: { nome: string; descricao: string | null; status: 'active' | 'archived' }) =>
      createComite(values.nome, values.descricao, values.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comites"] });
      setIsFormOpen(false);
    },
    onError: (err) => {
      showError(`Erro ao criar comitê: ${err.message}`);
    },
  });

  const updateComiteMutation = useMutation({
    mutationFn: ({ id, nome, descricao, status }: { id: string; nome: string; descricao: string | null; status: 'active' | 'archived' }) =>
      updateComite(id, nome, descricao, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comites"] });
      setIsFormOpen(false);
      setEditingComite(null);
    },
    onError: (err) => {
      showError(`Erro ao atualizar comitê: ${err.message}`);
    },
  });

  const deleteComiteMutation = useMutation({
    mutationFn: deleteComite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comites"] });
      setIsDeleteDialogOpen(false);
      setComiteToDelete(null);
    },
    onError: (err) => {
      showError(`Erro ao excluir comitê: ${err.message}`);
    },
  });

  const handleCreateOrUpdateComite = (values: any) => { // 'any' because CommitteeForm is a placeholder
    if (editingComite) {
      updateComiteMutation.mutate({ id: editingComite.id, ...values });
    } else {
      createComiteMutation.mutate(values);
    }
  };

  const handleEditClick = (comite: Comite) => {
    setEditingComite(comite);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setComiteToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (comiteToDelete) {
      deleteComiteMutation.mutate(comiteToDelete);
    }
  };

  if (isLoading || permissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewComites) {
    return (
      <div className="container mx-auto py-6 text-center text-red-500">
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        Erro ao carregar comitês: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold flex items-center">
            <GitCommit className="mr-2 h-6 w-6" /> Gestão de Comitês
          </CardTitle>
          {canInsertComites && (
            <Button onClick={() => { setEditingComite(null); setIsFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Comitê
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {comites && comites.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comites.map((comite) => (
                  <TableRow key={comite.id}>
                    <TableCell className="font-medium">
                      <Link to={`/comites/${comite.id}`} className="text-blue-600 hover:underline">
                        {comite.nome}
                      </Link>
                    </TableCell>
                    <TableCell>{comite.descricao || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        comite.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {comite.status === 'active' ? 'Ativo' : 'Arquivado'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {canEditComites && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(comite)}
                          className="mr-2"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                      )}
                      {canDeleteComites && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(comite.id)}
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
            <p className="text-gray-600">Nenhum comitê cadastrado ainda.</p>
          )}
        </CardContent>
      </Card>

      {(canInsertComites || canEditComites) && (
        <CommitteeForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleCreateOrUpdateComite}
          initialData={editingComite}
          isLoading={createComiteMutation.isPending || updateComiteMutation.isPending}
        />
      )}

      {canDeleteComites && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o comitê e todos os dados associados (membros, reuniões, atas, atividades, enquetes, votos).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} disabled={deleteComiteMutation.isPending}>
                {deleteComiteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {deleteComiteMutation.isPending ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default CommitteesList;