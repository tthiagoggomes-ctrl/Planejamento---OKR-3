"use client";

import React from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Atividade } from "@/integrations/supabase/api/atividades";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ListTodo, Hourglass, CheckCircle, Edit, Trash2, Kanban, StopCircle } from "lucide-react"; // Adicionado StopCircle
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/auth/SessionContextProvider"; // Import useSession
import { Objetivo } from "@/integrations/supabase/api/objetivos"; // Import Objetivo
import { KeyResult } from "@/integrations/supabase/api/key_results"; // Import KeyResult

interface KanbanBoardProps {
  atividades: Atividade[];
  onStatusChange: (atividadeId: string, newStatus: Atividade['status']) => void;
  onEdit: (atividade: Atividade) => void;
  onDelete: (atividadeId: string) => void;
  objetivosMap: Map<string, Objetivo>; // Pass objectives map for area check
  keyResultsMap: Map<string, KeyResult>; // Pass key results map for objective_id
}

type ColumnId = Atividade['status'];

interface Column {
  id: ColumnId;
  title: string;
  icon: React.ReactNode;
  colorClass: string;
}

const columns: Record<ColumnId, Column> = {
  todo: {
    id: 'todo',
    title: 'A Fazer',
    icon: <ListTodo className="h-4 w-4" />,
    colorClass: 'bg-gray-900 text-white dark:bg-gray-900 dark:text-white', // Preto
  },
  in_progress: {
    id: 'in_progress',
    title: 'Em Progresso',
    icon: <Hourglass className="h-4 w-4" />,
    colorClass: 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white', // Azul
  },
  stopped: { // Nova coluna 'Parado'
    id: 'stopped',
    title: 'Parado',
    icon: <StopCircle className="h-4 w-4" />,
    colorClass: 'bg-red-600 text-white dark:bg-red-600 dark:text-white', // Vermelho
  },
  done: {
    id: 'done',
    title: 'Concluído',
    icon: <CheckCircle className="h-4 w-4" />,
    colorClass: 'bg-green-600 text-white dark:bg-green-600 dark:text-white', // Verde
  },
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ atividades, onStatusChange, onEdit, onDelete, objetivosMap, keyResultsMap }) => {
  const { user, userProfile: currentUserProfile } = useSession();
  const isAdmin = currentUserProfile?.permissao === 'administrador';
  const isDiretoria = currentUserProfile?.permissao === 'diretoria';
  const isGerente = currentUserProfile?.permissao === 'gerente';
  const isSupervisor = currentUserProfile?.permissao === 'supervisor';
  const isUsuario = currentUserProfile?.permissao === 'usuario';
  const currentUserAreaId = currentUserProfile?.area_id;

  const [orderedAtividades, setOrderedAtividades] = React.useState<Atividade[]>(atividades);

  React.useEffect(() => {
    setOrderedAtividades(atividades);
  }, [atividades]);

  const getActivitiesByStatus = (status: ColumnId) => {
    return orderedAtividades.filter(atividade => atividade.status === status);
  };

  const canEditAtividade = (atividade: Atividade) => {
    const parentKr = keyResultsMap.get(atividade.key_result_id);
    const parentObjetivo = parentKr ? objetivosMap.get(parentKr.objetivo_id) : null;

    return isAdmin || isDiretoria ||
      ((isGerente || isSupervisor) && parentObjetivo && currentUserAreaId === parentObjetivo.area_id) ||
      (isUsuario && atividade.user_id === user?.id);
  };

  const canDeleteAtividade = (atividade: Atividade) => {
    const parentKr = keyResultsMap.get(atividade.key_result_id);
    const parentObjetivo = parentKr ? objetivosMap.get(parentKr.objetivo_id) : null;

    return isAdmin || isDiretoria || ((isGerente || isSupervisor) && parentObjetivo && currentUserAreaId === parentObjetivo.area_id);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const draggedAtividade = orderedAtividades.find(ativ => ativ.id === draggableId);
    if (!draggedAtividade) return;

    // Check if the user has permission to change the status of this activity
    if (!canEditAtividade(draggedAtividade)) {
      showError("Você não tem permissão para alterar o status desta atividade.");
      return;
    }

    // Temporarily update local state for immediate visual feedback
    const newOrderedAtividades = Array.from(orderedAtividades);
    const sourceActivities = newOrderedAtividades.filter(a => a.status === source.droppableId);
    const destinationActivities = newOrderedAtividades.filter(a => a.status === destination.droppableId);

    // Remove from source
    sourceActivities.splice(source.index, 1);
    // Add to destination
    destinationActivities.splice(destination.index, 0, { ...draggedAtividade, status: destination.droppableId as Atividade['status'] });

    // Reconstruct the full list
    const updatedList = [
      ...sourceActivities,
      ...destinationActivities,
      ...newOrderedAtividades.filter(a => a.status !== source.droppableId && a.status !== destination.droppableId)
    ];
    setOrderedAtividades(updatedList);


    const newStatus = destination.droppableId as Atividade['status'];
    if (draggedAtividade.status !== newStatus) {
      onStatusChange(draggedAtividade.id, newStatus);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4"> {/* Alterado para 4 colunas */}
        {Object.values(columns).map(column => (
          <Droppable droppableId={column.id} key={column.id} isDropDisabled={!isAdmin && !isDiretoria && !isGerente && !isSupervisor && !isUsuario}>
            {(provided) => (
              <Card
                className="flex flex-col h-full"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-3 ${column.colorClass}`}>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    {column.icon} {column.title}
                  </CardTitle>
                  <Badge variant="secondary" className="text-sm bg-white text-gray-900 dark:bg-gray-200 dark:text-gray-900">
                    {getActivitiesByStatus(column.id).length}
                  </Badge>
                </CardHeader>
                <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto">
                  {getActivitiesByStatus(column.id).map((atividade, index) => (
                    <Draggable key={atividade.id} draggableId={atividade.id} index={index} isDragDisabled={!canEditAtividade(atividade)}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <Card className="bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-semibold text-base">{atividade.titulo}</h4>
                                <div className="flex space-x-1">
                                  {canEditAtividade(atividade) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => onEdit(atividade)}
                                      className="h-7 w-7"
                                    >
                                      <Edit className="h-4 w-4" />
                                      <span className="sr-only">Editar Atividade</span>
                                    </Button>
                                  )}
                                  {canDeleteAtividade(atividade) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => onDelete(atividade.id)}
                                      className="h-7 w-7"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Excluir Atividade</span>
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                KR: {atividade.key_result_title || 'N/A'}
                              </p>
                              <p className="text-sm text-muted-foreground mb-1">
                                Responsável: {atividade.assignee_name || 'N/A'}
                              </p>
                              {atividade.due_date && (
                                <p className="text-sm text-muted-foreground">
                                  Vencimento: {format(new Date(atividade.due_date), "PPP")}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </CardContent>
              </Card>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
};