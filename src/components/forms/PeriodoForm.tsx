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
import { Periodo } from "@/integrations/supabase/api/periodos";
import { Loader2, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parse, isValid, getYear, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Helper function to format date string as DD/MM/YYYY
const formatInputDate = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, '');
  let formatted = '';

  if (digitsOnly.length > 0) {
    formatted += digitsOnly.substring(0, 2);
    if (digitsOnly.length > 2) {
      formatted += '/' + digitsOnly.substring(2, 4);
      if (digitsOnly.length > 4) {
        formatted += '/' + digitsOnly.substring(4, 8);
      }
    }
  }
  return formatted.substring(0, 10);
};

const formSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome do período deve ter pelo menos 2 caracteres.",
  }),
  start_date: z.date().nullable().optional(), // Alterado para nullable().optional()
  end_date: z.date().nullable().optional(),   // Alterado para nullable().optional()
  status: z.enum(['active', 'archived'], {
    message: "Selecione um status válido.",
  }),
  parent_id: z.string().uuid().nullable().optional(),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return data.end_date >= data.start_date;
  }
  // If dates are null/undefined, this refinement doesn't apply,
  // but the API will set them for annual periods.
  return true;
}, {
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
      start_date: initialData?.start_date ? new Date(initialData.start_date) : null, // Alterado para null
      end_date: initialData?.end_date ? new Date(initialData.end_date) : null,     // Alterado para null
      status: initialData?.status || "active",
      parent_id: initialData?.parent_id || parentPeriodIdForNew,
    },
  });

  const [startDateString, setStartDateString] = React.useState<string>("");
  const [endDateString, setEndDateString] = React.useState<string>("");
  const [yearInput, setYearInput] = React.useState<string>(""); // Novo estado para o input do ano

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

      if (initialData.parent_id === null) {
        const yearMatch = initialData.nome.match(/\d{4}/);
        setYearInput(yearMatch ? yearMatch[0] : String(getYear(new Date(initialData.start_date))));
      } else {
        setYearInput("");
      }
    } else {
      // For new annual periods, pre-fill the name and dates directly
      if (parentPeriodIdForNew === null) {
        const currentYear = new Date().getFullYear();
        const newStartDate = new Date(currentYear, 0, 1, 0, 0, 0, 0);
        const newEndDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
        const defaultNome = `Anual ${currentYear} - Janeiro a Dezembro ${currentYear}`;

        form.reset({
          nome: defaultNome,
          start_date: newStartDate,
          end_date: newEndDate,
          status: "active",
          parent_id: null,
        });
        setYearInput(String(currentYear));
        setStartDateString(format(newStartDate, "dd/MM/yyyy", { locale: ptBR }));
        setEndDateString(format(newEndDate, "dd/MM/yyyy", { locale: ptBR }));
      } else {
        // For new quarterly periods, initialize with valid Date objects
        const today = new Date();
        const defaultQuarterStartDate = new Date(today.getFullYear(), getMonth(today), 1);
        const defaultQuarterEndDate = new Date(today.getFullYear(), getMonth(today) + 1, 0, 23, 59, 59, 999);

        form.reset({
          nome: "",
          start_date: defaultQuarterStartDate,
          end_date: defaultQuarterEndDate,
          status: "active",
          parent_id: parentPeriodIdForNew,
        });
        setYearInput("");
        setStartDateString(format(defaultQuarterStartDate, "dd/MM/yyyy", { locale: ptBR }));
        setEndDateString(format(defaultQuarterEndDate, "dd/MM/yyyy", { locale: ptBR }));
      }
    }
  }, [initialData, form, parentPeriodIdForNew]);

  // Effect to handle year input changes for annual periods
  React.useEffect(() => {
    if (isAnnualPeriod) {
      const yearNum = parseInt(yearInput, 10);
      if (!isNaN(yearNum) && yearInput.length === 4) {
        const newStartDate = new Date(yearNum, 0, 1, 0, 0, 0, 0);
        const newEndDate = new Date(yearNum, 11, 31, 23, 59, 59, 999);
        const fullNome = `Anual ${yearNum} - Janeiro a Dezembro ${yearNum}`;

        form.setValue('nome', fullNome, { shouldValidate: true });
        form.setValue('start_date', newStartDate, { shouldValidate: true });
        form.setValue('end_date', newEndDate, { shouldValidate: true });
        setStartDateString(format(newStartDate, "dd/MM/yyyy", { locale: ptBR }));
        setEndDateString(format(newEndDate, "dd/MM/yyyy", { locale: ptBR }));
      } else {
        form.setValue('nome', '', { shouldValidate: true });
        form.setValue('start_date', null, { shouldValidate: true }); // Alterado para null
        form.setValue('end_date', null, { shouldValidate: true });     // Alterado para null
        setStartDateString("");
        setEndDateString("");
      }
    }
  }, [yearInput, isAnnualPeriod, form]);


  // Effect to handle quarterly period name auto-generation based on dates
  React.useEffect(() => {
    if (!isAnnualPeriod) { // Only run for quarterly periods
      const startDate = form.watch('start_date');
      const endDate = form.watch('end_date');

      if (startDate && endDate && isValid(startDate) && isValid(endDate)) {
        const year = getYear(startDate);
        const startMonthName = format(startDate, 'MMMM', { locale: ptBR });
        const endMonthName = format(endDate, 'MMMM', { locale: ptBR });

        let quarterNum = 0;
        const currentNome = form.getValues('nome');
        if (currentNome.includes('1º Trimestre')) quarterNum = 1;
        else if (currentNome.includes('2º Trimestre')) quarterNum = 2;
        else if (currentNome.includes('3º Trimestre')) quarterNum = 3;
        else if (currentNome.includes('4º Trimestre')) quarterNum = 4;
        else {
          const startMonth = getMonth(startDate);
          if (startMonth >= 0 && startMonth <= 2) quarterNum = 1;
          else if (startMonth >= 3 && startMonth <= 5) quarterNum = 2;
          else if (startMonth >= 6 && startMonth <= 8) quarterNum = 3;
          else if (startMonth >= 9 && startMonth <= 11) quarterNum = 4;
        }

        if (quarterNum > 0) {
          form.setValue('nome', `${quarterNum}º Trimestre ${year} - ${startMonthName} a ${endMonthName} ${year}`);
        } else {
          form.setValue('nome', `${startMonthName} a ${endMonthName} ${year}`);
        }
      } else {
        form.setValue('nome', '');
      }
    }
  }, [form.watch('start_date'), form.watch('end_date'), isAnnualPeriod, form]);


  const handleSubmit = (values: PeriodoFormValues) => {
    onSubmit(values);
    if (!initialData) {
      form.reset({
        nome: "",
        start_date: null, // Alterado para null
        end_date: null,     // Alterado para null
        status: "active",
        parent_id: parentPeriodIdForNew,
      });
      setStartDateString("");
      setEndDateString("");
      setYearInput("");
    }
  };

  // const statusOptions = [ // REMOVIDO: Não utilizado
  //   { value: "active", label: "Ativo" },
  //   { value: "archived", label: "Arquivado" },
  // ];

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
                    {isAnnualPeriod ? (
                      <Input
                        placeholder="Ex: 2025"
                        value={yearInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^\d{0,4}$/.test(value)) { // Allow up to 4 digits
                            setYearInput(value);
                          }
                        }}
                        maxLength={4}
                      />
                    ) : (
                      <Input placeholder="Ex: Q1 2025" {...field} disabled />
                    )}
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
                              field.onChange(isValid(parsedDate) ? parsedDate : null); // Alterado para null
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
                        selected={field.value || undefined} // Alterado para undefined
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
                              field.onChange(isValid(parsedDate) ? parsedDate : null); // Alterado para null
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
                        selected={field.value || undefined} // Alterado para undefined
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
            {parentPeriodIdForNew && !initialData && (
              <FormField
                control={form.control}
                name="parent_id"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormLabel>Parent ID</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} /> {/* Ensure value is string or empty string */}
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