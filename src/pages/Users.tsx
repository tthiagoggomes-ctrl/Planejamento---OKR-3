"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, Lock, Unlock, Mail, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserForm, UserFormValues } from "@/components/forms/UserForm";
import {
  getUsers,
  createUser,
  updateUserProfile,
  deleteUser,
  sendPasswordResetEmail,
  blockUser,
  unblockUser,
  UserProfile,
} from "@/integrations/supabase/api/users";
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
import { useUserPermissions } from '@/hooks/use-user-permissions'; // Importar o hook de permissões

type UpdateUserMutationArgs = UserFormValues & { id: string; email: string };

const Users = () => {
  const queryClient = useQueryClient();
  const { can, isLoading: permissionsLoading } = useUserPermissions();

  const canViewUsers = can('usuarios', 'view');
  const canInsertUsers = can('usuarios', 'insert');
  const canEditUsers = can('usuarios', 'edit');
  const canDeleteUsers = can('usuarios', 'delete');
  const canBlockUnblockUsers = can('usuarios', 'block_unblock');
  const canResetPasswordUsers = can('usuarios', 'reset_password');

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserProfile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<string | null>(null);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = React.useState(false);
  const [userToResetPassword, setUserToResetPassword] = React.useState<UserProfile | null>(null);

  const [sortBy, setSortBy] = React.useState<keyof UserProfile | 'area_name' | 'email'>('first_name');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  const { data: users, isLoading, error } = useQuery<UserProfile[] | null, Error>({
    queryKey: ["users", { sortBy, sortOrder }],
    queryFn: ({ queryKey }) => {
      const params = queryKey[1] as { sortBy: keyof UserProfile | 'area_name' | 'email', sortOrder: 'asc' | 'desc' };
      return getUsers({ sortBy: params.sortBy, sortOrder: params.sortOrder });
    },
    enabled: canViewUsers && !permissionsLoading, // Habilitar query apenas se tiver permissão
  });

  const createUserMutation = useMutation({
    mutationFn: (values: UserFormValues) => {
      if (!canInsertUsers) throw new Error("Você não tem permissão para criar usuários.");
      return createUser(
        values.email,
        values.first_name,
        values.last_name,
        values.area_id,
        values.permissao,
        values.selected_permissions,
        values.password,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsFormOpen(false);
      showSuccess("Usuário criado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao criar usuário: ${err.message}`);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, first_name, last_name, area_id, permissao, status, selected_permissions, email }: UpdateUserMutationArgs) => {
      if (!canEditUsers) throw new Error("Você não tem permissão para editar usuários.");
      return updateUserProfile(id, first_name, last_name, area_id, permissao, status, selected_permissions, email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsFormOpen(false);
      setEditingUser(null);
      showSuccess("Usuário atualizado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar usuário: ${err.message}`);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => {
      if (!canDeleteUsers) throw new Error("Você não tem permissão para excluir usuários.");
      return deleteUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      showSuccess("Usuário excluído com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao excluir usuário: ${err.message}`);
    },
  });

  const sendPasswordResetMutation = useMutation({
    mutationFn: (email: string) => {
      if (!canResetPasswordUsers) throw new Error("Você não tem permissão para redefinir senhas.");
      return sendPasswordResetEmail(email);
    },
    onSuccess: () => {
      setIsResetPasswordDialogOpen(false);
      setUserToResetPassword(null);
      showSuccess("E-mail de redefinição de senha enviado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao enviar e-mail de redefinição de senha: ${err.message}`);
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: (id: string) => {
      if (!canBlockUnblockUsers) throw new Error("Você não tem permissão para bloquear usuários.");
      return blockUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSuccess("Usuário bloqueado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao bloquear usuário: ${err.message}`);
    },
  });

  const unblockUserMutation = useMutation({
    mutationFn: (id: string) => {
      if (!canBlockUnblockUsers) throw new Error("Você não tem permissão para desbloquear usuários.");
      return unblockUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSuccess("Usuário desbloqueado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao desbloquear usuário: ${err.message}`);
    },
  });

  const handleCreateOrUpdateUser = (values: UserFormValues) => {
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        first_name: values.first_name,
        last_name: values.last_name,
        area_id: values.area_id,
        permissao: values.permissao,
        status: values.status || 'active',
        selected_permissions: values.selected_permissions,
        email: editingUser.email,
      });
    } else {
      createUserMutation.mutate({
        email: values.email,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
        area_id: values.area_id,
        permissao: values.permissao,
        status: 'active',
        selected_permissions: values.selected_permissions,
      });
    }
  };

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setUserToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete);
    }
  };

  const handleResetPasswordClick = (user: UserProfile) => {
    setUserToResetPassword(user);
    setIsResetPasswordDialogOpen(true);
  };

  const confirmResetPassword = () => {
    if (userToResetPassword?.email) {
      sendPasswordResetMutation.mutate(userToResetPassword.email);
    }
  };

  const handleBlockUnblockClick = (user: UserProfile) => {
    if (user.status === 'active') {
      blockUserMutation.mutate(user.id);
    } else {
      unblockUserMutation.mutate(user.id);
    }
  };

  const getPermissaoLabel = (permissao: UserProfile['permissao']) => {
    switch (permissao) {
      case 'administrador': return 'Administrador';
      case 'diretoria': return 'Diretoria';
      case 'gerente': return 'Gerente';
      case 'supervisor': return 'Supervisor';
      case 'usuario': return 'Usuário';
      default: return 'Desconhecido';
    }
  };

  const handleSort = (column: keyof UserProfile | 'area_name' | 'email') => {
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

  if (!canViewUsers) {
    return (
      <div className="container mx-auto py-6 text-center text-red-500">
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        Erro ao carregar usuários: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Gestão de Usuários</CardTitle>
          {canInsertUsers && (
            <Button onClick={() => { setEditingUser(null); setIsFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Usuário
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('first_name')}
                      className="flex items-center px-0 py-0 h-auto"
                    >
                      Nome Completo
                      {sortBy === 'first_name' && (
                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('email')}
                      className="flex items-center px-0 py-0 h-auto"
                    >
                      E-mail
                      {sortBy === 'email' && (
                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('area_name')}
                      className="flex items-center px-0 py-0 h-auto"
                    >
                      Área
                      {sortBy === 'area_name' && (
                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('permissao')}
                      className="flex items-center px-0 py-0 h-auto"
                    >
                      Permissão
                      {sortBy === 'permissao' && (
                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('status')}
                      className="flex items-center px-0 py-0 h-auto"
                    >
                      Status
                      {sortBy === 'status' && (
                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{(user as any).area_name || 'N/A'}</TableCell>
                    <TableCell>{getPermissaoLabel(user.permissao)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status === 'active' ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {canEditUsers && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(user)}
                          className="mr-1"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                      )}
                      {canBlockUnblockUsers && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleBlockUnblockClick(user)}
                          className="mr-1"
                          disabled={blockUserMutation.isPending || unblockUserMutation.isPending}
                        >
                          {user.status === 'active' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                          <span className="sr-only">{user.status === 'active' ? 'Bloquear' : 'Desbloquear'}</span>
                        </Button>
                      )}
                      {canResetPasswordUsers && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResetPasswordClick(user)}
                          className="mr-1"
                        >
                          <Mail className="h-4 w-4" />
                          <span className="sr-only">Redefinir Senha</span>
                        </Button>
                      )}
                      {canDeleteUsers && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(user.id)}
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
            <p className="text-gray-600">Nenhum usuário cadastrado ainda.</p>
          )}
        </CardContent>
      </Card>

      {(canInsertUsers || canEditUsers) && (
        <UserForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleCreateOrUpdateUser}
          initialData={editingUser}
          isLoading={createUserMutation.isPending || updateUserMutation.isPending}
        />
      )}

      {canDeleteUsers && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário e todos os dados associados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} disabled={deleteUserMutation.isPending}>
                {deleteUserMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {deleteUserMutation.isPending ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {canResetPasswordUsers && (
        <AlertDialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Redefinir Senha</AlertDialogTitle>
              <AlertDialogDescription>
                Um e-mail de redefinição de senha será enviado para {userToResetPassword?.email}. O usuário poderá definir uma nova senha através do link no e-mail.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmResetPassword} disabled={sendPasswordResetMutation.isPending}>
                {sendPasswordResetMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {sendPasswordResetMutation.isPending ? "Enviando..." : "Enviar E-mail"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default Users;