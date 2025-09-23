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
import { KeyResult } from "@/integrations/supabase/api/key_results";
import { Loader2 } from "lucide-react";

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
  valor_atual: z.coerce.number().min(0, {
    message: "O valor atual não pode ser negativo.",
  }),
  unidade: z.string().nullable(),
  status: z.enum(['on_track', 'at_risk', 'off_track', 'completed'], {
    message: "Selecione um status válido.",
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
      valor_atual: initialData?.valor_atual || 0,
      unidade: initialData?.unidade || "",
      status: initialData?.status || "on_track",
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        titulo: initialData.titulo,
        tipo: initialData.tipo,
        valor_inicial: initialData.valor_inicial,
        valor_meta: initialData.valor_meta,
        valor_atual: initialData.valor_atual,
        unidade: initialData.unidade,
        status: initialData.status,
      });
    } else {
      form.reset({
        titulo: "",
        tipo: "numeric",
        valor_inicial: 0,
        valor_meta: 0,
        valor_atual: 0,
        unidade: "",
        status: "on_track",
      });
    }
  }, [initialData, form]);

  const handleSubmit = (values: KeyResultFormValues) => {
    onSubmit(values);
    if (!initialData) { // Only reset if creating a new KR
      form.reset({
        titulo: "",
        tipo: "numeric",
        valor_inicial: 0,
        valor_meta: 0,
        valor_atual: 0,
        unidade: "",
        status: "on_track",
      });
    }
  };

  const krTypes = [
    { value: "numeric", label: "Numérico" },
    { value: "boolean", label: "Booleano (Sim/Não)" },
    { value: "percentage", label: "Porcentagem" },
  ];

  const krStatuses = [
    { value: "on_track", label: "No Caminho Certo" },
    { value: "at_risk", label: "Em Risco" },
    { value: "off_track", label: "Fora do Caminho" },
    { value: "completed", label: "Concluído" },
  ];

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
            <div className="grid grid-cols-3 gap-4">
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
              <FormField
                control={form.control}
                name="valor_atual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Atual</FormLabel>
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
                      {krStatuses.map((status) => (
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