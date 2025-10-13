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
import { Reuniao } from "@/integrations/supabase/api/reunioes";
import { Loader2, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays } from "date-fns"; // NEW: addDays for default recurrence end date
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Select, // NEW
  SelectContent, // NEW
  SelectItem, // NEW
  SelectTrigger, // NEW
  SelectValue, // NEW
} from "@/components/ui/select"; // NEW

const formSchema = z.object({
  titulo: z.string().min(5, {
    message: "O título da reunião deve ter pelo menos 5 caracteres.",
  }),
  data_reuniao: z.date({
    required_error: "A data da reunião é obrigatória.",
  }),
  local: z.string().nullable(),
  recurrence_type: z.enum(['none', 'weekly', 'bi_weekly', 'monthly'], { // NEW
    message: "Selecione um tipo de recorrência válido.",
  }).default('none'),
  recurrence_end_date: z.date().nullable().optional(), // NEW
}).refine((data) => {
  if (data.recurrence_type !== 'none' && !data.recurrence_end_date) {
    return false; // Recurrence end date is required for recurring meetings
  }
  if (data.recurrence_type !== 'none' && data.recurrence_end_date && data.recurrence_end_date < data.data_reuniao) {
    return false; // Recurrence end date cannot be before start date
  }
  return true;
}, {
  message: "A data de término da recorrência é obrigatória e não pode ser anterior à data de início da reunião para reuniões recorrentes.",
  path: ["recurrence_end_date"],
});

export type ReuniaoFormValues = z.infer<typeof formSchema>;

interface ReuniaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ReuniaoFormValues) => void;
  initialData?: Reuniao | null;
  isLoading?: boolean;
}

export const ReuniaoForm: React.FC<ReuniaoFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}) => {
  const form = useForm<ReuniaoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: initialData?.titulo || "",
      data_reuniao: initialData?.data_reuniao ? new Date(initialData.data_reuniao) : undefined,
      local: initialData?.local || "",
      // Recurrence fields should only be set if it's a new meeting or if initialData is not present
      recurrence_type: initialData ? "none" : "none", // Default to none for new, or keep none for edit
      recurrence_end_date: initialData ? undefined : undefined, // Clear for edit, or keep undefined for new
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        titulo: initialData.titulo,
        data_reuniao: new Date(initialData.data_reuniao),
        local: initialData.local,
        // When editing, we don't want to show or allow changing recurrence, so reset to default/none
        recurrence_type: "none",
        recurrence_end_date: undefined,
      });
    } else {
      form.reset({
        titulo: "",
        data_reuniao: undefined,
        local: "",
        recurrence_type: "none",
        recurrence_end_date: undefined,
      });
    }
  }, [initialData, form]);

  const selectedRecurrenceType = form.watch('recurrence_type'); // NEW

  const handleSubmit = (values: ReuniaoFormValues) => {
    onSubmit(values);
    if (!initialData) { // Only reset if creating a new meeting
      form.reset({
        titulo: "",
        data_reuniao: undefined,
        local: "",
        recurrence_type: "none", // NEW
        recurrence_end_date: undefined, // NEW
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Reunião" : "Agendar Nova Reunião"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Reunião</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Reunião Semanal de Alinhamento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="data_reuniao"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data e Hora da Reunião</FormLabel>
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
                            format(field.value, "PPP 'às' HH:mm", { locale: ptBR })
                          ) : (
                            <span>Selecione uma data e hora</span>
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
                      <div className="p-3 border-t border-border">
                        <Input
                          type="time"
                          value={field.value ? format(field.value, "HH:mm") : ""}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':').map(Number);
                            const newDate = field.value || new Date();
                            newDate.setHours(hours, minutes);
                            field.onChange(newDate);
                          }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="local"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Sala 101, Google Meet" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* NEW: Recurrence Type Field - Only visible for new meetings */}
            {!initialData && (
              <FormField
                control={form.control}
                name="recurrence_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Recorrência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de recorrência" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="bi_weekly">Quinzenal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* NEW: Recurrence End Date Field (conditional) - Only visible for new meetings and if recurrence type is not 'none' */}
            {!initialData && selectedRecurrenceType !== 'none' && (
              <FormField
                control={form.control}
                name="recurrence_end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Término da Recorrência</FormLabel>
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
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                          locale={ptBR}
                          disabled={(date) => date < addDays(new Date(), -1)} // Disable past dates
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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