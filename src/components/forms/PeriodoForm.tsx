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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Periodo, PeriodoStatus } from "@/integrations/supabase/api/periodos";
import { Loader2, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Helper function to format date string as DD/MM/YYYY
const formatInputDate = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, ''); // Remove non-digits
  let formatted = '';

  if (digitsOnly.length > 0) {
    formatted += digitsOnly.substring(0, 2); // DD
    if (digitsOnly.length > 2) {
      formatted += '/' + digitsOnly.substring(2, 4); // MM
      if (digitsOnly.length > 4) {
        formatted += '/' + digitsOnly.substring(4, 8); // YYYY
      }
    }
  }
  return formatted.substring(0, 10); // Limit to DD/MM/YYYY length
};

const formSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome do período deve ter pelo menos 2 caracteres.",
  }),
  start_date: z.date({
    required_error: "A data de início é obrigatória.",
  }),
  end_date: z.date({
    required_error: "A data de término é obrigatória.",
  }),
  status: z.enum(['active', 'archived'], {
    message: "Selecione um status válido.",
  }),
}).refine((data) => data.end_date >= data.start_date, {
  message: "A data de término não pode ser anterior à data de início.",
  path: ["end_date"],
});

export type PeriodoFormValues = z.infer<typeof formSchema>;

interface PeriodoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PeriodoFormValues) => void;
  initialData?: Periodo | null;
  isLoading?: boolean;
}

export const PeriodoForm: React.FC<PeriodoFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}) => {
  const form = useForm<PeriodoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: initialData?.nome || "",
      start_date: initialData?.start_date ? new Date(initialData.start_date) : undefined,
      end_date: initialData?.end_date ? new Date(initialData.end_date) : undefined,
      status: initialData?.status || "active",
    },
  });

  const [startDateString, setStartDateString] = React.useState<string>("");
  const [endDateString, setEndDateString] = React.useState<string>("");

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        nome: initialData.nome,
        start_date: new Date(initialData.start_date),
        end_date: new Date(initialData.end_date),
        status: initialData.status,
      });
      setStartDateString(format(new Date(initialData.start_date), "dd/MM/yyyy", { locale: ptBR }));
      setEndDateString(format(new Date(initialData.end_date), "dd/MM/yyyy", { locale: ptBR }));
    } else {
      form.reset({
        nome: "",
        start_date: undefined,
        end_date: undefined,
        status: "active",
      });
      setStartDateString("");
      setEndDateString("");
    }
  }, [initialData, form]);

  const handleSubmit = (values: PeriodoFormValues) => {
    onSubmit(values);
    if (!initialData) { // Only reset if creating a new period
      form.reset({
        nome: "",
        start_date: undefined,
        end_date: undefined,
        status: "active",
      });
      setStartDateString("");
      setEndDateString("");
    }
  };

  const statusOptions = [
    { value: "active", label: "Ativo" },
    { value: "archived", label: "Arquivado" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Período" : "Criar Novo Período"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Período</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Q1 2024, Anual 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Início</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="text"
                            value={startDateString}
                            onChange={(e) => {
                              const formatted = formatInputDate(e.target.value);
                              setStartDateString(formatted);
                              const parsedDate = parse(formatted, "dd/MM/yyyy", new Date(), { locale: ptBR });
                              field.onChange(isValid(parsedDate) ? parsedDate : undefined);
                            }}
                            placeholder="DD/MM/AAAA"
                            className={cn(
                              "w-full pl-3 text-left font-normal pr-10",
                              !field.value && "text-muted-foreground"
                            )}
                          />
                          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 cursor-pointer" />
                        </div>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setStartDateString(date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "");
                        }}
                        initialFocus
                        locale={ptBR}
                        fixedWeeks={true}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Término</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="text"
                            value={endDateString}
                            onChange={(e) => {
                              const formatted = formatInputDate(e.target.value);
                              setEndDateString(formatted);
                              const parsedDate = parse(formatted, "dd/MM/yyyy", new Date(), { locale: ptBR });
                              field.onChange(isValid(parsedDate) ? parsedDate : undefined);
                            }}
                            placeholder="DD/MM/AAAA"
                            className={cn(
                              "w-full pl-3 text-left font-normal pr-10",
                              !field.value && "text-muted-foreground"
                            )}
                          />
                          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 cursor-pointer" />
                        </div>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setEndDateString(date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "");
                        }}
                        initialFocus
                        locale={ptBR}
                        fixedWeeks={true}
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