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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Objetivo } from "@/integrations/supabase/api/objetivos";
import { Area, getAreas } from "@/integrations/supabase/api/areas";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/auth/SessionContextProvider"; // Import useSession

const formSchema = z.object({
  titulo: z.string().min(5, {
    message: "O título do objetivo deve ter pelo menos 5 caracteres.",
  }),
  descricao: z.string().nullable(),
  periodo: z.string().min(1, {
    message: "Selecione um período para o objetivo.",
  }),
  area_id: z.string().uuid({ message: "Selecione uma área válida." }).nullable(),
  status: z.enum(['draft', 'active', 'completed', 'archived'], {
    message: "Selecione um status válido.",
  }),
});

export type ObjetivoFormValues = z.infer<typeof formSchema>;

interface ObjetivoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ObjetivoFormValues) => void;
  initialData?: Objetivo | null;
  isLoading?: boolean;
}

export const ObjetivoForm: React.FC<ObjetivoFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}) => {
  const { userProfile: currentUserProfile } = useSession();
  const isAdmin = currentUserProfile?.permissao === 'administrador';
  const isDiretoria = currentUserProfile?.permissao === 'diretoria';
  const isGerente = currentUserProfile?.permissao === 'gerente';
  const isSupervisor = currentUserProfile?.permissao === 'supervisor';
  const currentUserAreaId = currentUserProfile?.area_id;

  const form = useForm<ObjetivoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: initialData?.titulo || "",
      descricao: initialData?.descricao || "",
      periodo: initialData?.periodo || "",
      area_id: initialData?.area_id || null,
      status: initialData?.status || "draft",
    },
  });

  const { data: areas, isLoading: isLoadingAreas } = useQuery<Area[], Error>({
    queryKey: ["areas"],
    queryFn: getAreas,
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        titulo: initialData.titulo,
        descricao: initialData.descricao,
        periodo: initialData.periodo,
        area_id: initialData.area_id,
        status: initialData.status,
      });
    } else {
      form.reset({
        titulo: "",
        descricao: "",
        periodo: "",
        area_id: (isGerente || isSupervisor) && currentUserAreaId ? currentUserAreaId : null, // Default to user's area if manager/supervisor
        status: "draft",
      });
    }
  }, [initialData, form, isGerente, isSupervisor, currentUserAreaId]);

  const handleSubmit = (values: ObjetivoFormValues) => {
    onSubmit(values);
    if (!initialData) { // Only reset if creating a new objective
      form.reset({
        titulo: "",
        descricao: "",
        periodo: "",
        area_id: (isGerente || isSupervisor) && currentUserAreaId ? currentUserAreaId : null,
        status: "draft",
      });
    }
  };

  const periods = ["Q1 2024", "Q2 2024", "Q3 2024", "Q4 2024", "Anual 2024", "Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Anual 2025"];
  const statuses = [
    { value: "draft", label: "Rascunho" },
    { value: "active", label: "Ativo" },
    { value: "completed", label: "Concluído" },
    { value: "archived", label: "Arquivado" },
  ];

  const canEditAllFields = isAdmin || isDiretoria;
  const canEditArea = isAdmin || isDiretoria;
  const canEditStatus = isAdmin || isDiretoria;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Objetivo" : "Criar Novo Objetivo"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título do Objetivo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Aumentar a satisfação do cliente" {...field} disabled={!canEditAllFields && initialData && currentUserAreaId !== initialData.area_id} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalhes sobre o objetivo" {...field} value={field.value || ""} disabled={!canEditAllFields && initialData && currentUserAreaId !== initialData.area_id} />
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
                  <Select onValueChange={field.onChange} value={field.value} disabled={!canEditAllFields && initialData && currentUserAreaId !== initialData.area_id}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o período" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {periods.map((period) => (
                        <SelectItem key={period} value={period}>
                          {period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="area_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Área (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""} disabled={!canEditArea || ((isGerente || isSupervisor) && initialData && currentUserAreaId !== initialData.area_id)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma área" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingAreas ? (
                        <SelectItem value="" disabled>Carregando áreas...</SelectItem>
                      ) : (
                        <>
                          <SelectItem value="null">Nenhuma Área</SelectItem>
                          {areas?.map((area) => (
                            <SelectItem key={area.id} value={area.id}>
                              {area.nome}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
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
                  <Select onValueChange={field.onChange} value={field.value} disabled={!canEditStatus || (initialData && currentUserAreaId !== initialData.area_id)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statuses.map((status) => (
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
              <Button type="submit" disabled={isLoading || isLoadingAreas || (!canEditAllFields && initialData && currentUserAreaId !== initialData.area_id)}>
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