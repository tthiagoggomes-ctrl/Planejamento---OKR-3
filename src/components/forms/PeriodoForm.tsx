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
import { format, parse, isValid, getYear, getMonth } from "date-fns"; // Import getMonth
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
  parent_id: z.string().uuid().nullable().optional(),
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
  parentPeriodIdForNew?: string | null;
}

export const PeriodoForm: React.FC<PeriodoFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
  parentPeriodIdForNew = null,
}) => {
  const form = useForm<PeriodoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: initialData?.nome || "",
      start_date: initialData?.start_date ? new Date(initialData.start_date) : undefined,
      end_date: initialData?.end_date ? new Date(initialData.end_date) : undefined,
      status: initialData?.status || "active",
      parent_id: initialData?.parent_id || parentPeriodIdForNew,
    },
  });

  const [startDateString, setStartDateString] = React.useState<string>("");
  const [endDateString, setEndDateString] = React.useState<string>("");

  const isAnnualPeriod = initialData?.parent_id === null || (parentPeriodIdForNew === null && !initialData);

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        nome: initialData.nome,
        start_date: new Date(initialData.start_date),
        end_date: new Date(initialData.end_date),
        status: initialData.status,
        parent_id: initialData.parent_id,
      });
      setStartDateString(format(new Date(initialData.start_date), "dd/MM/yyyy", { locale: ptBR }));
      setEndDateString(format(new Date(initialData.end_date), "dd/MM/yyyy", { locale: ptBR }) );
    } else {
      form.reset({
        nome: "",
        start_date: undefined,
        end_date: undefined,
        status: "active",
        parent_id: parentPeriodIdForNew,
      });
      setStartDateString("");
      setEndDateString("");
    }
  }, [initialData, form, parentPeriodIdForNew]);

  // Effect to handle annual period name and date auto-generation
  React.useEffect(() => {
    if (isAnnualPeriod) {
      const nomeValue = form.getValues('nome');
      const yearMatch = nomeValue.match(/\d{4}/);
      if (yearMatch) {
        const year = parseInt(yearMatch[0], 10);
        
        const newStartDate = new Date(year, 0, 1, 0, 0, 0, 0); // January 1st, 00:00:00 local time
        const newEndDate = new Date(year, 11, 31, 23, 59, 59, 999); // December 31st, 23:59:59.999 local time

        form.setValue('start_date', newStartDate);
        form.setValue('end_date', newEndDate);
        setStartDateString(format(newStartDate, "dd/MM/yyyy", { locale: ptBR }));
        setEndDateString(format(newEndDate, "dd/MM/yyyy", { locale: ptBR }));
        
        // Auto-set name for annual period
        form.setValue('nome', `Anual ${year} - Janeiro a Dezembro ${year}`);
      } else {
        form.setValue('start_date', undefined);
        form.setValue('end_date', undefined);
        setStartDateString("");
        setEndDateString("");
        form.setValue('nome', ''); // Clear name if year is not found
      }
    }
  }, [form.watch('nome'), isAnnualPeriod]); // Watch 'nome' to update dates for annual periods

  // Effect to handle quarterly period name auto-generation based on dates
  React.useEffect(() => {
    if (!isAnnualPeriod) {
      const startDate = form.watch('start_date');
      const endDate = form.watch('end_date');

      if (startDate && endDate && isValid(startDate) && isValid(endDate)) {
        const year = getYear(startDate);
        const startMonthName = format(startDate, 'MMMM', { locale: ptBR });
        const endMonthName = format(endDate, 'MMMM', { locale: ptBR });

        // Attempt to infer quarter number from existing name if editing, or from months
        let quarterNum = 0;
        const currentNome = form.getValues('nome');
        if (currentNome.includes('1º Trimestre')) quarterNum = 1;
        else if (currentNome.includes('2º Trimestre')) quarterNum = 2;
        else if (currentNome.includes('3º Trimestre')) quarterNum = 3;
        else if (currentNome.includes('4º Trimestre')) quarterNum = 4;
        else { // Infer from months if not already set
          const startMonth = getMonth(startDate);
          if (startMonth >= 0 && startMonth <= 2) quarterNum = 1; // Jan-Mar
          else if (startMonth >= 3 && startMonth <= 5) quarterNum = 2; // Apr-Jun
          else if (startMonth >= 6 && startMonth <= 8) quarterNum = 3; // Jul-Sep
          else if (startMonth >= 9 && startMonth <= 11) quarterNum = 4; // Oct-Dec
        }

        if (quarterNum > 0) {
          form.setValue('nome', `${quarterNum}º Trimestre ${year} - ${startMonthName} a ${endMonthName} ${year}`);
        } else {
          form.setValue('nome', `${startMonthName} a ${endMonthName} ${year}`);
        }
      } else {
        // If dates are invalid or not set, clear the name for quarters
        form.setValue('nome', '');
      }
    }
  }, [form.watch('start_date'), form.watch('end_date'), isAnnualPeriod]);


  const handleSubmit = (values: PeriodoFormValues) => {
    onSubmit(values);
    if (!initialData) {
      form.reset({
        nome: "",
        start_date: undefined,
        end_date: undefined,
        status: "active",
        parent_id: parentPeriodIdForNew,
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
          <DialogTitle>
            {initialData ? "Editar Período" : (parentPeriodIdForNew ? "Criar Novo Trimestre" : "Criar Novo Período Anual")}
          </DialogTitle>
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
                    <Input placeholder="Ex: Anual 2025, Q1 2025" {...field} disabled={isAnnualPeriod} /> {/* Disable for annual */}
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
                            disabled={isAnnualPeriod}
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
                            disabled={isAnnualPeriod}
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
            {parentPeriodIdForNew && !initialData && (
              <FormField
                control={form.control}
                name="parent_id"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormLabel>Parent ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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