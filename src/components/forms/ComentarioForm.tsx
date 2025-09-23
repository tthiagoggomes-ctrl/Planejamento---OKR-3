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
import { Comentario } from "@/integrations/supabase/api/comentarios";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  conteudo: z.string().min(1, {
    message: "O comentário não pode ser vazio.",
  }),
});

export type ComentarioFormValues = z.infer<typeof formSchema>;

interface ComentarioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ComentarioFormValues) => void;
  initialData?: Comentario | null;
  isLoading?: boolean;
}

export const ComentarioForm: React.FC<ComentarioFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}) => {
  const form = useForm<ComentarioFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      conteudo: initialData?.conteudo || "",
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({ conteudo: initialData.conteudo });
    } else {
      form.reset({ conteudo: "" });
    }
  }, [initialData, form]);

  const handleSubmit = (values: ComentarioFormValues) => {
    onSubmit(values);
    if (!initialData) { // Only reset if creating a new comment
      form.reset({ conteudo: "" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Comentário" : "Adicionar Comentário"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="conteudo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentário</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Escreva seu comentário aqui..." {...field} />
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