"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UserProfile } from "@/integrations/supabase/api/users";
import { Area, getAreas } from "@/integrations/supabase/api/areas";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { Permission } from "@/hooks/use-user-permissions"; // Import Permission interface
import { supabase } from "@/integrations/supabase/client"; // Import supabase client

export const userFormSchema = z.object({
  first_name: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  last_name: z.string().min(2, {
    message: "O sobrenome deve ter pelo menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "Por favor, insira um e-mail válido.",
  }),
  password: z.string().min(6, {
    message: "A senha deve ter pelo menos 6 caracteres.",
  }).optional().or(z.literal("")), // Optional for edit, required for create
  area_id: z.string().uuid({ message: "Selecione uma área válida." }).nullable(),
  permissao: z.enum(["administrador", "diretoria", "gerente", "supervisor", "usuario"], { // Updated enum
    message: "Selecione uma permissão válida.",
  }),
  status: z.enum(["active", "blocked"], {
    message: "Selecione um status válido.",
  }),
  cargo_funcao: z.string().nullable(), // NOVO: Adicionado cargo_funcao
  selected_permissions: z.array(z.string()).optional(), // New field for granular permissions
});

export type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UserFormValues) => void;
  initialData?: UserProfile | null;
  isLoading?: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}) => {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      email: initialData?.email || "",
      password: "", // Always empty for security
      area_id: initialData?.area_id || null,
      permissao: initialData?.permissao || "usuario", // Default to 'usuario'
      status: initialData?.status || "active",
      cargo_funcao: initialData?.cargo_funcao || "", // NOVO: Definir default
      selected_permissions: [],
    },
  });

  const { data: areas, isLoading: isLoadingAreas } = useQuery<Area[] | null, Error>({
    queryKey: ["areas"],
    queryFn: () => getAreas(), // Wrap in arrow function to match QueryFunction signature
  });

  const { data: allPermissions, isLoading: isLoadingPermissions } = useQuery<Permission[], Error>({
    queryKey: ["allPermissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from('permissions').select('*');
      if (error) {
        console.error('Error fetching all permissions:', error.message);
        return [];
      }
      return data;
    },
  });

  const { data: currentUserPermissions, isLoading: isLoadingCurrentUserPermissions } = useQuery<string[], Error>({
    queryKey: ["currentUserPermissions", initialData?.id],
    queryFn: async ({ queryKey }) => {
      const userId = queryKey[1] as string | undefined;
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission_id, permissions(resource, action)')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching current user permissions:', error.message);
        return [];
      }
      return data.map((up: any) => up.permissions ? `${up.permissions.resource}_${up.permissions.action}` : '');
    },
    enabled: !!initialData?.id,
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        first_name: initialData.first_name,
        last_name: initialData.last_name,
        email: initialData.email,
        password: "",
        area_id: initialData.area_id,
        permissao: initialData.permissao,
        status: initialData.status,
        cargo_funcao: initialData.cargo_funcao, // NOVO: Resetar cargo_funcao
        selected_permissions: currentUserPermissions || [],
      });
    } else {
      form.reset({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        area_id: null,
        permissao: "usuario", // Default to 'usuario' for new users
        status: "active",
        cargo_funcao: "", // NOVO: Resetar cargo_funcao
        selected_permissions: [],
      });
    }
  }, [initialData, form, currentUserPermissions]);

  const handleSubmit = (values: UserFormValues) => {
    onSubmit(values);
    if (!initialData) { // Only reset if creating a new user
      form.reset({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        area_id: null,
        permissao: "usuario",
        status: "active",
        cargo_funcao: "", // NOVO: Resetar cargo_funcao
        selected_permissions: [],
      });
    }
  };

  const groupedPermissions = React.useMemo(() => {
    if (!allPermissions) return {};
    return allPermissions.reduce((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [allPermissions]);

  const permissionResources = [
    { key: 'module', label: 'Acesso a Módulos' },
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'profile', label: 'Meu Perfil' },
    { key: 'areas', label: 'Áreas' },
    { key: 'periodos', label: 'Períodos' },
    { key: 'usuarios', label: 'Usuários' },
    { key: 'objetivos', label: 'Objetivos' },
    { key: 'key_results', label: 'Key Results' },
    { key: 'atividades', label: 'Atividades' },
    { key: 'comentarios', label: 'Comentários' },
    { key: 'comites', label: 'Comitês' },
    { key: 'comite_membros', label: 'Membros do Comitê' },
    { key: 'reunioes', label: 'Reuniões' },
    { key: 'atas_reuniao', label: 'Atas de Reunião' },
    { key: 'atividades_comite', label: 'Atividades do Comitê' },
    { key: 'enquetes', label: 'Enquetes' },
    { key: 'votos_enquete', label: 'Votação em Enquetes' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Usuário" : "Criar Novo Usuário"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sobrenome</FormLabel>
                  <FormControl>
                    <Input placeholder="Sobrenome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="email@exemplo.com" type="email" {...field} disabled={!!initialData} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!initialData && ( // Password only for new user creation
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input placeholder="********" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}
            />
            )}
            <FormField
              control={form.control}
              name="area_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Área</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma área" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingAreas ? (
                        <SelectItem value="" disabled>Carregando áreas...</SelectItem>
                      ) : (
                        <>
                          <SelectItem value="null">Nenhuma Área</SelectItem>
                          {areas?.map((area) => (
                            <SelectItem key={area.id} value={area.id}>
                              {area.nome}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cargo_funcao" // NOVO: Campo Cargo/Função
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo/Função</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Gerente de Projetos" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="permissao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permissão (Role)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma permissão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="administrador">Administrador</SelectItem>
                      <SelectItem value="diretoria">Diretoria</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="usuario">Usuário</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {initialData && ( // Status only for existing users
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um status" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="blocked">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            {/* Granular Permissions Section */}
            <h3 className="text-lg font-semibold mt-6 mb-3">Permissões Granulares</h3>
            {isLoadingPermissions || isLoadingCurrentUserPermissions ? (
              <div className="flex justify-center items-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {permissionResources.map((resource) => (
                  <div key={resource.key} className="border p-3 rounded-md">
                    <h4 className="font-medium mb-2">{resource.label}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {groupedPermissions[resource.key]?.map((perm) => {
                        const permissionKey = `${perm.resource}_${perm.action}`;
                        return (
                          <FormField
                            key={permissionKey}
                            control={form.control}
                            name="selected_permissions"
                            render={({ field }) => {
                              return (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(permissionKey)}
                                      onCheckedChange={(checked) => {
                                        const currentPermissions = field.value || [];
                                        return checked
                                          ? field.onChange([...currentPermissions, permissionKey])
                                          : field.onChange(
                                              currentPermissions.filter(
                                                (value) => value !== permissionKey
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {perm.description}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={isLoading || isLoadingAreas || isLoadingPermissions || isLoadingCurrentUserPermissions}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};