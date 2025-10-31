"use client";

import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessageSquare, CalendarDays, Clock, MapPin, Users, ChevronLeft } from "lucide-react";
import { AtaReuniao, getAtaReuniaoById } from "@/integrations/supabase/api/atas_reuniao";
import { showError } from "@/utils/toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { useUserPermissions } from '@/hooks/use-user-permissions';

const AtaReuniaoDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, isLoading: permissionsLoading } = useUserPermissions();

  const canViewAtasReuniao = can('atas_reuniao', 'view');

  const { data: ataReuniao, isLoading, error } = useQuery<AtaReuniao | null, Error>({
    queryKey: ["ataReuniao", id],
    queryFn: () => getAtaReuniaoById(id!),
    enabled: !!id && canViewAtasReuniao && !permissionsLoading,
  });

  if (isLoading || permissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewAtasReuniao) {
    return (
      <div className="container mx-auto py-6 text-center text-red-500">
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  if (error || !ataReuniao) {
    showError("Erro ao carregar ata de reunião ou ata não encontrada.");
    return (
      <div className="text-center text-red-500">
        Erro ao carregar ata de reunião ou ata não encontrada.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <MessageSquare className="mr-2 h-6 w-6" /> Detalhes da Ata de Reunião
          </CardTitle>
          <p className="text-muted-foreground">
            Ata de Reunião de {ataReuniao.data_reuniao ? format(parseISO(ataReuniao.data_reuniao), "PPP", { locale: ptBR }) : 'N/A'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ataReuniao.data_reuniao && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data da Reunião</p>
                <p className="flex items-center text-base font-semibold">
                  <CalendarDays className="mr-2 h-4 w-4 text-gray-500" />
                  {format(parseISO(ataReuniao.data_reuniao), "PPP", { locale: ptBR })}
                </p>
              </div>
            )}
            {ataReuniao.horario_inicio && ataReuniao.horario_fim && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Horário</p>
                <p className="flex items-center text-base font-semibold">
                  <Clock className="mr-2 h-4 w-4 text-gray-500" />
                  {ataReuniao.horario_inicio} - {ataReuniao.horario_fim}
                </p>
              </div>
            )}
            {ataReuniao.local_reuniao && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Local</p>
                <p className="flex items-center text-base font-semibold">
                  <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                  {ataReuniao.local_reuniao}
                </p>
              </div>
            )}
            {ataReuniao.created_by_name && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Criado Por</p>
                <p className="flex items-center text-base font-semibold">
                  <Users className="mr-2 h-4 w-4 text-gray-500" />
                  {ataReuniao.created_by_name}
                </p>
              </div>
            )}
          </div>

          {ataReuniao.participantes && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Participantes</p>
                <pre className="whitespace-pre-wrap font-sans text-base bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  {ataReuniao.participantes}
                </pre>
              </div>
            </>
          )}

          {ataReuniao.objetivos_reuniao && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Objetivos da Reunião</p>
                <pre className="whitespace-pre-wrap font-sans text-base bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  {ataReuniao.objetivos_reuniao}
                </pre>
              </div>
            </>
          )}

          {ataReuniao.pauta_tratada && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Pauta Tratada</p>
                <pre className="whitespace-pre-wrap font-sans text-base bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  {ataReuniao.pauta_tratada}
                </pre>
              </div>
            </>
          )}

          {ataReuniao.novos_topicos && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Novos Tópicos</p>
                <pre className="whitespace-pre-wrap font-sans text-base bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  {ataReuniao.novos_topicos}
                </pre>
              </div>
            </>
          )}

          {/* REMOVIDO: Exibição de pendencias */}

          {ataReuniao.proximos_passos && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Próximos Passos</p>
                <pre className="whitespace-pre-wrap font-sans text-base bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  {ataReuniao.proximos_passos}
                </pre>
              </div>
            </>
          )}

          {ataReuniao.decisoes_tomadas && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Decisões Tomadas</p>
                <pre className="whitespace-pre-wrap font-sans text-base bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  {ataReuniao.decisoes_tomadas}
                </pre>
              </div>
            </>
          )}

          {ataReuniao.conteudo && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Conteúdo Geral</p>
                <pre className="whitespace-pre-wrap font-sans text-base bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  {ataReuniao.conteudo}
                </pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AtaReuniaoDetails;