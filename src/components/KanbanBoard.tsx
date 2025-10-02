"use client";

import React from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Atividade } from "@/integrations/supabase/api/atividades";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ListTodo, Hourglass, CheckCircle, Edit, Trash2, Kanban, StopCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KanbanBoardProps {
  atividades: Atividade[];
  onStatusChange: (atividadeId: string, newStatus: Atividade['status']) => void;
  onEdit: (atividade: Atividade) => void;
  onDelete: (atividadeId: string) => void;
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
  stopped: {
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

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ atividades, onStatusChange, onEdit, onDelete }) => {
  const [orderedAtividades, setOrderedAtividades] = React.useState<Atividade[]>(atividades);
  const [expandedColumns, setExpandedColumns] = React.useState<Record<ColumnId, boolean>>({
    todo: false,
    in_progress: false,
    stopped: false,
    done: false,
  });

  React.useEffect(() => {
    setOrderedAtividades(atividades);
  }, [atividades]);

  const getActivitiesByStatus = (status: ColumnId) => {
    return orderedAtividades.filter(atividade => atividade.status === status);
  };

  const toggleColumnExpansion = (columnId: ColumnId) => {
    setExpandedColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.values(columns).map(column => {
          const activitiesInColumn = getActivitiesByStatus(column.id);
          const displayedActivities = expandedColumns[column.id] ? activitiesInColumn : activitiesInColumn.slice(-5); // Show last 5 or all

          return (
            <Droppable droppableId={column.id} key={column.id}>
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
                      {activitiesInColumn.length}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto">
                    {displayedActivities.map((atividade, index) => (
                      <Draggable key={atividade.id} draggableId={atividade.id} index={index}>
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
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => onEdit(atividade)}
                                      className="h-7 w-7"
                                    >
                                      <Edit className="h-4 w-4" />
                                      <span className="sr-only">Editar Atividade</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => onDelete(atividade.id)}
                                      className="h-7 w-7"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Excluir Atividade</span>
                                    </Button>
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
                    {activitiesInColumn.length > 5 && (
                      <Button
                        variant="ghost"
                        className="w-full mt-2 text-sm"
                        onClick={() => toggleColumnExpansion(column.id)}
                      >
                        {expandedColumns[column.id] ? (
                          <>
                            <ChevronUp className="mr-2 h-4 w-4" /> Ocultar
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-2 h-4 w-4" /> Ver todas ({activitiesInColumn.length - 5} mais)
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
};