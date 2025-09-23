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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Atividade } from "@/integrations/supabase/api/atividades";
import { KeyResult, getKeyResultsByObjetivoId } from "@/integrations/supabase/api/key_results";
import { UserProfile, getUsers } from "@/integrations/supabase/api/users";
import { Objetivo, getObjetivos } from "@/integrations/supabase/api/objetivos";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  titulo: z.string().min(5, {
    message: "O título da atividade deve ter pelo menos 5 caracteres.",
  }),
  descricao: z.string().nullable(),
  due_date: z.date().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done'], {
    message: "Selecione um status válido para a atividade.",
  }),
  key_result_id: z.string().uuid({ message: "Selecione um Key Result válido." }),
  user_id: z.string().uuid({ message: "Selecione um usuário válido." }),
});

export type AtividadeFormValues = z.infer<typeof formSchema>;

interface AtividadeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AtividadeFormValues) => void;
  initialData?: Atividade | null;
  isLoading?: boolean;
}

export const AtividadeForm: React.FC<AtividadeFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}) => {
  const form = useForm<AtividadeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: initialData?.titulo || "",
      descricao: initialData?.descricao || "",
      due_date: initialData?.due_date ? new Date(initialData.due_date) : null,
      status: initialData?.status || "todo",
      key_result_id: initialData?.key_result_id || "",
      user_id: initialData?.user_id || "",
    },
  });

  const { data: objetivos, isLoading: isLoadingObjetivos } = useQuery<Objetivo[], Error>({
    queryKey: ["objetivos"],
    queryFn: getObjetivos,
  });

  const { data: allKeyResults, isLoading: isLoadingKeyResults } = useQuery<KeyResult[], Error>({
    queryKey: ["all_key_results"],
    queryFn: async () => {
      if (!objetivos) return [];
      const krPromises = objetivos.map(obj => getKeyResultsByObjetivoId(obj.id));
      const results = await Promise.all(krPromises);
      return results.flat().filter(Boolean) as KeyResult[];
    },
    enabled: !!objetivos,
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery<UserProfile[], Error>({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        titulo: initialData.titulo,
        descricao: initialData.descricao,
        due_date: initialData.due_date ? new Date(initialData.due_date) : null,
        status: initialData.status,
        key_result_id: initialData.key_result_id,
        user_id: initialData.user_id,
      });
    } else {
      form.reset({
        titulo: "",
        descricao: "",
        due_date: null,
        status: "todo",
        key_result_id: "",
        user_id: "",
      });
    }
  }, [initialData, form]);

  const handleSubmit = (values: AtividadeFormValues) => {
    onSubmit(values);
    if (!initialData) { // Only reset if creating a new activity
      form.reset({
        titulo: "",
        descricao: "",
        due_date: null,
        status: "todo",
        key_result_id: "",
        user_id: "",
      });
    }
  };

  const activityStatuses = [
    { value: "todo", label: "A Fazer" },
    { value: "in_progress", label: "Em Progresso" },
    { value: "done", label: "Concluído" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Atividade" : "Criar Nova Atividade"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Atividade</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Pesquisar novas ferramentas de marketing" {...field} />
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
                    <Textarea placeholder="Detalhes sobre a atividade" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Vencimento (Opcional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
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
                      {activityStatuses.map((status) => (
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
            <FormField
              control={form.control}
              name="key_result_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Result Associado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um Key Result" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingKeyResults ? (
                        <SelectItem value="" disabled>Carregando Key Results...</SelectItem>
                      ) : (
                        allKeyResults?.map((kr) => (
                          <SelectItem key={kr.id} value={kr.id}>
                            {kr.titulo}
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
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingUsers ? (
                        <SelectItem value="" disabled>Carregando usuários...</SelectItem>
                      ) : (
                        users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
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
            <DialogFooter>
              <Button type="submit" disabled={isLoading || isLoadingKeyResults || isLoadingUsers}>
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