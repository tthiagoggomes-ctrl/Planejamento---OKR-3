"use client";

import React from "react";
import { Droppable } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { KanbanColumnHeader } from "./KanbanColumnHeader";
import { KanbanColumnFooter } from "./KanbanColumnFooter";
import { KanbanCard, GenericActivity } from "./KanbanCard"; // Import GenericActivity

interface ColumnConfig {
  id: GenericActivity['status'];
  title: string;
  icon: React.ReactNode;
  colorClass: string;
}

interface KanbanColumnProps<T extends GenericActivity> {
  column: ColumnConfig;
  activities: T[];
  isExpanded: boolean;
  onToggleExpansion: (columnId: GenericActivity['status']) => void;
  onEdit: (atividade: T) => void;
  onDelete: (atividadeId: string) => void;
  canEditAtividades: boolean;
  canDeleteAtividades: boolean;
  canChangeActivityStatus: boolean;
}

export const KanbanColumn = <T extends GenericActivity>({
  column,
  activities,
  isExpanded,
  onToggleExpansion,
  onEdit,
  onDelete,
  canEditAtividades,
  canDeleteAtividades,
  canChangeActivityStatus,
}: KanbanColumnProps<T>) => {
  const displayedActivities = isExpanded ? activities : activities.slice(-5);

  return (
    <Droppable droppableId={column.id} isDropDisabled={!canChangeActivityStatus}>
      {(provided) => (
        <Card
          className="flex flex-col h-full"
          ref={provided.innerRef}
          {...provided.droppableProps}
        >
          <KanbanColumnHeader
            title={column.title}
            icon={column.icon}
            count={activities.length}
            colorClass={column.colorClass}
          />
          <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto">
            {displayedActivities.map((atividade, index) => (
              <KanbanCard
                key={atividade.id}
                atividade={atividade}
                index={index}
                onEdit={onEdit}
                onDelete={onDelete}
                canEditAtividades={canEditAtividades}
                canDeleteAtividades={canDeleteAtividades}
                isDragDisabled={!canChangeActivityStatus}
              />
            ))}
            {provided.placeholder}
          </CardContent>
          <KanbanColumnFooter
            activitiesCount={activities.length}
            displayedActivitiesCount={displayedActivities.length}
            isExpanded={isExpanded}
            onToggleExpansion={() => onToggleExpansion(column.id)}
          />
        </Card>
      )}
    </Droppable>
  );
};