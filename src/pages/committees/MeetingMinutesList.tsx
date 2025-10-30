"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessageSquare, Search, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AtaReuniao, getAtasReuniaoByReuniaoId } from "@/integrations/supabase/api/atas_reuniao";
import { getReunioes, Reuniao } from "@/integrations/supabase/api/reunioes";
import { getComites, Comite } from "@/integrations/supabase/api/comites";
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";

interface FullAtaReuniao extends AtaReuniao {
  reuniao_titulo?: string;
  comite_nome?: string;
  comite_id?: string; // Adicionado para facilitar a navegação
}

const MeetingMinutesList = () => {
  const { can, isLoading: permissionsLoading } = useUserPermissions();
  const canViewAtasReuniao = can('atas_reuniao', 'view');

  const [searchQuery, setSearchQuery] = React.useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [comiteFilter, setComiteFilter] = React.useState<string | 'all'>('all');
  const [sortBy, setSortBy] = React.useState<keyof FullAtaReuniao>('data_reuniao');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  const { data: comites, isLoading: isLoadingComites } = useQuery<Comite[] | null, Error>({
    queryKey: ["comites"],
    queryFn: getComites,
    enabled: canViewAtasReuniao && !permissionsLoading,
  });

  const { data: allMeetings, isLoading: isLoadingAllMeetings } = useQuery<Reuniao[] | null, Error>({
    queryKey: ["allMeetings"],
    queryFn: async () => {
      if (!comites) return [];
      const meetingsPromises = comites.map(comite => getReunioes({ comite_id: comite.id }));
      const results = await Promise.all(meetingsPromises);
      return results.flat().filter(Boolean) as Reuniao[];
    },
    enabled: !!comites && canViewAtasReuniao && !permissionsLoading,
  });

  const { data: allMinutes, isLoading: isLoadingAllMinutes, error } = useQuery<FullAtaReuniao[] | null, Error>({
    queryKey: ["allMeetingMinutes", allMeetings],
    queryFn: async ({ queryKey }) => {
      const currentMeetings = queryKey[1] as Reuniao[] | null;
      if (!currentMeetings) return [];

      const minutesPromises = currentMeetings.map(async (meeting) => {
        const minutes = await getAtasReuniaoByReuniaoId(meeting.id);
        return (minutes || []).map(ata => ({
          ...ata,
          reuniao_titulo: meeting.titulo,
          comite_nome: comites?.find(c => c.id === meeting.comite_id)?.nome || 'N/A',
          comite_id: meeting.comite_id, // Incluir o ID do comitê
        }));
      });
      const results = await Promise.all(minutesPromises);
      return results.flat().filter(Boolean) as FullAtaReuniao[];
    },
    enabled: !!allMeetings && canViewAtasReuniao && !permissionsLoading,
  });

  const filteredAndSortedMinutes = React.useMemo(() => {
    let filtered = allMinutes || [];

    if (comiteFilter !== 'all') {
      filtered = filtered.filter(ata => {
        return ata.comite_id === comiteFilter;
      });
    }

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(ata =>
        ata.reuniao_titulo?.toLowerCase().includes(query) ||
        ata.comite_nome?.toLowerCase().includes(query) ||
        ata.conteudo?.toLowerCase().includes(query) ||
        ata.decisoes_tomadas?.toLowerCase().includes(query) ||
        ata.participantes?.toLowerCase().includes(query) ||
        ata.objetivos_reuniao?.toLowerCase().includes(query) ||
        ata.pauta_tratada?.toLowerCase().includes(query) ||
        ata.novos_topicos?.toLowerCase().includes(query) ||
        ata.proximos_passos?.toLowerCase().includes(query)
      );
    }

    // Sort logic
    filtered.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortBy === 'data_reuniao') {
        valA = a.data_reuniao ? parseISO(a.data_reuniao) : new Date(0);
        valB = b.data_reuniao ? parseISO(b.data_reuniao) : new Date(0);
        return sortOrder === 'asc' ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
      } else if (sortBy === 'reuniao_titulo') {
        valA = a.reuniao_titulo || '';
        valB = b.reuniao_titulo || '';
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortBy === 'comite_nome') {
        valA = a.comite_nome || '';
        valB = b.comite_nome || '';
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortBy === 'created_by_name') {
        valA = a.created_by_name || '';
        valB = b.created_by_name || '';
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return 0;
    });

    return filtered;
  }, [allMinutes, comiteFilter, debouncedSearchQuery, sortBy, sortOrder, allMeetings, comites]);

  const handleSort = (column: keyof FullAtaReuniao) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (isLoadingComites || isLoadingAllMeetings || isLoadingAllMinutes || permissionsLoading) {
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

  if (error) {
    return (
      <div className="text-center text-red-500">
        Erro ao carregar atas de reunião: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold flex items-center">
            <MessageSquare className="mr-2 h-6 w-6" /> Atas de Reunião
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar atas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={comiteFilter} onValueChange={setComiteFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por Comitê" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Comitês</SelectItem>
                {comites?.map((comite) => (
                  <SelectItem key={comite.id} value={comite.id}>{comite.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredAndSortedMinutes && filteredAndSortedMinutes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('reuniao_titulo')}
                      className="flex items-center px-0 py-0 h-auto"
                    >
                      Reunião
                      {sortBy === 'reuniao_titulo' && (
                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('comite_nome')}
                      className="flex items-center px-0 py-0 h-auto"
                    >
                      Comitê
                      {sortBy === 'comite_nome' && (
                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('data_reuniao')}
                      className="flex items-center px-0 py-0 h-auto"
                    >
                      Data da Ata
                      {sortBy === 'data_reuniao' && (
                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('created_by_name')}
                      className="flex items-center px-0 py-0 h-auto"
                    >
                      Criado Por
                      {sortBy === 'created_by_name' && (
                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedMinutes.map((ata) => (
                  <TableRow key={ata.id}>
                    <TableCell className="font-medium">{ata.reuniao_titulo}</TableCell>
                    <TableCell>{ata.comite_nome}</TableCell>
                    <TableCell>{ata.data_reuniao ? format(parseISO(ata.data_reuniao), "PPP", { locale: ptBR }) : 'N/A'}</TableCell>
                    <TableCell>{ata.created_by_name}</TableCell>
                    <TableCell className="text-right">
                      <Link to={`/comites/atas/${ata.id}`}> {/* NOVO: Link para a nova página de detalhes da ata */}
                        <Button variant="ghost" size="sm">
                          Ver Detalhes
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-600">Nenhuma ata de reunião encontrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MeetingMinutesList;