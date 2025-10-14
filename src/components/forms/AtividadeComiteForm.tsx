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
import { AtividadeComite } from "@/integrations/supabase/api/atividades_comite";
import { getComites, Comite } from "@/integrations/supabase/api/comites";
import { getReunioes, Reuniao } from "@/integrations/supabase/api/reunioes";
import { getAtasReuniaoByReuniaoId, AtaReuniao } from "@/integrations/supabase/api/atas_reuniao";
import { UserProfile, getUsers } from "@/integrations/supabase/api/users";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client'; // NOVO: Importar supabase

// Adicione esta interface em algum lugar no topo do arquivo, por exemplo, antes de formSchema
interface AtaWithReuniaoAndComiteData {
  id: string;
  reuniao_id: string;
  reuniao: Array<{ // <--- Alterado para Array
    id: string;
    comite_id: string;
  }> | null; // 'reuniao' pode ser null se a relação não for encontrada
}

const formSchema = z.object({
  titulo: z.string().min(5, {
    message: "O título da atividade deve ter pelo menos 5 caracteres.",
  }),
  descricao: z.string().nullable(),
  due_date: z.date().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'stopped'], {
    message: "Selecione um status válido para a atividade.",
  }),
  comite_id: z.string().uuid({ message: "Selecione um Comitê válido." }),
  reuniao_id: z.string().uuid({ message: "Selecione uma Reunião válida." }),
  ata_reuniao_id: z.string().uuid({ message: "Selecione uma Ata de Reunião válida." }),
  assignee_id: z.string().uuid({ message: "Selecione um responsável válido." }).nullable(),
});

export type AtividadeComiteFormValues = z.infer<typeof formSchema>;

interface AtividadeComiteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AtividadeComiteFormValues) => void;
  initialData?: AtividadeComite | null;
  isLoading?: boolean;
  preselectedComiteId?: string | null;
  preselectedAtaReuniaoId?: string | null;
}

export const AtividadeComiteForm: React.FC<AtividadeComiteFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
  preselectedComiteId = null,
  preselectedAtaReuniaoId = null,
}) => {
  const form = useForm<AtividadeComiteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: initialData?.titulo || "",
      descricao: initialData?.descricao || "",
      due_date: initialData?.due_date ? parseISO(initialData.due_date) : null,
      status: initialData?.status || "todo",
      comite_id: initialData?.ata_reuniao_id ? "" : preselectedComiteId || "", // Will be set by effect
      reuniao_id: initialData?.ata_reuniao_id ? "" : "", // Will be set by effect
      ata_reuniao_id: initialData?.ata_reuniao_id || preselectedAtaReuniaoId || "",
      assignee_id: initialData?.assignee_id || null,
    },
  });

  const selectedComiteId = form.watch('comite_id');
  const selectedReuniaoId = form.watch('reuniao_id');
  // const selectedAtaReuniaoId = form.watch('ata_reuniao_id'); // This is not used directly for fetching, but for form state

  const { data: comites, isLoading: isLoadingComites } = useQuery<Comite[] | null, Error>({
    queryKey: ["comites"],
    queryFn: async () => (await getComites()) || [],
  });

  const { data: reunioes, isLoading: isLoadingReunioes } = useQuery<Reuniao[] | null, Error>({
    queryKey: ["reunioesForForm", selectedComiteId],
    queryFn: async () => selectedComiteId ? (await getReunioes({ comite_id: selectedComiteId })) || [] : [],
    enabled: !!selectedComiteId,
  });

  const { data: atasReuniao, isLoading: isLoadingAtasReuniao } = useQuery<AtaReuniao[] | null, Error>({
    queryKey: ["atasReuniaoForForm", selectedReuniaoId],
    queryFn: async () => selectedReuniaoId ? (await getAtasReuniaoByReuniaoId(selectedReuniaoId)) || [] : [],
    enabled: !!selectedReuniaoId,
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery<UserProfile[] | null, Error>({
    queryKey: ["users"],
    queryFn: async () => (await getUsers()) || [],
  });

  // Effect to set initial values for Comite and Reuniao if editing or preselectedAtaReuniaoId is present
  React.useEffect(() => {
    const setInitialDropdowns = async () => {
      if (initialData?.ata_reuniao_id) {
        const { data: ata } = await supabase
          .from('atas_reuniao')
          .select('id, reuniao_id, reuniao:reunioes(id, comite_id)')
          .eq('id', initialData.ata_reuniao_id)
          .single<AtaWithReuniaoAndComiteData>();

        if (ata && ata.reuniao && ata.reuniao.length > 0) { // Corrected access
          form.setValue('comite_id', ata.reuniao[0].comite_id); // Corrected access
          form.setValue('reuniao_id', ata.reuniao_id);
          form.setValue('ata_reuniao_id', initialData.ata_reuniao_id);
        }
      } else if (preselectedAtaReuniaoId) {
        const { data: ata } = await supabase
          .from('atas_reuniao')
          .select('id, reuniao_id, reuniao:reunioes(id, comite_id)')
          .eq('id', preselectedAtaReuniaoId)
          .single<AtaWithReuniaoAndComiteData>();

        if (ata && ata.reuniao && ata.reuniao.length > 0) { // Corrected access
          form.setValue('comite_id', ata.reuniao[0].comite_id); // Corrected access
          form.setValue('reuniao_id', ata.reuniao_id);
          form.setValue('ata_reuniao_id', preselectedAtaReuniaoId);
        }
      } else if (preselectedComiteId) {
        form.setValue('comite_id', preselectedComiteId);
      }
    };

    setInitialDropdowns();
  }, [initialData, preselectedComiteId, preselectedAtaReuniaoId, form]);


  React.useEffect(() => {
    if (initialData) {
      form.reset({
        titulo: initialData.titulo,
        descricao: initialData.descricao,
        due_date: initialData.due_date ? parseISO(initialData.due_date) : null,
        status: initialData.status,
        ata_reuniao_id: initialData.ata_reuniao_id,
        assignee_id: initialData.assignee_id,
        // comite_id and reuniao_id are handled by the effect above
      });
    } else {
      form.reset({
        titulo: "",
        descricao: "",
        due_date: null,
        status: "todo",
        comite_id: preselectedComiteId || "",
        reuniao_id: "",
        ata_reuniao_id: preselectedAtaReuniaoId || "",
        assignee_id: null,
      });
    }
  }, [initialData, form, preselectedComiteId, preselectedAtaReuniaoId]);

  const handleSubmit = (values: AtividadeComiteFormValues) => {
    onSubmit(values);
    if (!initialData) {
      form.reset({
        titulo: "",
        descricao: "",
        due_date: null,
        status: "todo",
        comite_id: preselectedComiteId || "",
        reuniao_id: "",
        ata_reuniao_id: preselectedAtaReuniaoId || "",
        assignee_id: null,
      });
    }
  };

  const activityStatuses = [
    { value: "todo", label: "A Fazer" },
    { value: "in_progress", label: "Em Progresso" },
    { value: "done", label: "Concluído" },
    { value: "stopped", label: "Parado" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Atividade do Comitê" : "Criar Nova Atividade do Comitê"}</DialogTitle>
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
                    <Input placeholder="Ex: Preparar pauta da próxima reunião" {...field} />
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
              name="comite_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comitê</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!initialData || !!preselectedComiteId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um Comitê" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingComites ? (
                        <SelectItem value="" disabled>Carregando comitês...</SelectItem>
                      ) : (
                        comites?.map((comite) => (
                          <SelectItem key={comite.id} value={comite.id}>
                            {comite.nome}
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
              name="reuniao_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reunião</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedComiteId || !!initialData}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma Reunião" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingReunioes ? (
                        <SelectItem value="" disabled>Carregando reuniões...</SelectItem>
                      ) : (
                        reunioes?.map((reuniao) => (
                          <SelectItem key={reuniao.id} value={reuniao.id}>
                            {reuniao.titulo} ({format(parseISO(reuniao.data_reuniao), "PPP")})
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
              name="ata_reuniao_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ata de Reunião</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedReuniaoId || !!initialData || !!preselectedAtaReuniaoId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma Ata de Reunião" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingAtasReuniao ? (
                        <SelectItem value="" disabled>Carregando atas...</SelectItem>
                      ) : (
                        atasReuniao?.map((ata) => (
                          <SelectItem key={ata.id} value={ata.id}>
                            Ata de {ata.data_reuniao ? format(parseISO(ata.data_reuniao), "PPP") : format(parseISO(ata.created_at!), "PPP")}
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
              name="assignee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="null">Nenhum Responsável</SelectItem>
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
              <Button type="submit" disabled={isLoading || isLoadingComites || isLoadingReunioes || isLoadingAtasReuniao || isLoadingUsers}>
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