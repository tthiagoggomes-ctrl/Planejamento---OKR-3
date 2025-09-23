"use client";

import React from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Atividade } from "@/integrations/supabase/api/atividades";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ListTodo, Hourglass, CheckCircle, Edit, Trash2 } from "lucide-react";
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
    colorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  },
  in_progress: {
    id: 'in_progress',
    title: 'Em Progresso',
    icon: <Hourglass className="h-4 w-4" />,
    colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200',
  },
  done: {
    id: 'done',
    title: 'Concluído',
    icon: <CheckCircle className="h-4 w-4" />,
    colorClass: 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200',
  },
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ atividades, onStatusChange, onEdit, onDelete }) => {
  const [orderedAtividades, setOrderedAtividades] = React.useState<Atividade[]>(atividades);

  React.useEffect(() => {
    setOrderedAtividades(atividades);
  }, [atividades]);

  const getActivitiesByStatus = (status: ColumnId) => {
    return orderedAtividades.filter(atividade => atividade.status === status);
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

    const newOrderedAtividades = Array.from(orderedAtividades);
    newOrderedAtividades.splice(source.index, 1);
    newOrderedAtividades.splice(destination.index, 0, draggedAtividade);

    setOrderedAtividades(newOrderedAtividades);

    const newStatus = destination.droppableId as Atividade['status'];
    if (draggedAtividade.status !== newStatus) {
      onStatusChange(draggedAtividade.id, newStatus);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.values(columns).map(column => (
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
                  <Badge variant="secondary" className="text-sm">
                    {getActivitiesByStatus(column.id).length}
                  </Badge>
                </CardHeader>
                <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto">
                  {getActivitiesByStatus(column.id).map((atividade, index) => (
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
                </CardContent>
              </Card>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
};