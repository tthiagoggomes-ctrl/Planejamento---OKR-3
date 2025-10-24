"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Mail, Building, Shield, CheckCircle, Ban } from "lucide-react";
import { getCurrentUserProfile, updateUserProfile, UserProfile } from "@/integrations/supabase/api/users";
import { ProfileForm, ProfileFormValues } from "@/components/forms/ProfileForm";
import { showSuccess, showError } from "@/utils/toast";
import { Separator } from "@/components/ui/separator";
import { useUserPermissions } from '@/hooks/use-user-permissions'; // Importar o hook de permissões

const Profile = () => {
  const queryClient = useQueryClient();
  const { can, isLoading: permissionsLoading } = useUserPermissions();

  const canViewProfile = can('profile', 'view');
  const canEditProfile = can('profile', 'edit');

  const { data: userProfile, isLoading, error } = useQuery<UserProfile, Error>({
    queryKey: ["currentUserProfile"],
    queryFn: getCurrentUserProfile,
    enabled: canViewProfile && !permissionsLoading, // Habilitar query apenas se tiver permissão
  });

  const updateUserProfileMutation = useMutation({
    mutationFn: (values: ProfileFormValues) => {
      if (!userProfile) throw new Error("User profile not loaded.");
      if (!canEditProfile) throw new Error("Você não tem permissão para editar o perfil.");
      
      return updateUserProfile(
        userProfile.id,
        values.first_name,
        values.last_name,
        values.area_id,
        userProfile.permissao, // Keep existing permission
        userProfile.status, // Keep existing status
        [], // selected_permissions are not managed in Profile.tsx
        userProfile.email // Pass email
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      showSuccess("Perfil atualizado com sucesso!");
    },
    onError: (err) => {
      showError(`Erro ao atualizar perfil: ${err.message}`);
    },
  });

  const handleSubmit = (values: ProfileFormValues) => {
    updateUserProfileMutation.mutate(values);
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

  if (isLoading || permissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewProfile) {
    return (
      <div className="container mx-auto py-6 text-center text-red-500">
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        Erro ao carregar perfil: {error.message}
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="text-center text-gray-600">
        Nenhum perfil de usuário encontrado.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <User className="mr-2 h-6 w-6" /> Meu Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">E-mail</p>
              <p className="flex items-center text-lg font-semibold">
                <Mail className="mr-2 h-5 w-5 text-gray-500" /> {userProfile.email}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Permissão</p>
              <p className="flex items-center text-lg font-semibold">
                <Shield className="mr-2 h-5 w-5 text-gray-500" />
                {getPermissaoLabel(userProfile.permissao)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className={`flex items-center text-lg font-semibold ${userProfile.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                {userProfile.status === 'active' ? <CheckCircle className="mr-2 h-5 w-5" /> : <Ban className="mr-2 h-5 w-5" />}
                {userProfile.status === 'active' ? 'Ativo' : 'Bloqueado'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Área</p>
              <p className="flex items-center text-lg font-semibold">
                <Building className="mr-2 h-5 w-5 text-gray-500" />
                {userProfile.area_name || 'N/A'}
              </p>
            </div>
          </div>

          {canEditProfile && (
            <>
              <Separator />
              <h3 className="text-xl font-semibold mb-4">Editar Informações do Perfil</h3>
              <ProfileForm
                initialData={userProfile}
                onSubmit={handleSubmit}
                isLoading={updateUserProfileMutation.isPending}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;