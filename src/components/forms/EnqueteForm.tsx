"use client";

import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Enquete } from "@/integrations/supabase/api/enquetes";
import { Loader2, CalendarIcon, PlusCircle, XCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  titulo: z.string().min(5, {
    message: "O título da enquete deve ter pelo menos 5 caracteres.",
  }),
  descricao: z.string().nullable(),
  start_date: z.date({
    required_error: "A data de início é obrigatória.",
  }),
  end_date: z.date({
    required_error: "A data de término é obrigatória.",
  }),
  opcoes_texto: z.array(z.object({
    text: z.string().min(1, "A opção não pode ser vazia.")
  })).min(2, "Uma enquete deve ter pelo menos 2 opções."),
}).refine((data) => data.end_date >= data.start_date, {
  message: "A data de término não pode ser anterior à data de início.",
  path: ["end_date"],
});

export type EnqueteFormValues = z.infer<typeof formSchema>;

// Novo tipo para os valores que serão submetidos, após a transformação de opcoes_texto
export type EnqueteSubmitValues = Omit<EnqueteFormValues, 'opcoes_texto'> & {
  opcoes_texto: string[];
};

interface EnqueteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // O onSubmit agora espera o tipo transformado
  onSubmit: (values: EnqueteSubmitValues) => void;
  initialData?: Enquete | null;
  isLoading?: boolean;
}

export const EnqueteForm: React.FC<EnqueteFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}) => {
  const form = useForm<EnqueteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: initialData?.titulo || "",
      descricao: initialData?.descricao || "",
      start_date: initialData?.start_date ? new Date(initialData.start_date) : undefined,
      end_date: initialData?.end_date ? new Date(initialData.end_date) : undefined,
      opcoes_texto: initialData?.opcoes?.map(opt => ({ text: opt.texto_opcao })) || [{ text: "" }, { text: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "opcoes_texto",
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        titulo: initialData.titulo,
        descricao: initialData.descricao,
        start_date: new Date(initialData.start_date),
        end_date: new Date(initialData.end_date),
        opcoes_texto: initialData.opcoes?.map(opt => ({ text: opt.texto_opcao })) || [{ text: "" }, { text: "" }],
      });
    } else {
      form.reset({
        titulo: "",
        descricao: "",
        start_date: undefined,
        end_date: undefined,
        opcoes_texto: [{ text: "" }, { text: "" }],
      });
    }
  }, [initialData, form]);

  const handleSubmit = (values: EnqueteFormValues) => {
    // A transformação para string[] já está correta aqui
    const transformedValues: EnqueteSubmitValues = {
      ...values,
      opcoes_texto: values.opcoes_texto.map(opt => opt.text)
    };
    onSubmit(transformedValues); // Agora o tipo corresponde ao prop onSubmit
    if (!initialData) {
      form.reset({
        titulo: "",
        descricao: "",
        start_date: undefined,
        end_date: undefined,
        opcoes_texto: [{ text: "" }, { text: "" }],
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Enquete" : "Criar Nova Enquete"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Enquete</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Qual o melhor dia para a próxima reunião?" {...field} />
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
                    <Textarea placeholder="Detalhes sobre a enquete" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Início</FormLabel>
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
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
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
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
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
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-4" />
            <h3 className="text-lg font-semibold mb-3">Opções da Enquete</h3>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`opcoes_texto.${index}.text`}
                    render={({ field: optionField }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder={`Opção ${index + 1}`} {...optionField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 2}
                  >
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="sr-only">Remover Opção</span>
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ text: "" })}
                className="w-full"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Opção
              </Button>
            </div>

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