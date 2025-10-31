"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, PlusCircle, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Enquete } from "@/integrations/supabase/api/enquetes";
import { format, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useSession } from "@/components/auth/SessionContextProvider";

interface CommitteePollsSectionProps {
  polls: Enquete[] | null;
  isLoadingPolls: boolean;
  errorPolls: Error | null;
  canViewEnquetes: boolean;
  canInsertEnquetes: boolean;
  canEditEnquetes: boolean;
  canDeleteEnquetes: boolean;
  canViewVotosEnquete: boolean;
  canVoteEnquete: boolean;
  onAddEnqueteClick: () => void;
  onEditEnqueteClick: (enquete: Enquete) => void;
  onDeleteEnqueteClick: (enqueteId: string) => void;
  onVoteEnquete: (enqueteId: string, opcaoId: string) => void;
  expandedPolls: Set<string>;
  togglePollExpansion: (pollId: string) => void;
  selectedVoteOptions: Record<string, string | null>;
  setSelectedVoteOptions: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
  isVotingPending: boolean;
}

export const CommitteePollsSection: React.FC<CommitteePollsSectionProps> = ({
  polls,
  isLoadingPolls,
  errorPolls,
  canViewEnquetes,
  canInsertEnquetes,
  canEditEnquetes,
  canDeleteEnquetes,
  canViewVotosEnquete,
  canVoteEnquete,
  onAddEnqueteClick,
  onEditEnqueteClick,
  onDeleteEnqueteClick,
  onVoteEnquete,
  expandedPolls,
  togglePollExpansion,
  selectedVoteOptions,
  setSelectedVoteOptions,
  isVotingPending,
}) => {
  const now = React.useRef(new Date()).current;
  const { user } = useSession();
  const { can } = useUserPermissions(); // To check for admin/edit permissions for poll creator

  if (!canViewEnquetes) {
    return null; // Or a message indicating no permission
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold flex items-center">
          <MessageSquare className="mr-2 h-5 w-5" /> Enquetes ({polls?.length || 0})
        </CardTitle>
        {canInsertEnquetes && (
          <Button size="sm" variant="outline" onClick={onAddEnqueteClick}>
            <PlusCircle className="mr-2 h-4 w-4" /> Criar Enquete
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoadingPolls ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : errorPolls ? (
          <p className="text-red-500">Erro ao carregar enquetes: {errorPolls.message}</p>
        ) : polls && polls.length > 0 ? (
          <div className="space-y-4">
            {polls.map(poll => {
              const isPollActive = isWithinInterval(now, {
                start: parseISO(poll.start_date),
                end: parseISO(poll.end_date)
              });
              const hasVoted = !!poll.user_vote;
              const canUserVote = canVoteEnquete && isPollActive && user?.id;
              const isCreatorOrAdmin = user?.id === poll.created_by || can('enquetes', 'edit');

              return (
                <div key={poll.id} className="border rounded-md p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-lg">{poll.titulo}</h3>
                    <div className="flex items-center gap-2">
                      {(canEditEnquetes || isCreatorOrAdmin) && (
                        <Button variant="ghost" size="icon" onClick={() => onEditEnqueteClick(poll)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {(canDeleteEnquetes || isCreatorOrAdmin) && (
                        <Button variant="ghost" size="icon" onClick={() => onDeleteEnqueteClick(poll.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => togglePollExpansion(poll.id)}>
                        {expandedPolls.has(poll.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{poll.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    Período: {format(new Date(poll.start_date), "PPP", { locale: ptBR })} - {format(new Date(poll.end_date), "PPP", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">Criado por: {poll.created_by_name}</p>

                  {expandedPolls.has(poll.id) && (
                    <div className="mt-3 pt-3 border-t">
                      {poll.opcoes && poll.opcoes.length > 0 ? (
                        <>
                          <h4 className="font-medium mb-2">Opções da Enquete</h4>
                          <RadioGroup
                            onValueChange={(value) => setSelectedVoteOptions(prev => ({ ...prev, [poll.id]: value }))}
                            value={selectedVoteOptions[poll.id] || ""}
                            disabled={!canUserVote || isVotingPending}
                          >
                            {poll.opcoes.map(option => {
                              const percentage = poll.total_votes && poll.total_votes > 0
                                ? Math.round((option.vote_count! / poll.total_votes) * 100)
                                : 0;
                              return (
                                <div key={option.id} className="flex items-center space-x-2 mb-2">
                                  <RadioGroupItem
                                    value={option.id}
                                    id={`option-${option.id}`}
                                  />
                                  <Label htmlFor={`option-${option.id}`} className="flex-1">
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
                              onClick={() => onVoteEnquete(poll.id, selectedVoteOptions[poll.id]!)}
                              disabled={!selectedVoteOptions[poll.id] || isVotingPending}
                            >
                              {isVotingPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              {hasVoted ? "Alterar Voto" : "Votar"}
                            </Button>
                          )}
                          {!isPollActive && <p className="text-sm text-red-500 mt-2">Esta enquete não está ativa para votação.</p>}
                          {hasVoted && isPollActive && <p className="text-sm text-green-600 mt-2">Você já votou nesta enquete.</p>}
                        </>
                      ) : (
                        <p className="text-gray-600 text-center py-2">Nenhuma opção cadastrada para esta enquete.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-600">Nenhuma enquete ativa para este comitê.</p>
        )}
      </CardContent>
    </Card>
  );
};