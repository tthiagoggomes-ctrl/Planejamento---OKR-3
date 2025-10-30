"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessageSquare, Search, ArrowUp, ArrowDown, CheckCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Enquete, getEnquetes, voteOnEnquete } from "@/integrations/supabase/api/enquetes";
import { getComites, Comite } from "@/integrations/supabase/api/comites";
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useSession } from "@/components/auth/SessionContextProvider";
import { format, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { showError, showSuccess } from "@/utils/toast";
import { ChevronDown, ChevronUp } from "lucide-react";

const PollsList = () => {
  const queryClient = useQueryClient();
  const { can, isLoading: permissionsLoading } = useUserPermissions();
  const { user } = useSession();

  const canViewEnquetes = can('enquetes', 'view');
  const canVoteEnquete = can('votos_enquete', 'vote');
  const canViewVotosEnquete = can('votos_enquete', 'view');

  const [searchQuery, setSearchQuery] = React.useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [comiteFilter, setComiteFilter] = React.useState<string | 'all'>('all');
  const [sortBy, setSortBy] = React.useState<keyof Enquete>('created_at');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [expandedPolls, setExpandedPolls] = React.useState<Set<string>>(new Set());
  const [selectedVoteOptions, setSelectedVoteOptions] = React.useState<Record<string, string | null>>({});

  const now = React.useRef(new Date()).current;

  const { data: comites, isLoading: isLoadingComites } = useQuery<Comite[] | null, Error>({
    queryKey: ["comites"],
    queryFn: getComites,
    enabled: canViewEnquetes && !permissionsLoading,
  });

  const { data: allPolls, isLoading: isLoadingAllPolls, error } = useQuery<Enquete[] | null, Error>({
    queryKey: ["allPolls", user?.id],
    queryFn: () => getEnquetes({ currentUserId: user?.id }),
    enabled: canViewEnquetes && !permissionsLoading,
  });

  const voteOnEnqueteMutation = useMutation({
    mutationFn: ({ enqueteId, opcaoId }: { enqueteId: string; opcaoId: string }) => {
      if (!user?.id) {
        throw new Error("User not authenticated.");
      }
      if (!canVoteEnquete) {
        throw new Error("Você não tem permissão para votar em enquetes.");
      }
      return voteOnEnquete(enqueteId, opcaoId, user.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["allPolls"] }); // Invalidate all polls to refetch counts and user vote
      showSuccess("Voto registrado com sucesso!");
      setSelectedVoteOptions(prev => ({ ...prev, [variables.enqueteId]: variables.opcaoId }));
    },
    onError: (err) => {
      showError(`Erro ao registrar voto: ${err.message}`);
    },
  });

  React.useEffect(() => {
    if (allPolls) {
      const initialSelections: Record<string, string | null> = {};
      allPolls.forEach(poll => {
        initialSelections[poll.id] = poll.user_vote?.opcao_id || null;
      });
      setSelectedVoteOptions(initialSelections);
    }
  }, [allPolls]);

  const filteredAndSortedPolls = React.useMemo(() => {
    let filtered = allPolls || [];

    if (comiteFilter !== 'all') {
      filtered = filtered.filter(poll => {
        return poll.comite_id === comiteFilter;
      });
    }

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(poll =>
        poll.titulo.toLowerCase().includes(query) ||
        poll.descricao?.toLowerCase().includes(query) ||
        poll.comite_name?.toLowerCase().includes(query) ||
        poll.created_by_name?.toLowerCase().includes(query) ||
        poll.opcoes?.some(opt => opt.texto_opcao.toLowerCase().includes(query))
      );
    }

    // Sort logic
    filtered.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortBy === 'titulo') {
        valA = a.titulo || '';
        valB = b.titulo || '';
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortBy === 'comite_name') {
        valA = a.comite_name || '';
        valB = b.comite_name || '';
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortBy === 'start_date') {
        valA = parseISO(a.start_date);
        valB = parseISO(b.start_date);
        return sortOrder === 'asc' ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
      } else if (sortBy === 'end_date') {
        valA = parseISO(a.end_date);
        valB = parseISO(b.end_date);
        return sortOrder === 'asc' ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
      } else if (sortBy === 'created_by_name') {
        valA = a.created_by_name || '';
        valB = b.created_by_name || '';
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortBy === 'created_at') {
        valA = parseISO(a.created_at || '');
        valB = parseISO(b.created_at || '');
        return sortOrder === 'asc' ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
      }
      return 0;
    });

    return filtered;
  }, [allPolls, comiteFilter, debouncedSearchQuery, sortBy, sortOrder]);

  const handleSort = (column: keyof Enquete) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const togglePollExpansion = (pollId: string) => {
    setExpandedPolls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pollId)) {
        newSet.delete(pollId);
      } else {
        newSet.add(pollId);
      }
      return newSet;
    });
  };

  if (isLoadingComites || isLoadingAllPolls || permissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewEnquetes) {
    return (
      <div className="container mx-auto py-6 text-center text-red-500">
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        Erro ao carregar enquetes: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold flex items-center">
            <MessageSquare className="mr-2 h-6 w-6" /> Enquetes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar enquetes..."
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

          {filteredAndSortedPolls && filteredAndSortedPolls.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('titulo')}
                      className="flex items-center px-0 py-0 h-auto"
                    >
                      Título
                      {sortBy === 'titulo' && (
                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('comite_name')}
                      className="flex items-center px-0 py-0 h-auto"
                    >
                      Comitê
                      {sortBy === 'comite_name' && (
                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('start_date')}
                      className="flex items-center px-0 py-0 h-auto"
                    >
                      Período
                      {sortBy === 'start_date' && (
                        sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
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
                  <TableHead className="text-right">Votos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedPolls.map((poll) => {
                  const isPollActive = isWithinInterval(now, {
                    start: parseISO(poll.start_date),
                    end: parseISO(poll.end_date)
                  });
                  const hasVoted = !!poll.user_vote;
                  const canUserVote = canVoteEnquete && isPollActive && user?.id;
                  const isExpanded = expandedPolls.has(poll.id);

                  return (
                    <React.Fragment key={poll.id}>
                      <TableRow>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePollExpansion(poll.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            <span className="sr-only">Expandir/Colapsar Enquete</span>
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{poll.titulo}</TableCell>
                        <TableCell>{poll.comite_name}</TableCell>
                        <TableCell>
                          {format(parseISO(poll.start_date), "PPP", { locale: ptBR })} - {format(parseISO(poll.end_date), "PPP", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            isPollActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isPollActive ? 'Ativa' : 'Encerrada'}
                          </span>
                        </TableCell>
                        <TableCell>{poll.created_by_name}</TableCell>
                        <TableCell className="text-right">
                          {poll.total_votes} votos
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={7} className="p-0">
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 border-t border-b">
                              <p className="text-sm text-muted-foreground mb-3">{poll.descricao}</p>
                              {poll.opcoes && poll.opcoes.length > 0 ? (
                                <>
                                  <h4 className="font-medium mb-2">Opções da Enquete</h4>
                                  <RadioGroup
                                    onValueChange={(value) => setSelectedVoteOptions(prev => ({ ...prev, [poll.id]: value }))}
                                    value={selectedVoteOptions[poll.id] || ""}
                                    disabled={!canUserVote || voteOnEnqueteMutation.isPending}
                                  >
                                    {poll.opcoes.map(option => {
                                      const percentage = poll.total_votes && poll.total_votes > 0
                                        ? Math.round((option.vote_count! / poll.total_votes) * 100)
                                        : 0;
                                      return (
                                        <div key={option.id} className="flex items-center space-x-2 mb-2">
                                          <RadioGroupItem
                                            value={option.id}
                                            id={`option-${option.id}-${poll.id}`}
                                          />
                                          <Label htmlFor={`option-${option.id}-${poll.id}`} className="flex-1">
                                            <div className="flex justify-between text-sm">
                                              <span>{option.texto_opcao}</span>
                                              {canViewVotosEnquete && <span>{percentage}% ({option.vote_count} votos)</span>}
                                            </div>
                                            {canViewVotosEnquete && <Progress value={percentage} className="h-2 mt-1" />}
                                          </Label>
                                        </div>
                                      );
                                    })}
                                  </RadioGroup>
                                  {canUserVote && (
                                    <Button
                                      size="sm"
                                      className="mt-3"
                                      onClick={() => voteOnEnqueteMutation.mutate({ enqueteId: poll.id, opcaoId: selectedVoteOptions[poll.id]! })}
                                      disabled={!selectedVoteOptions[poll.id] || voteOnEnqueteMutation.isPending}
                                    >
                                      {voteOnEnqueteMutation.isPending && voteOnEnqueteMutation.variables?.enqueteId === poll.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                      {hasVoted ? "Alterar Voto" : "Votar"}
                                    </Button>
                                  )}
                                  {!isPollActive && <p className="text-sm text-red-500 mt-2">Esta enquete não está ativa para votação.</p>}
                                  {hasVoted && isPollActive && <p className="text-sm text-green-600 mt-2 flex items-center"><CheckCircle className="h-4 w-4 mr-1" /> Você já votou nesta enquete.</p>}
                                </>
                              ) : (
                                <p className="text-gray-600 text-center py-2">Nenhuma opção cadastrada para esta enquete.</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-600">Nenhuma enquete encontrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PollsList;