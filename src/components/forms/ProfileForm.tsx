"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import { UserProfile } from "@/integrations/supabase/api/users";
import { Area, getAreas } from "@/integrations/supabase/api/areas";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
  first_name: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  last_name: z.string().min(2, {
    message: "O sobrenome deve ter pelo menos 2 caracteres.",
  }),
  area_id: z.string().uuid({ message: "Selecione uma área válida." }).nullable(),
});

export type ProfileFormValues = z.infer<typeof formSchema>;

interface ProfileFormProps {
  onSubmit: (values: ProfileFormValues) => void;
  initialData?: UserProfile | null;
  isLoading?: boolean;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  onSubmit,
  initialData,
  isLoading,
}) => {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      area_id: initialData?.area_id || null,
    },
  });

  const { data: areas, isLoading: isLoadingAreas } = useQuery<Area[], Error>({
    queryKey: ["areas"],
    queryFn: getAreas,
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        first_name: initialData.first_name,
        last_name: initialData.last_name,
        area_id: initialData.area_id,
      });
    }
  }, [initialData, form]);

  const handleSubmit = (values: ProfileFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sobrenome</FormLabel>
              <FormControl>
                <Input placeholder="Sobrenome" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="area_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Área</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
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
        <Button type="submit" disabled={isLoading || isLoadingAreas}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </form>
    </Form>
  );
};