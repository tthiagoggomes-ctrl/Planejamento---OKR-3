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
  // SelectGroup, // Removido
  SelectItem,
  // SelectLabel, // Removido
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeyResult } from "@/integrations/supabase/api/key_results";
import { Periodo, getPeriodos } from "@/integrations/supabase/api/periodos";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
  titulo: z.string().min(5, {
    message: "O título do Key Result deve ter pelo menos 5 caracteres.",
  }),
  tipo: z.enum(['numeric', 'boolean', 'percentage'], {
    message: "Selecione um tipo válido para o Key Result.",
  }),
  valor_inicial: z.coerce.number().min(0, {
    message: "O valor inicial não pode ser negativo.",
  }),
  valor_meta: z.coerce.number().min(0, {
    message: "O valor meta não pode ser negativo.",
  }),
  unidade: z.string().nullable(),
  periodo: z.string().min(1, {
    message: "Selecione um período para o Key Result.",
  }),
});

export type KeyResultFormValues = z.infer<typeof formSchema>;

interface KeyResultFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: KeyResultFormValues) => void;
  initialData?: KeyResult | null;
  isLoading?: boolean;
}

export const KeyResultForm: React.FC<KeyResultFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}) => {
  const form = useForm<KeyResultFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: initialData?.titulo || "",
      tipo: initialData?.tipo || "numeric",
      valor_inicial: initialData?.valor_inicial || 0,
      valor_meta: initialData?.valor_meta || 0,
      unidade: initialData?.unidade || "",
      periodo: initialData?.periodo || "",
    },
  });

  const { data: periods, isLoading: isLoadingPeriods } = useQuery<Periodo[], Error>({
    queryKey: ["periods"],
    queryFn: getPeriodos,
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        titulo: initialData.titulo,
        tipo: initialData.tipo,
        valor_inicial: initialData.valor_inicial,
        valor_meta: initialData.valor_meta,
        unidade: initialData.unidade,
        periodo: initialData.periodo,
      });
    } else {
      form.reset({
        titulo: "",
        tipo: "numeric",
        valor_inicial: 0,
        valor_meta: 0,
        unidade: "",
        periodo: "",
      });
    }
  }, [initialData, form]);

  const handleSubmit = (values: KeyResultFormValues) => {
    onSubmit(values);
    if (!initialData) {
      form.reset({
        titulo: "",
        tipo: "numeric",
        valor_inicial: 0,
        valor_meta: 0,
        unidade: "",
        periodo: "",
      });
    }
  };

  const krTypes = [
    { value: "numeric", label: "Numérico" },
    { value: "boolean", label: "Booleano (Sim/Não)" },
    { value: "percentage", label: "Porcentagem" },
  ];

  // Lógica para filtrar e ordenar apenas os períodos trimestrais
  const quarterlyPeriods = React.useMemo(() => {
    if (!periods) return [];
    return periods
      .filter(period => period.parent_id !== null) // Apenas períodos com parent_id (trimestrais)
      .sort((a, b) => {
        // Ordenar por ano descendente
        const yearA = parseInt(a.nome.match(/\d{4}/)?.[0] || '0', 10);
        const yearB = parseInt(b.nome.match(/\d{4}/)?.[0] || '0', 10);

        if (yearA !== yearB) {
          return yearB - yearA;
        }

        // Em seguida, ordenar por número do trimestre ascendente
        const getQuarterOrder = (name: string) => {
          if (name.includes('1º Trimestre')) return 1;
          if (name.includes('2º Trimestre')) return 2;
          if (name.includes('3º Trimestre')) return 3;
          if (name.includes('4º Trimestre')) return 4;
          return 99; // Fallback
        };
        return getQuarterOrder(a.nome) - getQuarterOrder(b.nome);
      });
  }, [periods]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Key Result" : "Criar Novo Key Result"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título do Key Result</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Reduzir o tempo de resposta do suporte" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {krTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valor_inicial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Inicial</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valor_meta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Meta</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="unidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: %, R$, horas" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="periodo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Período</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o período" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {isLoadingPeriods ? (
                        <SelectItem value="" disabled>Carregando períodos...</SelectItem>
                      ) : (
                        quarterlyPeriods.map(period => (
                          <SelectItem key={period.id} value={period.nome}>
                            {period.nome}
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
              <Button type="submit" disabled={isLoading || isLoadingPeriods}>
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