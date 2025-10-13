"use client";

import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Comite, ComiteMember } from "@/integrations/supabase/api/comites";
import { UserProfile, getUsers } from "@/integrations/supabase/api/users";
import { Loader2, PlusCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";

const memberSchema = z.object({
  user_id: z.string().uuid({ message: "Selecione um usuário válido." }),
  role: z.enum(['membro', 'presidente', 'secretario'], {
    message: "Selecione uma função válida.",
  }),
});

const formSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome do comitê deve ter pelo menos 2 caracteres.",
  }),
  descricao: z.string().nullable(),
  status: z.enum(['active', 'archived'], {
    message: "Selecione um status válido.",
  }),
  members: z.array(memberSchema).min(0, "O comitê deve ter pelo menos um membro.").optional(),
});

export type CommitteeFormValues = z.infer<typeof formSchema>;

interface CommitteeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CommitteeFormValues) => void;
  initialData?: Comite | null;
  initialMembers?: ComiteMember[] | null;
  isLoading?: boolean;
}

export const CommitteeForm: React.FC<CommitteeFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  initialMembers,
  isLoading,
}) => {
  const form = useForm<CommitteeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: initialData?.nome || "",
      descricao: initialData?.descricao || "",
      status: initialData?.status || "active",
      members: initialMembers?.map(m => ({ user_id: m.user_id, role: m.role })) || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "members",
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery<UserProfile[] | null, Error>({
    queryKey: ["users"],
    queryFn: () => getUsers(),
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        nome: initialData.nome,
        descricao: initialData.descricao,
        status: initialData.status,
        members: initialMembers?.map(m => ({ user_id: m.user_id, role: m.role })) || [],
      });
    } else {
      form.reset({
        nome: "",
        descricao: "",
        status: "active",
        members: [],
      });
    }
  }, [initialData, initialMembers, form]);

  const handleSubmit = (values: CommitteeFormValues) => {
    onSubmit(values);
    if (!initialData) { // Only reset if creating a new committee
      form.reset({
        nome: "",
        descricao: "",
        status: "active",
        members: [],
      });
    }
  };

  const statusOptions = [
    { value: "active", label: "Ativo" },
    { value: "archived", label: "Arquivado" },
  ];

  const roleOptions = [
    { value: "membro", label: "Membro" },
    { value: "presidente", label: "Presidente" },
    { value: "secretario", label: "Secretário" },
  ];

  const availableUsers = users?.filter(
    (user) => !fields.some((member) => member.user_id === user.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Comitê" : "Criar Novo Comitê"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Comitê</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Comitê de Gestão de Sistemas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalhes sobre o comitê" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4" />
            <h3 className="text-lg font-semibold mb-3">Membros do Comitê</h3>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2 p-2 border rounded-md">
                  <FormField
                    control={form.control}
                    name={`members.${index}.user_id`}
                    render={({ field: memberField }) => (
                      <FormItem className="flex-1">
                        <Select onValueChange={memberField.onChange} value={memberField.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um membro" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingUsers ? (
                              <SelectItem value="" disabled>Carregando usuários...</SelectItem>
                            ) : (
                              users?.map((user) => (
                                <SelectItem
                                  key={user.id}
                                  value={user.id}
                                  disabled={fields.some((m, i) => i !== index && m.user_id === user.id)}
                                >
                                  {user.first_name} {user.last_name} ({user.email})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`members.${index}.role`}
                    render={({ field: roleField }) => (
                      <FormItem className="w-[150px]">
                        <Select onValueChange={roleField.onChange} value={roleField.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Função" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roleOptions.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                  >
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="sr-only">Remover Membro</span>
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ user_id: "", role: "membro" })}
                disabled={isLoadingUsers || (availableUsers && availableUsers.length === 0)}
                className="w-full"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Membro
              </Button>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading || isLoadingUsers}>
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