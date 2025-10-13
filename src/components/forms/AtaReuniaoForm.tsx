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
import { Input } from "@/components/ui/input"; // Import Input for time fields
import { Textarea } from "@/components/ui/textarea";
import { AtaReuniao } from "@/integrations/supabase/api/atas_reuniao";
import { Reuniao } from "@/integrations/supabase/api/reunioes"; // Import Reuniao interface
import { Loader2, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  // Campos existentes
  conteudo: z.string().min(10, {
    message: "O conteúdo da ata deve ter pelo menos 10 caracteres.",
  }).nullable(), // Tornando conteúdo opcional, já que as informações serão mais estruturadas
  decisoes_tomadas: z.string().nullable(),
  // NOVOS CAMPOS ESTRUTURADOS
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
  participantes: z.string().nullable(),
  objetivos_reuniao: z.string().nullable(),
  pauta_tratada: z.string().nullable(),
  novos_topicos: z.string().nullable(),
  pendencias: z.string().nullable(),
  proximos_passos: z.string().nullable(),
});

export type AtaReuniaoFormValues = z.infer<typeof formSchema>;

interface AtaReuniaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AtaReuniaoFormValues) => void;
  initialData?: AtaReuniao | null;
  isLoading?: boolean;
  selectedMeeting?: Reuniao | null; // NOVO: Para pré-preencher data e local
}

export const AtaReuniaoForm: React.FC<AtaReuniaoFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
  selectedMeeting, // Receber a reunião selecionada
}) => {
  const form = useForm<AtaReuniaoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      conteudo: initialData?.conteudo || "",
      decisoes_tomadas: initialData?.decisoes_tomadas || "",
      // Pré-preencher novos campos
      data_reuniao: initialData?.data_reuniao ? parseISO(initialData.data_reuniao) : (selectedMeeting?.data_reuniao ? parseISO(selectedMeeting.data_reuniao) : undefined),
      horario_inicio: initialData?.horario_inicio || (selectedMeeting?.data_reuniao ? format(parseISO(selectedMeeting.data_reuniao), "HH:mm") : ""),
      horario_fim: initialData?.horario_fim || "",
      local_reuniao: initialData?.local_reuniao || selectedMeeting?.local || "",
      participantes: initialData?.participantes || "",
      objetivos_reuniao: initialData?.objetivos_reuniao || "",
      pauta_tratada: initialData?.pauta_tratada || "",
      novos_topicos: initialData?.novos_topicos || "",
      pendencias: initialData?.pendencias || "",
      proximos_passos: initialData?.proximos_passos || "",
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        conteudo: initialData.conteudo,
        decisoes_tomadas: initialData.decisoes_tomadas,
        data_reuniao: initialData.data_reuniao ? parseISO(initialData.data_reuniao) : undefined,
        horario_inicio: initialData.horario_inicio,
        horario_fim: initialData.horario_fim,
        local_reuniao: initialData.local_reuniao,
        participantes: initialData.participantes,
        objetivos_reuniao: initialData.objetivos_reuniao,
        pauta_tratada: initialData.pauta_tratada,
        novos_topicos: initialData.novos_topicos,
        pendencias: initialData.pendencias,
        proximos_passos: initialData.proximos_passos,
      });
    } else {
      // Para nova ata, pré-preencher com dados da reunião selecionada
      form.reset({
        conteudo: "",
        decisoes_tomadas: "",
        data_reuniao: selectedMeeting?.data_reuniao ? parseISO(selectedMeeting.data_reuniao) : undefined,
        horario_inicio: selectedMeeting?.data_reuniao ? format(parseISO(selectedMeeting.data_reuniao), "HH:mm") : "",
        horario_fim: "",
        local_reuniao: selectedMeeting?.local || "",
        participantes: "",
        objetivos_reuniao: "",
        pauta_tratada: "",
        novos_topicos: "",
        pendencias: "",
        proximos_passos: "",
      });
    }
  }, [initialData, form, selectedMeeting]);

  const handleSubmit = (values: AtaReuniaoFormValues) => {
    onSubmit(values);
    if (!initialData) { // Resetar apenas se for uma nova ata
      form.reset({
        conteudo: "",
        decisoes_tomadas: "",
        data_reuniao: selectedMeeting?.data_reuniao ? parseISO(selectedMeeting.data_reuniao) : undefined,
        horario_inicio: selectedMeeting?.data_reuniao ? format(parseISO(selectedMeeting.data_reuniao), "HH:mm") : "",
        horario_fim: "",
        local_reuniao: selectedMeeting?.local || "",
        participantes: "",
        objetivos_reuniao: "",
        pauta_tratada: "",
        novos_topicos: "",
        pendencias: "",
        proximos_passos: "",
      });
    }
  };

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
            <FormField
              control={form.control}
              name="participantes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Participantes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Liste os participantes (Nome – Função)..."
                      className="min-h-[100px]"
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
            <FormField
              control={form.control}
              name="pendencias"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pendências</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Liste as pendências (Pendência | Status | Responsável)..."
                      className="min-h-[150px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              <Button type="submit" disabled={isLoading}>
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