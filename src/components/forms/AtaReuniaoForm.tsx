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
import { Textarea } from "@/components/ui/textarea";
import { AtaReuniao } from "@/integrations/supabase/api/atas_reuniao";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  conteudo: z.string().min(10, {
    message: "O conteúdo da ata deve ter pelo menos 10 caracteres.",
  }),
  decisoes_tomadas: z.string().nullable(),
});

export type AtaReuniaoFormValues = z.infer<typeof formSchema>;

interface AtaReuniaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AtaReuniaoFormValues) => void;
  initialData?: AtaReuniao | null;
  isLoading?: boolean;
}

export const AtaReuniaoForm: React.FC<AtaReuniaoFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}) => {
  const form = useForm<AtaReuniaoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      conteudo: initialData?.conteudo || "",
      decisoes_tomadas: initialData?.decisoes_tomadas || "",
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        conteudo: initialData.conteudo,
        decisoes_tomadas: initialData.decisoes_tomadas,
      });
    } else {
      form.reset({
        conteudo: "",
        decisoes_tomadas: "",
      });
    }
  }, [initialData, form]);

  const handleSubmit = (values: AtaReuniaoFormValues) => {
    onSubmit(values);
    if (!initialData) { // Only reset if creating a new minute
      form.reset({ conteudo: "", decisoes_tomadas: "" });
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
            <FormField
              control={form.control}
              name="conteudo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo da Ata</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva os pontos discutidos na reunião..."
                      className="min-h-[150px]"
                      {...field}
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