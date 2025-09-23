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
import { UserProfile, UserPermission } from "@/integrations/supabase/api/users"; // Import UserPermission
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
import { useSession } from "@/components/auth/SessionContextProvider"; // Import useSession

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
  const { userProfile: currentUserProfile } = useSession(); // Get current user's profile
  const isAdmin = currentUserProfile?.permissao === 'administrador';
  const isEditingSelf = initialData && currentUserProfile?.id === initialData.id;

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
    },
  });

  const { data: areas, isLoading: isLoadingAreas } = useQuery<Area[], Error>({
    queryKey: ["areas"],
    queryFn: getAreas,
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
      });
    }
  }, [initialData, form]);

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
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
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
                    <Input placeholder="Nome" {...field} disabled={!isAdmin && !isEditingSelf} />
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
                    <Input placeholder="Sobrenome" {...field} disabled={!isAdmin && !isEditingSelf} />
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
                    <Input placeholder="email@exemplo.com" type="email" {...field} disabled={true} /> {/* Email is never editable via this form */}
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
                      <Input placeholder="********" type="password" {...field} disabled={!isAdmin} />
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
                  <Select onValueChange={field.onChange} value={field.value || ""} disabled={!isAdmin && !isEditingSelf}>
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
              name="permissao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permissão</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!isAdmin}>
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={!isAdmin}>
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
            <DialogFooter>
              <Button type="submit" disabled={isLoading || isLoadingAreas || (!isAdmin && !isEditingSelf)}>
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