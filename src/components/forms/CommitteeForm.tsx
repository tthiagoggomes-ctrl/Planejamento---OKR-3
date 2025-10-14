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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Comite, ComiteMember } from "@/integrations/supabase/api/comites";
import { UserProfile, getUsers } from "@/integrations/supabase/api/users";
import { Loader2, PlusCircle, XCircle, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/components/auth/SessionContextProvider";

// NOVO: Interface para os membros da composição recomendada
interface ComiteCompositionMember {
  representante: string;
  cargo_funcao: string;
  papel_no_comite: string;
}

const memberSchema = z.object({
  user_id: z.string().uuid({ message: "Selecione um usuário válido." }).nullable(),
  role: z.enum(['membro', 'presidente', 'secretario'], {
    message: "Selecione uma função válida.",
  }),
});

const formSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome do comitê deve ter pelo menos 2 caracteres.",
  }),
  descricao: z.string().nullable(),
  status: z.enum(['active', 'archived'], {
    message: "Selecione um status válido.",
  }),
  regras_comite: z.string().nullable(),
  // NOVOS CAMPOS DETALHADOS
  objetivo: z.string().nullable(),
  justificativa: z.string().nullable(),
  atribuicoes_comite: z.string().nullable(),
  // MODIFICADO: composicao_recomendada agora é um array de objetos
  composicao_recomendada: z.array(z.object({
    representante: z.string().min(1, "O nome do representante é obrigatório."),
    cargo_funcao: z.string().min(1, "O cargo/função é obrigatório."),
    papel_no_comite: z.string().min(1, "O papel no comitê é obrigatório."),
  })).optional(),
  // NOVO: Campo para texto adicional na composição
  composicao_recomendada_adicional: z.string().nullable(),
  periodicidade_reunioes: z.string().nullable(),
  fluxo_demandas: z.string().nullable(),
  criterios_priorizacao: z.string().nullable(),
  beneficios_esperados: z.string().nullable(),
  members: z.array(memberSchema).min(0, "O comitê deve ter pelo menos um membro.").optional(),
});

export type CommitteeFormValues = z.infer<typeof formSchema>;

interface CommitteeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CommitteeFormValues) => void;
  initialData?: Comite | null;
  initialMembers?: ComiteMember[] | null;
  isLoading?: boolean;
}

export const CommitteeForm: React.FC<CommitteeFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  initialMembers,
  isLoading,
}) => {
  const { user } = useSession();
  const form = useForm<CommitteeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: initialData?.nome || "",
      descricao: initialData?.descricao || "",
      status: initialData?.status || "active",
      regras_comite: initialData?.regras_comite || "",
      // NOVOS CAMPOS: Default values
      objetivo: initialData?.objetivo || "",
      justificativa: initialData?.justificativa || "",
      atribuicoes_comite: initialData?.atribuicoes_comite || "",
      // MODIFICADO: Parsear string JSON para array de objetos
      composicao_recomendada: initialData?.composicao_recomendada ? (JSON.parse(initialData.composicao_recomendada as string) as ComiteCompositionMember[]) : [],
      composicao_recomendada_adicional: initialData?.composicao_recomendada_adicional || "", // NOVO
      periodicidade_reunioes: initialData?.periodicidade_reunioes || "",
      fluxo_demandas: initialData?.fluxo_demandas || "",
      criterios_priorizacao: initialData?.criterios_priorizacao || "",
      beneficios_esperados: initialData?.beneficios_esperados || "",
      members: initialMembers?.map(m => ({ user_id: m.user_id, role: m.role })) || [],
    },
  });

  const { fields: memberFields, append: appendMember, remove: removeMember } = useFieldArray({
    control: form.control,
    name: "members",
  });

  // NOVO: useFieldArray para a composição recomendada
  const { fields: compositionFields, append: appendComposition, remove: removeComposition } = useFieldArray({
    control: form.control,
    name: "composicao_recomendada",
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery<UserProfile[] | null, Error>({
    queryKey: ["users"],
    queryFn: () => getUsers(),
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        nome: initialData.nome,
        descricao: initialData.descricao,
        status: initialData.status,
        regras_comite: initialData.regras_comite,
        // NOVOS CAMPOS: Resetar valores
        objetivo: initialData.objetivo,
        justificativa: initialData.justificativa,
        atribuicoes_comite: initialData.atribuicoes_comite,
        // MODIFICADO: Parsear string JSON para array de objetos
        composicao_recomendada: initialData.composicao_recomendada ? (JSON.parse(initialData.composicao_recomendada as string) as ComiteCompositionMember[]) : [],
        composicao_recomendada_adicional: initialData.composicao_recomendada_adicional, // NOVO
        periodicidade_reunioes: initialData.periodicidade_reunioes,
        fluxo_demandas: initialData.fluxo_demandas,
        criterios_priorizacao: initialData.criterios_priorizacao,
        beneficios_esperados: initialData.beneficios_esperados,
        members: initialMembers?.map(m => ({ user_id: m.user_id, role: m.role })) || [],
      });
    } else {
      const defaultMembers = user?.id ? [{ user_id: user.id, role: "presidente" as const }] : [];
      const newCommitteeDefaultMembers = defaultMembers.map(m => ({ ...m, user_id: m.user_id || null }));
      form.reset({
        nome: "",
        descricao: "",
        status: "active",
        regras_comite: "",
        // NOVOS CAMPOS: Resetar para vazio
        objetivo: "",
        justificativa: "",
        atribuicoes_comite: "",
        composicao_recomendada: [], // NOVO: Resetar para array vazio
        composicao_recomendada_adicional: "", // NOVO
        periodicidade_reunioes: "",
        fluxo_demandas: "",
        criterios_priorizacao: "",
        beneficios_esperados: "",
        members: newCommitteeDefaultMembers,
      });
    }
  }, [initialData, initialMembers, form, user]);

  const handleSubmit = (values: CommitteeFormValues) => {
    console.log("[CommitteeForm] Valores do formulário antes de enviar:", values);
    onSubmit(values);
    if (!initialData) {
      const defaultMembers = user?.id ? [{ user_id: user.id, role: "presidente" as const }] : [];
      form.reset({
        nome: "",
        descricao: "",
        status: "active",
        regras_comite: "",
        // NOVOS CAMPOS: Resetar para vazio
        objetivo: "",
        justificativa: "",
        atribuicoes_comite: "",
        composicao_recomendada: [], // NOVO: Resetar para array vazio
        composicao_recomendada_adicional: "", // NOVO
        periodicidade_reunioes: "",
        fluxo_demandas: "",
        criterios_priorizacao: "",
        beneficios_esperados: "",
        members: defaultMembers.map(m => ({ ...m, user_id: m.user_id || null })),
      });
    }
  };

  const statusOptions = [
    { value: "active", label: "Ativo" },
    { value: "archived", label: "Arquivado" },
  ];

  const roleOptions = [
    { value: "membro", label: "Membro" },
    { value: "presidente", label: "Presidente" },
    { value: "secretario", label: "Secretário" },
  ];

  const availableUsers = users?.filter(
    (u) => !memberFields.some((member) => member.user_id === u.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Comitê" : "Criar Novo Comitê"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Comitê</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Comitê de Gestão de Sistemas" {...field} />
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
                    <Textarea placeholder="Detalhes sobre o comitê" {...field} value={field.value || ""} />
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

            <Separator className="my-4" />
            <h3 className="text-lg font-semibold mb-3">Informações Detalhadas do Comitê</h3>

            <FormField
              control={form.control}
              name="objetivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivo</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Qual o objetivo principal deste comitê?" className="min-h-[80px]" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="justificativa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justificativa</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Por que este comitê é necessário?" className="min-h-[80px]" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="atribuicoes_comite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Atribuições do Comitê</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Quais são as principais responsabilidades e atribuições deste comitê?" className="min-h-[100px]" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* MODIFICADO: Composição Recomendada como tabela dinâmica */}
            <h4 className="font-semibold mt-4 mb-2">Composição Recomendada</h4>
            <div className="space-y-3 border p-3 rounded-md">
              {compositionFields.map((field, index) => (
                <div key={field.id} className="flex flex-col gap-2 p-2 border rounded-md bg-gray-50 dark:bg-gray-700">
                  <FormField
                    control={form.control}
                    name={`composicao_recomendada.${index}.representante`}
                    render={({ field: subField }) => (
                      <FormItem>
                        <FormLabel>Representante</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do Representante" {...subField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`composicao_recomendada.${index}.cargo_funcao`}
                    render={({ field: subField }) => (
                      <FormItem>
                        <FormLabel>Cargo / Função</FormLabel>
                        <FormControl>
                          <Input placeholder="Cargo ou Função" {...subField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`composicao_recomendada.${index}.papel_no_comite`}
                    render={({ field: subField }) => (
                      <FormItem>
                        <FormLabel>Papel no Comitê</FormLabel>
                        <FormControl>
                          <Input placeholder="Papel no Comitê" {...subField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeComposition(index)}
                    className="self-end text-red-500 hover:text-red-700"
                  >
                    <XCircle className="h-4 w-4" />
                    <span className="sr-only">Remover Membro da Composição</span>
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => appendComposition({ representante: "", cargo_funcao: "", papel_no_comite: "" })}
                className="w-full"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Membro à Composição
              </Button>
            </div>

            {/* NOVO: Campo para texto adicional na composição */}
            <FormField
              control={form.control}
              name="composicao_recomendada_adicional"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Informações Adicionais sobre a Composição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adicione notas ou observações sobre a composição recomendada aqui..."
                      className="min-h-[80px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="periodicidade_reunioes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Periodicidade das Reuniões</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ex: Semanal, Quinzenal, Mensal" className="min-h-[80px]" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fluxo_demandas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fluxo de Demandas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descreva o fluxo de como as demandas são recebidas, processadas e resolvidas pelo comitê." className="min-h-[100px]" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="criterios_priorizacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Critérios de Priorização</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Ex:
- Urgência: Impacto imediato na operação
- Relevância Estratégica: Alinhamento com metas institucionais
- Custo / Esforço: Complexidade técnica, custo de execução ou aquisição
- Abrangência: Quantidade de usuários ou áreas impactadas
- Risco / Conformidade: Se envolve exigências legais, LGPD ou riscos à operação`}
                      className="min-h-[150px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="beneficios_esperados"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Benefícios Esperados</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Quais resultados e benefícios são esperados com a atuação deste comitê?" className="min-h-[100px]" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4" />
            <h3 className="text-lg font-semibold mb-3">Regras do Comitê (Documento)</h3>
            <FormField
              control={form.control}
              name="regras_comite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Regras e Atribuições (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva as regras, atribuições e funcionamento do comitê aqui..."
                      className="min-h-[150px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4" />
            <h3 className="text-lg font-semibold mb-3">Membros do Comitê</h3>
            <div className="space-y-3">
              {memberFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2 p-2 border rounded-md">
                  <FormField
                    control={form.control}
                    name={`members.${index}.user_id`}
                    render={({ field: memberField }) => (
                      <FormItem className="flex-1">
                        <Select onValueChange={memberField.onChange} value={memberField.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um membro" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingUsers ? (
                              <SelectItem value="" disabled>Carregando usuários...</SelectItem>
                            ) : (
                              <>
                                <SelectItem value="null">Selecione um usuário</SelectItem>
                                {users?.map((u) => (
                                  <SelectItem
                                    key={u.id}
                                    value={u.id}
                                    disabled={memberFields.some((m, i) => i !== index && m.user_id === u.id)}
                                  >
                                    {u.first_name} {u.last_name} ({u.email})
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
                    name={`members.${index}.role`}
                    render={({ field: roleField }) => (
                      <FormItem className="w-[150px]">
                        <Select onValueChange={roleField.onChange} value={roleField.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Função" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roleOptions.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMember(index)}
                  >
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="sr-only">Remover Membro</span>
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => appendMember({ user_id: null, role: "membro" })}
                disabled={isLoadingUsers || (availableUsers && availableUsers.length === 0)}
                className="w-full"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Membro
              </Button>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading || isLoadingUsers}>
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