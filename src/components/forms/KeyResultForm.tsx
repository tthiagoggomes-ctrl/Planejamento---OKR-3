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
  SelectGroup, // Adicionado
  SelectItem,
  SelectLabel, // Adicionado
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

  // Lógica para agrupar os períodos
  const groupedPeriods = React.useMemo(() => {
    if (!periods) return [];

    const groups: { label: string; items: Periodo[] }[] = [];
    let currentAnnualGroup: { label: string; items: Periodo[] } | null = null;

    periods.forEach(period => {
      if (period.nome.startsWith('Anual')) {
        // Se um novo período anual é encontrado, inicia um novo grupo
        currentAnnualGroup = { label: period.nome, items: [period] };
        groups.push(currentAnnualGroup);
      } else if (currentAnnualGroup && period.nome.includes(currentAnnualGroup.label.split(' ')[1])) {
        // Se é um período trimestral e pertence ao grupo anual atual, adiciona
        currentAnnualGroup.items.push(period);
      } else {
        // Para períodos que não se encaixam ou aparecem antes de um anual
        let genericGroup = groups.find(g => g.label === 'Outros Períodos');
        if (!genericGroup) {
          genericGroup = { label: 'Outros Períodos', items: [] };
          groups.push(genericGroup);
        }
        genericGroup.items.push(period);
      }
    });
    return groups;
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
                        groupedPeriods.map(group => (
                          <SelectGroup key={group.label}>
                            <SelectLabel>{group.label}</SelectLabel>
                            {group.items.map(period => (
                              <SelectItem key={period.id} value={period.nome}>
                                {period.nome}
                              </SelectItem>
                            ))}
                          </SelectGroup>
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