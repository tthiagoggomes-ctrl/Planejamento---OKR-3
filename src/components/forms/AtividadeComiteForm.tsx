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
import { AtaReuniao, getAtasReuniaoByReuniaoId } from "@/integrations/supabase/api/atas_reuniao";
import { Reuniao, getReunioesByComiteId } from "@/integrations/supabase/api/reunioes";
import { Comite, getComites } from "@/integrations/supabase/api/comites";
import { UserProfile, getUsers } from "@/integrations/supabase/api/users";
import { Loader2, CalendarIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/auth/SessionContextProvider";

const formSchema = z.object({
  titulo: z.string().min(5, {
    message: "O título da atividade deve ter pelo menos 5 caracteres.",
  }),
  descricao: z.string().nullable(),
  due_date: z.date().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'stopped'], {
    message: "Selecione um status válido para a atividade.",
  }),
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
  const { user } = useSession();
  const form = useForm<AtividadeComiteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: initialData?.titulo || "",
      descricao: initialData?.descricao || "",
      due_date: initialData?.due_date ? parseISO(initialData.due_date) : null,
      status: initialData?.status || "todo",
      ata_reuniao_id: initialData?.ata_reuniao_id || preselectedAtaReuniaoId || "",
      assignee_id: initialData?.assignee_id || null,
    },
  });

  const [selectedComiteForFilter, setSelectedComiteForFilter] = React.useState<string | 'all'>(preselectedComiteId || 'all');
  const [selectedReuniaoForFilter, setSelectedReuniaoForFilter] = React.useState<string | 'all'>('all');

  const { data: comites, isLoading: isLoadingComites } = useQuery<Comite[] | null, Error>({
    queryKey: ["comites"],
    queryFn: () => getComites(),
  });

  const { data: reunioes, isLoading: isLoadingReunioes } = useQuery<Reuniao[] | null, Error>({
    queryKey: ["reunioesForAtaForm", selectedComiteForFilter],
    queryFn: () => selectedComiteForFilter !== 'all' ? getReunioesByComiteId(selectedComiteForFilter) : Promise.resolve(null),
    enabled: selectedComiteForFilter !== 'all',
  });

  const { data: atasReuniao, isLoading: isLoadingAtasReuniao } = useQuery<AtaReuniao[] | null, Error>({
    queryKey: ["atasReuniaoForAtividadeComiteForm", selectedReuniaoForFilter],
    queryFn: () => selectedReuniaoForFilter !== 'all' ? getAtasReuniaoByReuniaoId(selectedReuniaoForFilter) : Promise.resolve(null),
    enabled: selectedReuniaoForFilter !== 'all',
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery<UserProfile[] | null, Error>({
    queryKey: ["users"],
    queryFn: () => getUsers(),
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        titulo: initialData.titulo,
        descricao: initialData.descricao,
        due_date: initialData.due_date ? parseISO(initialData.due_date) : null,
        status: initialData.status,
        ata_reuniao_id: initialData.ata_reuniao_id,
        assignee_id: initialData.assignee_id,
      });
      // Set filters for existing data
      if (initialData.comite_id) setSelectedComiteForFilter(initialData.comite_id);
      // This is tricky: we don't have meeting ID directly in AtividadeComite, only ata_reuniao_id
      // We'd need to fetch the ata_reuniao to get its reuniao_id to set selectedReuniaoForFilter
      // For simplicity, we'll leave selectedReuniaoForFilter as 'all' for existing data unless explicitly passed.
    } else {
      form.reset({
        titulo: "",
        descricao: "",
        due_date: null,
        status: "todo",
        ata_reuniao_id: preselectedAtaReuniaoId || "",
        assignee_id: null,
      });
      setSelectedComiteForFilter(preselectedComiteId || 'all');
      setSelectedReuniaoForFilter('all');
    }
  }, [initialData, form, preselectedComiteId, preselectedAtaReuniaoId]);

  const formatDueDateForApi = (date: Date | null | undefined): string | null => {
    if (date instanceof Date) {
      return date.toISOString();
    }
    return null;
  };

  const handleSubmit = (values: AtividadeComiteFormValues) => {
    onSubmit(values);
    if (!initialData) {
      form.reset({
        titulo: "",
        descricao: "",
        due_date: null,
        status: "todo",
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
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
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
                    <Input placeholder="Ex: Preparar relatório mensal" {...field} />
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

            {/* Filters for Ata de Reunião */}
            {!initialData && ( // Only show filters for new activities
              <>
                <FormItem>
                  <FormLabel>Comitê</FormLabel>
                  <Select
                    value={selectedComiteForFilter}
                    onValueChange={(value: string | 'all') => {
                      setSelectedComiteForFilter(value);
                      setSelectedReuniaoForFilter('all');
                      form.setValue('ata_reuniao_id', ''); // Clear ata_reuniao_id when committee changes
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um Comitê" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Todos os Comitês</SelectItem>
                      {isLoadingComites ? (
                        <SelectItem value="" disabled>Carregando comitês...</SelectItem>
                      ) : (
                        comites?.map((comite) => (
                          <SelectItem key={comite.id} value={comite.id}>{comite.nome}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </FormItem>

                <FormItem>
                  <FormLabel>Reunião</FormLabel>
                  <Select
                    value={selectedReuniaoForFilter}
                    onValueChange={(value: string | 'all') => {
                      setSelectedReuniaoForFilter(value);
                      form.setValue('ata_reuniao_id', ''); // Clear ata_reuniao_id when meeting changes
                    }}
                    disabled={selectedComiteForFilter === 'all' || isLoadingReunioes}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma Reunião" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Todas as Reuniões</SelectItem>
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
                </FormItem>
              </>
            )}

            <FormField
              control={form.control}
              name="ata_reuniao_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ata de Reunião Associada</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={(!initialData && selectedReuniaoForFilter === 'all') || isLoadingAtasReuniao}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma Ata de Reunião" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingAtasReuniao ? (
                        <SelectItem value="" disabled>Carregando Atas...</SelectItem>
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
                        users?.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.first_name} {u.last_name} ({u.email})
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