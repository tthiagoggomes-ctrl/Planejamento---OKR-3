"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, Lock, Unlock, Mail } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserForm, UserFormValues } from "@/components/forms/UserForm"; // Import UserFormValues
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
import { useSession } from "@/components/auth/SessionContextProvider"; // Import useSession

// Define um tipo para os argumentos da mutação de atualização
type UpdateUserMutationArgs = UserFormValues & { id: string };

const Users = () => {
  const queryClient = useQueryClient();
  const { userProfile: currentUserProfile } = useSession(); // Get current user's profile
  const isAdmin = currentUserProfile?.permissao === 'administrador';

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserProfile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<string | null>(null);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = React.useState(false);
  const [userToResetPassword, setUserToResetPassword] = React.useState<UserProfile | null>(null);

  const { data: users, isLoading, error } = useQuery<UserProfile[], Error>({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const createUserMutation = useMutation({
    mutationFn: (values: UserFormValues) => createUser( // Usando UserFormValues
      values.email,
      values.password,
      values.first_name,
      values.last_name,
      values.area_id,
      values.permissao
    ),
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
    mutationFn: ({ id, first_name, last_name, area_id, permissao, status }: UpdateUserMutationArgs) => // Usando UpdateUserMutationArgs
      updateUserProfile(id, first_name, last_name, area_id, permissao, status),
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
    mutationFn: deleteUser,
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
    mutationFn: sendPasswordResetEmail,
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
    mutationFn: blockUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSuccess("Usuário bloqueado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao bloquear usuário: ${err.message}`);
    },
  });

  const unblockUserMutation = useMutation({
    mutationFn: unblockUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSuccess("Usuário desbloqueado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao desbloquear usuário: ${err.message}`);
    },
  });

  const handleCreateOrUpdateUser = (values: UserFormValues) => { // Usando UserFormValues
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        first_name: values.first_name,
        last_name: values.last_name,
        area_id: values.area_id,
        permissao: values.permissao,
        status: values.status || 'active', // Garante que o status seja 'active' se não for fornecido (embora o formulário deva fornecer)
      });
    } else {
      createUserMutation.mutate({
        email: values.email,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
        area_id: values.area_id,
        permissao: values.permissao,
        status: 'active', // Status padrão para novos usuários
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
        Erro ao carregar usuários: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Gestão de Usuários</CardTitle>
          {isAdmin && (
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
                  <TableHead>Nome Completo</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead>Status</TableHead>
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
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(user)}
                            className="mr-1"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleResetPasswordClick(user)}
                            className="mr-1"
                          >
                            <Mail className="h-4 w-4" />
                            <span className="sr-only">Redefinir Senha</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir</span>
                          </Button>
                        </>
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

      <UserForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreateOrUpdateUser}
        initialData={editingUser}
        isLoading={createUserMutation.isPending || updateUserMutation.isPending}
      />

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
    </div>
  );
};

export default Users;