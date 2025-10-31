"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ListTodo, Clock, Hourglass, CheckCircle, StopCircle } from 'lucide-react';
import { getAtividades, Atividade } from '@/integrations/supabase/api/atividades';
import { showError } from '@/utils/toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const RecentActivitiesList: React.FC = () => {
  const navigate = useNavigate(); // Initialize useNavigate

  const { data: atividades, isLoading, error } = useQuery<Atividade[], Error>({
    queryKey: ["recentActivities"],
    queryFn: async () => (await getAtividades(5)) || [], // Ensure it always returns an array
  });

  const getStatusBadgeClass = (status: Atividade['status']) => {
    switch (status) {
      case 'todo': return 'bg-gray-900 text-white';
      case 'in_progress': return 'bg-blue-600 text-white';
      case 'done': return 'bg-green-600 text-white';
      case 'stopped': return 'bg-red-600 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Atividade['status']) => {
    switch (status) {
      case 'todo': return <Clock className="h-3 w-3 mr-1" />;
      case 'in_progress': return <Hourglass className="h-3 w-3 mr-1" />;
      case 'done': return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'stopped': return <StopCircle className="h-3 w-3 mr-1" />;
      default: return null;
    }
  };

  const handleActivityClick = (atividade: Atividade) => {
    if (atividade.key_result_objetivo_id && atividade.key_result_id) {
      navigate(`/objetivos/${atividade.key_result_objetivo_id}`, { state: { keyResultId: atividade.key_result_id } });
    } else {
      showError("Não foi possível navegar para o objetivo/KR associado.");
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <ListTodo className="mr-2 h-5 w-5" /> Atividades Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    showError("Erro ao carregar atividades recentes.");
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <ListTodo className="mr-2 h-5 w-5" /> Atividades Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-red-500">
          Erro ao carregar dados.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <ListTodo className="mr-2 h-5 w-5" /> Atividades Recentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {atividades && atividades.length > 0 ? (
          atividades.map((atividade: Atividade) => ( // Explicitly type 'atividade'
            <div
              key={atividade.id}
              className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-md transition-colors"
              onClick={() => handleActivityClick(atividade)}
            >
              <div>
                <p className="font-medium text-sm">{atividade.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  Atualizado em {atividade.updated_at ? format(new Date(atividade.updated_at), "PPP 'às' HH:mm") : 'N/A'}
                </p>
              </div>
              <Badge className={getStatusBadgeClass(atividade.status)}>
                {getStatusIcon(atividade.status)}
                {atividade.status === 'todo' && 'A Fazer'}
                {atividade.status === 'in_progress' && 'Em Progresso'}
                {atividade.status === 'done' && 'Concluído'}
                {atividade.status === 'stopped' && 'Parado'}
              </Badge>
            </div>
          ))
        ) : (
          <p className="text-gray-600">Nenhuma atividade recente.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivitiesList;