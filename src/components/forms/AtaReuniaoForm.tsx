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
import { AtaReuniao } from "@/integrations/supabase/api/atas_reuniao";
import { Reuniao } from "@/integrations/supabase/api/reunioes";
import { Loader2, CalendarIcon, PlusCircle, XCircle, Check, ChevronDown } from "lucide-react"; // Import ChevronDown
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { getUsers, UserProfile } from "@/integrations/supabase/api/users";
import { getComiteMembers, ComiteMember } from "@/integrations/supabase/api/comites";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";

// Helper function to parse structured participants string
const parseParticipants = (participantsString: string | null, allUsers: UserProfile[] | null): { selectedMembers: string[]; guestParticipantsText: string } => {
  if (!participantsString) return { selectedMembers: [], guestParticipantsText: "" };

  const lines = participantsString.split('\n').map(line => line.trim()).filter(Boolean);
  const selectedMembers: string[] = [];
  const guestParticipants: string[] = [];

  lines.forEach(line => {
    // Try to match by full name first, then by first name if role is present
    const userMatch = allUsers?.find(u => {
      const fullName = `${u.first_name} ${u.last_name}`;
      return line.includes(fullName) || line.split('–')[0].trim() === fullName;
    });
    if (userMatch) {
      selectedMembers.push(userMatch.id);
    } else {
      guestParticipants.push(line);
    }
  });

  return { selectedMembers, guestParticipantsText: guestParticipants.join('\n') };
};

// Helper function to format structured participants for DB
const formatParticipants = (selectedMemberIds: string[], guestParticipantsText: string | null, allUsers: UserProfile[] | null): string => {
  const formattedMembers = selectedMemberIds.map(id => {
    const user = allUsers?.find(u => u.id === id);
    // Find the role from committeeMembers if available, otherwise use user.permissao
    // This is a simplification, ideally committeeMembers should be passed here
    return user ? `${user.first_name} ${user.last_name} – ${user.permissao}` : '';
  }).filter(Boolean);

  const formattedGuests = guestParticipantsText?.split('\n').map(line => line.trim()).filter(Boolean) || [];

  return [...formattedMembers, ...formattedGuests].join('\n');
};

// Helper function to parse structured pendencias string
const parsePendencias = (pendenciasString: string | null, allUsers: UserProfile[] | null): { activity_name: string; status: 'Pendente' | 'Em andamento' | 'Concluído'; assignee_id: string; due_date: Date | null }[] => {
  if (!pendenciasString) return [];

  const lines = pendenciasString.split('\n').map(line => line.trim()).filter(Boolean);
  const structuredPendencias: { activity_name: string; status: 'Pendente' | 'Em andamento' | 'Concluído'; assignee_id: string; due_date: Date | null }[] = [];

  lines.forEach(line => {
    // Example format: Analisar processo de cadastro de pessoas físicas | Pendente | Thiago Gomes | 10/10/2025
    const parts = line.split(' | ').map(p => p.trim());
    if (parts.length >= 3) {
      const activity_name = parts[0];
      const status = parts[1] as 'Pendente' | 'Em andamento' | 'Concluído'; // Cast to valid status
      const assigneeName = parts[2];
      const dueDateString = parts[3];

      const assignee = allUsers?.find(u => `${u.first_name} ${u.last_name}`.includes(assigneeName));
      const due_date = dueDateString && isValid(parseISO(dueDateString)) ? parseISO(dueDateString) : null;

      structuredPendencias.push({
        activity_name,
        status,
        assignee_id: assignee?.id || "",
        due_date,
      });
    }
  });
  return structuredPendencias;
};

// Helper function to format structured pendencias for DB
const formatPendencias = (structuredPendencias: { activity_name?: string; status?: 'Pendente' | 'Em andamento' | 'Concluído'; assignee_id?: string; due_date?: Date | null }[], allUsers: UserProfile[] | null): string => {
  return structuredPendencias.map(p => {
    const assignee = allUsers?.find(u => u.id === p.assignee_id);
    const assigneeName = assignee ? `${assignee.first_name} ${assignee.last_name}` : 'N/A';
    const dueDateFormatted = p.due_date ? format(p.due_date, 'dd/MM/yyyy', { locale: ptBR }) : 'N/A';
    return `${p.activity_name || ''} | ${p.status || 'Pendente'} | ${assigneeName} | ${dueDateFormatted}`;
  }).join('\n');
};


const formSchema = z.object({
  conteudo: z.string().nullable(),
  decisoes_tomadas: z.string().nullable(),
  data_reuniao: z.date({
    required_error: "A data da reunião é obrigatória.",
  }),
  horario_inicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Formato de hora inválido (HH:mm).",
  }).nullable(),
  horario_fim: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Formato de hora inválido (HH:mm).",
  }).nullable(),
  local_reuniao: z.string().nullable(),
  
  // Structured fields for participants
  selected_committee_members: z.array(z.string().uuid()).optional(),
  guest_participants_text: z.string().nullable(),

  objetivos_reuniao: z.string().nullable(),
  pauta_tratada: z.string().nullable(),
  novos_topicos: z.string().nullable(),
  
  // Structured field for pendencias
  structured_pendencias: z.array(z.object({
    activity_name: z.string().min(1, "O nome da atividade é obrigatório."),
    status: z.enum(['Pendente', 'Em andamento', 'Concluído'], { message: "Selecione um status válido." }),
    assignee_id: z.string().uuid({ message: "Selecione um responsável válido." }),
    due_date: z.date().nullable().optional(),
  })).optional(),

  proximos_passos: z.string().nullable(),
});

export type AtaReuniaoFormValues = z.infer<typeof formSchema>;

// New type for values submitted to the API
export type AtaReuniaoSubmitValues = {
  conteudo: string | null;
  decisoes_tomadas: string | null;
  data_reuniao: string | null; // ISO date string
  horario_inicio: string | null;
  horario_fim: string | null;
  local_reuniao: string | null;
  participantes: string | null; // Formatted string
  objetivos_reuniao: string | null;
  pauta_tratada: string | null;
  novos_topicos: string | null;
  pendencias: string | null; // Formatted string
  proximos_passos: string | null;
};

interface AtaReuniaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AtaReuniaoSubmitValues) => void; // Use new submit type
  initialData?: AtaReuniao | null;
  isLoading?: boolean;
  selectedMeeting?: Reuniao | null;
}

export const AtaReuniaoForm: React.FC<AtaReuniaoFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
  selectedMeeting,
}) => {
  const form = useForm<AtaReuniaoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      conteudo: initialData?.conteudo || "",
      decisoes_tomadas: initialData?.decisoes_tomadas || "",
      data_reuniao: initialData?.data_reuniao ? parseISO(initialData.data_reuniao) : (selectedMeeting?.data_reuniao ? parseISO(selectedMeeting.data_reuniao) : undefined),
      horario_inicio: initialData?.horario_inicio || (selectedMeeting?.data_reuniao ? format(parseISO(selectedMeeting.data_reuniao), "HH:mm") : ""),
      horario_fim: initialData?.horario_fim || "",
      local_reuniao: initialData?.local_reuniao || selectedMeeting?.local || "",
      
      selected_committee_members: [],
      guest_participants_text: "",

      objetivos_reuniao: initialData?.objetivos_reuniao || "",
      pauta_tratada: initialData?.pauta_tratada || "",
      novos_topicos: initialData?.novos_topicos || "",
      
      structured_pendencias: [],

      proximos_passos: initialData?.proximos_passos || "",
    },
  });

  const { fields: pendenciaFields, append: appendPendencia, remove: removePendencia } = useFieldArray({
    control: form.control,
    name: "structured_pendencias",
  });

  const { data: allUsers, isLoading: isLoadingAllUsers } = useQuery<UserProfile[] | null, Error>({
    queryKey: ["allUsers"],
    queryFn: () => getUsers(),
  });

  const { data: committeeMembers, isLoading: isLoadingCommitteeMembers } = useQuery<ComiteMember[] | null, Error>({
    queryKey: ["committeeMembers", selectedMeeting?.comite_id],
    queryFn: () => selectedMeeting?.comite_id ? getComiteMembers(selectedMeeting.comite_id) : Promise.resolve(null),
    enabled: !!selectedMeeting?.comite_id,
  });

  React.useEffect(() => {
    if (initialData) {
      const { selectedMembers, guestParticipantsText } = parseParticipants(initialData.participantes, allUsers);
      const structuredPendencias = parsePendencias(initialData.pendencias, allUsers);

      form.reset({
        conteudo: initialData.conteudo,
        decisoes_tomadas: initialData.decisoes_tomadas,
        data_reuniao: initialData.data_reuniao ? parseISO(initialData.data_reuniao) : undefined,
        horario_inicio: initialData.horario_inicio,
        horario_fim: initialData.horario_fim,
        local_reuniao: initialData.local_reuniao,
        selected_committee_members: selectedMembers,
        guest_participants_text: guestParticipantsText,
        objetivos_reuniao: initialData.objetivos_reuniao,
        pauta_tratada: initialData.pauta_tratada,
        novos_topicos: initialData.novos_topicos,
        structured_pendencias: structuredPendencias,
        proximos_passos: initialData.proximos_passos,
      });
    } else {
      form.reset({
        conteudo: "",
        decisoes_tomadas: "",
        data_reuniao: selectedMeeting?.data_reuniao ? parseISO(selectedMeeting.data_reuniao) : undefined,
        horario_inicio: selectedMeeting?.data_reuniao ? format(parseISO(selectedMeeting.data_reuniao), "HH:mm") : "",
        horario_fim: "",
        local_reuniao: selectedMeeting?.local || "",
        selected_committee_members: committeeMembers?.map(m => m.user_id) || [], // Pre-select all committee members
        guest_participants_text: "",
        objetivos_reuniao: "",
        pauta_tratada: "",
        novos_topicos: "",
        structured_pendencias: [],
        proximos_passos: "",
      });
    }
  }, [initialData, form, selectedMeeting, allUsers, committeeMembers]);

  const handleSubmit = (values: AtaReuniaoFormValues) => {
    const formattedParticipants = formatParticipants(values.selected_committee_members || [], values.guest_participants_text, allUsers);
    const formattedPendencias = formatPendencias(values.structured_pendencias || [], allUsers);

    const submitValues: AtaReuniaoSubmitValues = {
      conteudo: values.conteudo,
      decisoes_tomadas: values.decisoes_tomadas,
      data_reuniao: values.data_reuniao ? values.data_reuniao.toISOString() : null,
      horario_inicio: values.horario_inicio,
      horario_fim: values.horario_fim,
      local_reuniao: values.local_reuniao,
      participantes: formattedParticipants,
      objetivos_reuniao: values.objetivos_reuniao,
      pauta_tratada: values.pauta_tratada,
      novos_topicos: values.novos_topicos,
      pendencias: formattedPendencias,
      proximos_passos: values.proximos_passos,
    };
    onSubmit(submitValues);
    if (!initialData) {
      form.reset({
        conteudo: "",
        decisoes_tomadas: "",
        data_reuniao: selectedMeeting?.data_reuniao ? parseISO(selectedMeeting.data_reuniao) : undefined,
        horario_inicio: selectedMeeting?.data_reuniao ? format(parseISO(selectedMeeting.data_reuniao), "HH:mm") : "",
        horario_fim: "",
        local_reuniao: selectedMeeting?.local || "",
        selected_committee_members: committeeMembers?.map(m => m.user_id) || [],
        guest_participants_text: "",
        objetivos_reuniao: "",
        pauta_tratada: "",
        novos_topicos: "",
        structured_pendencias: [],
        proximos_passos: "",
      });
    }
  };

  const statusOptions = [
    { value: "Pendente", label: "Pendente" },
    { value: "Em andamento", label: "Em andamento" },
    { value: "Concluído", label: "Concluído" },
  ];

  const availableUsersForAssignee = allUsers?.map(u => ({
    id: u.id,
    name: `${u.first_name} ${u.last_name}`,
  })) || [];

  const committeeMembersForSelection = committeeMembers?.map(m => {
    const user = allUsers?.find(u => u.id === m.user_id);
    return user ? { id: user.id, name: `${user.first_name} ${user.last_name} (${m.role})` } : null;
  }).filter(Boolean) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Ata de Reunião" : "Criar Nova Ata de Reunião"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Data, Horário, Local */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="data_reuniao"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data</FormLabel>
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
                              format(field.value, "PPP", { locale: ptBR })
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
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="horario_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="horario_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Término</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="local_reuniao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Sala de reunião da FADE-UFPE e Remoto" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4" />

            {/* Participantes */}
            <h3 className="text-lg font-semibold mb-3">Participantes</h3>
            <FormField
              control={form.control}
              name="selected_committee_members"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Membros do Comitê</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value?.length && "text-muted-foreground"
                          )}
                        >
                          {field.value && field.value.length > 0
                            ? `${field.value.length} selecionado(s)`
                            : "Selecione os membros..."}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar membro..." />
                        <CommandList>
                          <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                          <CommandGroup>
                            {isLoadingAllUsers || isLoadingCommitteeMembers ? (
                              <CommandItem disabled>Carregando membros...</CommandItem>
                            ) : (
                              committeeMembersForSelection.map((member) => (
                                <CommandItem
                                  key={member.id}
                                  value={member.name}
                                  onSelect={() => {
                                    const currentMembers = field.value || [];
                                    const newMembers = currentMembers.includes(member.id)
                                      ? currentMembers.filter((id) => id !== member.id)
                                      : [...currentMembers, member.id];
                                    field.onChange(newMembers);
                                  }}
                                >
                                  <Checkbox
                                    checked={field.value?.includes(member.id)}
                                    onCheckedChange={(checked) => {
                                      const currentMembers = field.value || [];
                                      const newMembers = checked
                                        ? [...currentMembers, member.id]
                                        : currentMembers.filter((id) => id !== member.id);
                                      field.onChange(newMembers);
                                    }}
                                    className="mr-2"
                                  />
                                  {member.name}
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      field.value?.includes(member.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              ))
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="guest_participants_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Convidados (um por linha)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Liste os convidados (um por linha)..."
                      className="min-h-[80px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Objetivos da Reunião */}
            <FormField
              control={form.control}
              name="objetivos_reuniao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivos da Reunião</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva os objetivos da reunião..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pauta Tratada */}
            <FormField
              control={form.control}
              name="pauta_tratada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pauta Tratada</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhe os itens da pauta que foram discutidos..."
                      className="min-h-[150px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Novos Tópicos */}
            <FormField
              control={form.control}
              name="novos_topicos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Novos Tópicos</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Liste novos tópicos levantados na reunião..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pendências */}
            <Separator className="my-4" />
            <h3 className="text-lg font-semibold mb-3">Pendências</h3>
            <div className="space-y-3">
              {pendenciaFields.map((field, index) => (
                <div key={field.id} className="flex flex-col gap-2 p-3 border rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name={`structured_pendencias.${index}.activity_name`}
                      render={({ field: activityField }) => (
                        <FormItem>
                          <FormLabel>Atividade</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome da atividade" {...activityField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`structured_pendencias.${index}.status`}
                      render={({ field: statusField }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={statusField.onChange} value={statusField.value}>
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
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name={`structured_pendencias.${index}.assignee_id`}
                      render={({ field: assigneeField }) => (
                        <FormItem>
                          <FormLabel>Responsável</FormLabel>
                          <Select onValueChange={assigneeField.onChange} value={assigneeField.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o responsável" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingAllUsers ? (
                                <SelectItem value="" disabled>Carregando usuários...</SelectItem>
                              ) : (
                                availableUsersForAssignee.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name}
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
                      name={`structured_pendencias.${index}.due_date`}
                      render={({ field: dateField }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data de Conclusão (Opcional)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !dateField.value && "text-muted-foreground"
                                  )}
                                >
                                  {dateField.value ? (
                                    format(dateField.value, "PPP", { locale: ptBR })
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
                                selected={dateField.value || undefined}
                                onSelect={dateField.onChange}
                                initialFocus
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePendencia(index)}
                    className="self-end text-red-500 hover:text-red-700"
                  >
                    <XCircle className="h-4 w-4" />
                    <span className="sr-only">Remover Pendência</span>
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => appendPendencia({ activity_name: "", status: "Pendente", assignee_id: "", due_date: null })}
                className="w-full"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Pendência
              </Button>
            </div>

            {/* Próximos Passos */}
            <FormField
              control={form.control}
              name="proximos_passos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Próximos Passos</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva as próximas ações e responsáveis..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conteúdo e Decisões Tomadas (mantidos, mas podem ser menos usados) */}
            <Separator className="my-4" />
            <FormField
              control={form.control}
              name="conteudo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo Geral (Opcional, para informações não estruturadas)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva outros pontos discutidos na reunião..."
                      className="min-h-[150px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="decisoes_tomadas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decisões Tomadas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Liste as decisões importantes tomadas..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isLoading || isLoadingAllUsers || isLoadingCommitteeMembers}>
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