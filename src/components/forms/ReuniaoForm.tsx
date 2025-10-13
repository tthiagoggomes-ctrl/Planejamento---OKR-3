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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  titulo: z.string().min(5, {
    message: "O título da reunião deve ter pelo menos 5 caracteres.",
  }),
  data_reuniao: z.date({
    required_error: "A data da reunião é obrigatória.",
  }),
  local: z.string().nullable(),
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
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        titulo: initialData.titulo,
        data_reuniao: new Date(initialData.data_reuniao),
        local: initialData.local,
      });
    } else {
      form.reset({
        titulo: "",
        data_reuniao: undefined,
        local: "",
      });
    }
  }, [initialData, form]);

  const handleSubmit = (values: ReuniaoFormValues) => {
    onSubmit(values);
    if (!initialData) { // Only reset if creating a new meeting
      form.reset({
        titulo: "",
        data_reuniao: undefined,
        local: "",
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