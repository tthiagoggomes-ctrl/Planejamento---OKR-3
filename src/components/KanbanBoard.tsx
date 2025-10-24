"use client";

import React from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import { ListTodo, Hourglass, CheckCircle, StopCircle } from "lucide-react";
import { showError } from "@/utils/toast";
import { KanbanColumn } from "./kanban/KanbanColumn";
import { GenericActivity } from "./kanban/KanbanCard"; // Import GenericActivity

interface KanbanBoardProps<T extends GenericActivity> {
  atividades: T[];
  onStatusChange: (atividadeId: string, newStatus: T['status']) => void;
  onEdit: (atividade: T) => void;
  onDelete: (atividadeId: string) => void;
  canEditAtividades: boolean;
  canDeleteAtividades: boolean;
  canChangeActivityStatus: boolean;
}

type ColumnId = GenericActivity['status'];

interface ColumnConfig {
  id: ColumnId;
  title: string;
  icon: React.ReactNode;
  colorClass: string;
}

const columns: Record<ColumnId, ColumnConfig> = {
  todo: {
    id: 'todo',
    title: 'A Fazer',
    icon: <ListTodo className="h-4 w-4" />,
    colorClass: 'bg-gray-900 text-white dark:bg-gray-900 dark:text-white',
  },
  in_progress: {
    id: 'in_progress',
    title: 'Em Progresso',
    icon: <Hourglass className="h-4 w-4" />,
    colorClass: 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white',
  },
  stopped: {
    id: 'stopped',
    title: 'Parado',
    icon: <StopCircle className="h-4 w-4" />,
    colorClass: 'bg-red-600 text-white dark:bg-red-600 dark:text-white',
  },
  done: {
    id: 'done',
    title: 'Concluído',
    icon: <CheckCircle className="h-4 w-4" />,
    colorClass: 'bg-green-600 text-white dark:bg-green-600 dark:text-white',
  },
};

export const KanbanBoard = <T extends GenericActivity>({
  atividades,
  onStatusChange,
  onEdit,
  onDelete,
  canEditAtividades,
  canDeleteAtividades,
  canChangeActivityStatus,
}: KanbanBoardProps<T>) => {
  const [orderedAtividades, setOrderedAtividades] = React.useState<T[]>(atividades);
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

    if (!canChangeActivityStatus) {
      showError("Você não tem permissão para alterar o status de atividades.");
      return;
    }

    const draggedAtividade = orderedAtividades.find(ativ => ativ.id === draggableId);
    if (!draggedAtividade) return;

    const newStatus = destination.droppableId as T['status'];

    // Optimistic update
    const newOrderedAtividades = Array.from(orderedAtividades);
    const sourceActivities = newOrderedAtividades.filter(a => a.status === source.droppableId);
    const destinationActivities = newOrderedAtividades.filter(a => a.status === destination.droppableId);

    // Remove from source
    sourceActivities.splice(source.index, 1);
    // Add to destination
    destinationActivities.splice(destination.index, 0, { ...draggedAtividade, status: newStatus });

    // Reconstruct the full list
    const updatedList = [
      ...sourceActivities,
      ...destinationActivities,
      ...newOrderedAtividades.filter(a => a.status !== source.droppableId && a.status !== destination.droppableId)
    ];
    setOrderedAtividades(updatedList);

    // Call the actual status change handler
    if (draggedAtividade.status !== newStatus) {
      onStatusChange(draggedAtividade.id, newStatus);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.values(columns).map(column => (
          <KanbanColumn
            key={column.id}
            column={column}
            activities={getActivitiesByStatus(column.id)}
            isExpanded={expandedColumns[column.id]}
            onToggleExpansion={toggleColumnExpansion}
            onEdit={onEdit}
            onDelete={onDelete}
            canEditAtividades={canEditAtividades}
            canDeleteAtividades={canDeleteAtividades}
            canChangeActivityStatus={canChangeActivityStatus}
          />
        ))}
      </div>
    </DragDropContext>
  );
};