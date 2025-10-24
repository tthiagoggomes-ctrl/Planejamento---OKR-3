"use client";

import React from "react";
import { Draggable } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

// Define a interface genérica para atividades que o KanbanBoard pode exibir
export interface GenericActivity {
  id: string;
  titulo: string;
  status: 'todo' | 'in_progress' | 'done' | 'stopped';
  assignee_name?: string;
  due_date?: string | null;
  key_result_title?: string; // Para atividades de planejamento estratégico
  reuniao_titulo?: string; // Para atividades de comitê
}

interface KanbanCardProps<T extends GenericActivity> {
  atividade: T;
  index: number;
  onEdit: (atividade: T) => void;
  onDelete: (atividadeId: string) => void;
  canEditAtividades: boolean;
  canDeleteAtividades: boolean;
  isDragDisabled: boolean;
}

export const KanbanCard = <T extends GenericActivity>({
  atividade,
  index,
  onEdit,
  onDelete,
  canEditAtividades,
  canDeleteAtividades,
  isDragDisabled,
}: KanbanCardProps<T>) => {
  return (
    <Draggable key={atividade.id} draggableId={atividade.id} index={index} isDragDisabled={isDragDisabled}>
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
                  {canEditAtividades && (
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
                  {canDeleteAtividades && (
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
                {atividade.key_result_title ? `KR: ${atividade.key_result_title}` : `Reunião: ${atividade.reuniao_titulo || 'N/A'}`}
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
  );
};