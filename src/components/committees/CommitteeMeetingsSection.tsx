"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarDays, MessageSquare, ListTodo, PlusCircle, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Reuniao } from "@/integrations/supabase/api/reunioes";
import { AtaReuniao } from "@/integrations/supabase/api/atas_reuniao";
import { format, parseISO, isPast, isFuture, isToday, isSameDay } from "date-fns"; // Importar funções de data
import { ptBR } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { MeetingCalendar } from "./MeetingCalendar"; // Importar o calendário

interface CommitteeMeetingsSectionProps {
  comiteId: string;
  meetings: Reuniao[] | null;
  minutesMap: Map<string, AtaReuniao[]>;
  isLoadingMeetings: boolean;
  errorMeetings: Error | null;
  isLoadingMinutes: boolean;
  canViewReunioes: boolean;
  canInsertReunioes: boolean;
  canEditReunioes: boolean;
  canDeleteReunioes: boolean;
  canViewAtasReuniao: boolean;
  canInsertAtasReuniao: boolean;
  canEditAtasReuniao: boolean;
  canDeleteAtasReuniao: boolean;
  canViewAtividadesComite: boolean;
  onAddReuniaoClick: () => void;
  onEditReuniaoClick: (reuniao: Reuniao) => void;
  onDeleteReuniaoClick: (reuniao: Reuniao) => void;
  onAddAtaClick: (meeting: Reuniao) => void;
  onEditAtaClick: (ata: AtaReuniao) => void;
  onDeleteAtaClick: (ataId: string) => void;
  expandedMeetings: Set<string>;
  toggleMeetingExpansion: (meetingId: string) => void;
  expandedMinutes: Set<string>;
  toggleMinutesExpansion: (minutesId: string) => void;
}

export const CommitteeMeetingsSection: React.FC<CommitteeMeetingsSectionProps> = ({
  comiteId,
  meetings,
  minutesMap,
  isLoadingMeetings,
  errorMeetings,
  isLoadingMinutes,
  canViewReunioes,
  canInsertReunioes,
  canEditReunioes,
  canDeleteReunioes,
  canViewAtasReuniao,
  canInsertAtasReuniao,
  canEditAtasReuniao,
  canDeleteAtasReuniao,
  canViewAtividadesComite,
  onAddReuniaoClick,
  onEditReuniaoClick,
  onDeleteReuniaoClick,
  onAddAtaClick,
  onEditAtaClick,
  onDeleteAtaClick,
  expandedMeetings,
  toggleMeetingExpansion,
  expandedMinutes,
  toggleMinutesExpansion,
}) => {
  const now = new Date();
  const sortedMeetings = React.useMemo(() => {
    return meetings ? [...meetings].sort((a, b) => parseISO(a.data_reuniao).getTime() - parseISO(b.data_reuniao).getTime()) : [];
  }, [meetings]);

  const nextMeeting = React.useMemo(() => {
    return sortedMeetings.find(m => isFuture(parseISO(m.data_reuniao)) || isToday(parseISO(m.data_reuniao)));
  }, [sortedMeetings]);

  const getMeetingStatusClass = (meeting: Reuniao) => {
    const meetingDate = parseISO(meeting.data_reuniao);
    if (isPast(meetingDate) && !isToday(meetingDate)) {
      return "text-gray-500"; // Passada
    } else if (nextMeeting && isSameDay(meetingDate, parseISO(nextMeeting.data_reuniao))) {
      return "text-blue-600 font-bold"; // Próxima
    } else if (isFuture(meetingDate) || isToday(meetingDate)) {
      return "text-green-600"; // Futura
    }
    return "";
  };

  return (
    <>
      {canViewReunioes && (
        <MeetingCalendar meetings={meetings} />
      )}

      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center">
            <CalendarDays className="mr-2 h-5 w-5" /> Reuniões ({meetings?.length || 0})
          </CardTitle>
          {canInsertReunioes && (
            <Button size="sm" variant="outline" onClick={onAddReuniaoClick}>
              <PlusCircle className="mr-2 h-4 w-4" /> Agendar Reunião
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingMeetings ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : errorMeetings ? (
            <p className="text-red-500">Erro ao carregar reuniões: {errorMeetings.message}</p>
          ) : sortedMeetings && sortedMeetings.length > 0 ? (
            <div className="space-y-4">
              {sortedMeetings.map(meeting => (
                <div key={meeting.id} className="border rounded-md p-3">
                  <div className="flex justify-between items-center">
                    <h3 className={`font-semibold ${getMeetingStatusClass(meeting)}`}>{meeting.titulo}</h3>
                    <div className="flex items-center gap-2">
                      {canEditReunioes && (
                        <Button variant="ghost" size="icon" onClick={() => onEditReuniaoClick(meeting)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDeleteReunioes && (
                        <Button variant="ghost" size="icon" onClick={() => onDeleteReuniaoClick(meeting)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => toggleMeetingExpansion(meeting.id)}>
                        {expandedMeetings.has(meeting.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className={`text-sm text-muted-foreground ${getMeetingStatusClass(meeting)}`}>
                    {format(new Date(meeting.data_reuniao), "PPP 'às' HH:mm", { locale: ptBR })} - {meeting.local || 'Local não informado'}
                    {meeting.recurrence_type !== 'none' && ` (Recorrência: ${meeting.recurrence_type === 'weekly' ? 'Semanal' : meeting.recurrence_type === 'bi_weekly' ? 'Quinzenal' : 'Mensal'} até ${format(new Date(meeting.recurrence_end_date!), 'PPP', { locale: ptBR })})`}
                  </p>
                  {expandedMeetings.has(meeting.id) && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium flex items-center">
                          <MessageSquare className="mr-2 h-4 w-4" /> Atas de Reunião ({minutesMap?.get(meeting.id)?.length || 0})
                        </h4>
                        {canInsertAtasReuniao && (
                          <Button size="sm" variant="outline" onClick={() => onAddAtaClick(meeting)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Nova Ata
                          </Button>
                        )}
                      </div>
                      {isLoadingMinutes ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : minutesMap?.get(meeting.id)?.length > 0 ? (
                        <ul className="space-y-2 pl-4">
                          {minutesMap.get(meeting.id)?.map(minutes => (
                            <li key={minutes.id} className="border rounded-md p-2">
                              <div className="flex justify-between items-center">
                                <p className="font-medium">Ata de {minutes.data_reuniao ? format(parseISO(minutes.data_reuniao), "PPP", { locale: ptBR }) : format(new Date(minutes.created_at!), "PPP", { locale: ptBR })}</p>
                                <div className="flex items-center gap-2">
                                  {canEditAtasReuniao && (
                                    <Button variant="ghost" size="icon" onClick={() => onEditAtaClick(minutes)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {canDeleteAtasReuniao && (
                                    <Button variant="ghost" size="icon" onClick={() => onDeleteAtaClick(minutes.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" onClick={() => toggleMinutesExpansion(minutes.id)}>
                                    {expandedMinutes.has(minutes.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </div>
                              {expandedMinutes.has(minutes.id) && (
                                <div className="mt-2 text-sm text-muted-foreground space-y-2">
                                  {minutes.data_reuniao && minutes.horario_inicio && minutes.horario_fim && (
                                    <p><strong>Data:</strong> {format(parseISO(minutes.data_reuniao), "PPP", { locale: ptBR })}</p>
                                  )}
                                  {minutes.horario_inicio && minutes.horario_fim && (
                                    <p><strong>Horário:</strong> {minutes.horario_inicio} às {minutes.horario_fim}</p>
                                  )}
                                  {minutes.local_reuniao && (
                                    <p><strong>Local:</strong> {minutes.local_reuniao}</p>
                                  )}
                                  {minutes.participantes && (
                                    <>
                                      <p><strong>Participantes:</strong></p>
                                      <pre className="whitespace-pre-wrap text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded-md">{minutes.participantes}</pre>
                                    </>
                                  )}
                                  {minutes.objetivos_reuniao && (
                                    <>
                                      <p><strong>Objetivos da Reunião:</strong></p>
                                      <pre className="whitespace-pre-wrap text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded-md">{minutes.objetivos_reuniao}</pre>
                                    </>
                                  )}
                                  {minutes.pauta_tratada && (
                                    <>
                                      <p><strong>Pauta Tratada:</strong></p>
                                      <pre className="whitespace-pre-wrap text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded-md">{minutes.pauta_tratada}</pre>
                                    </>
                                  )}
                                  {minutes.novos_topicos && (
                                    <>
                                      <p><strong>Novos Tópicos:</strong></p>
                                      <pre className="whitespace-pre-wrap text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded-md">{minutes.novos_topicos}</pre>
                                    </>
                                  )}
                                  {minutes.pendencias && (
                                    <>
                                      <p><strong>Pendências:</strong></p>
                                      <pre className="whitespace-pre-wrap text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded-md">{minutes.pendencias}</pre>
                                    </>
                                  )}
                                  {minutes.proximos_passos && (
                                    <>
                                      <p><strong>Próximos Passos:</strong></p>
                                      <pre className="whitespace-pre-wrap text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded-md">{minutes.proximos_passos}</pre>
                                    </>
                                  )}
                                  {minutes.conteudo && (
                                    <>
                                      <p><strong>Conteúdo Geral:</strong></p>
                                      <pre className="whitespace-pre-wrap text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded-md">{minutes.conteudo}</pre>
                                    </>
                                  )}
                                  {minutes.decisoes_tomadas && (
                                    <>
                                      <p><strong>Decisões Tomadas:</strong></p>
                                      <pre className="whitespace-pre-wrap text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded-md">{minutes.decisoes_tomadas}</pre>
                                    </>
                                  )}
                                  <p>Criado por: {minutes.created_by_name}</p>

                                  <Separator className="my-3" />

                                  <div className="flex justify-between items-center mb-2">
                                    <h5 className="font-medium flex items-center">
                                      <ListTodo className="mr-2 h-4 w-4" /> Atividades do Comitê
                                    </h5>
                                    {canViewAtividadesComite && (
                                      <Link to={`/comites/atividades`} state={{ comiteId: comiteId, ataId: minutes.id }}>
                                        <Button size="sm" variant="outline">
                                          <ListTodo className="mr-2 h-4 w-4" /> Gerenciar Atividades
                                        </Button>
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-600 text-center py-2">Nenhuma ata de reunião para esta reunião.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Nenhuma reunião agendada.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
};