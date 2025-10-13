"use client";

import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Reuniao } from '@/integrations/supabase/api/reunioes';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';

interface MeetingCalendarProps {
  meetings: Reuniao[] | null;
}

export const MeetingCalendar: React.FC<MeetingCalendarProps> = ({ meetings }) => {
  const [month, setMonth] = React.useState<Date>(new Date());

  const meetingsByDate = React.useMemo(() => {
    const map = new Map<string, Reuniao[]>();
    meetings?.forEach(meeting => {
      const date = parseISO(meeting.data_reuniao);
      const dateKey = format(date, 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)?.push(meeting);
    });
    return map;
  }, [meetings]);

  const modifiers = {
    meetings: (date: Date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      return meetingsByDate.has(dateKey);
    },
  };

  const modifiersClassNames = {
    meetings: "bg-blue-500 text-white rounded-full", // Tailwind classes for highlighted dates
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center">
          <CalendarDays className="mr-2 h-5 w-5" /> Calendário de Reuniões
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={undefined} // No single date selected by default
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          locale={ptBR}
          className="rounded-md border"
        />
        <div className="mt-4 w-full">
          <h3 className="text-lg font-semibold mb-2">Reuniões em {format(month, 'MMMM yyyy', { locale: ptBR })}</h3>
          {Array.from(meetingsByDate.entries())
            .filter(([dateKey]) => isSameDay(parseISO(dateKey), month) || format(parseISO(dateKey), 'yyyy-MM') === format(month, 'yyyy-MM'))
            .sort(([dateKeyA], [dateKeyB]) => parseISO(dateKeyA).getTime() - parseISO(dateKeyB).getTime())
            .map(([dateKey, dailyMeetings]) => (
              <div key={dateKey} className="mb-2">
                <p className="font-medium text-sm mb-1">{format(parseISO(dateKey), 'PPP', { locale: ptBR })}:</p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {dailyMeetings.sort((a, b) => parseISO(a.data_reuniao).getTime() - parseISO(b.data_reuniao).getTime()).map(meeting => (
                    <li key={meeting.id}>
                      {format(parseISO(meeting.data_reuniao), 'HH:mm', { locale: ptBR })} - {meeting.titulo} ({meeting.local || 'N/A'})
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          {Array.from(meetingsByDate.entries())
            .filter(([dateKey]) => format(parseISO(dateKey), 'yyyy-MM') === format(month, 'yyyy-MM'))
            .length === 0 && (
              <p className="text-gray-600 text-center py-2">Nenhuma reunião agendada para este mês.</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
};