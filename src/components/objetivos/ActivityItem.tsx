"use client";

import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Atividade } from "@/integrations/supabase/api/atividades";
import { format } from "date-fns";

interface ActivityItemProps {
  atividade: Atividade;
  onEdit: (atividade: Atividade) => void;
  onDelete: (atividadeId: string) => void;
  getAtividadeStatusBadgeClass: (status: Atividade['status']) => string;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  atividade,
  onEdit,
  onDelete,
  getAtividadeStatusBadgeClass,
}) => {
  return (
    <TableRow>
      <TableCell>{atividade.titulo}</TableCell>
      <TableCell>{atividade.assignee_name}</TableCell>
      <TableCell>
        {atividade.due_date ? format(new Date(atividade.due_date), "PPP") : "N/A"}
      </TableCell>
      <TableCell>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getAtividadeStatusBadgeClass(atividade.status)}`}>
          {atividade.status === 'todo' && 'A Fazer'}
          {atividade.status === 'in_progress' && 'Em Progresso'}
          {atividade.status === 'done' && 'Concluído'}
          {atividade.status === 'stopped' && 'Parado'}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(atividade)}
          className="mr-2"
        >
          <Edit className="h-4 w-4" />
          <span className="sr-only">Editar Atividade</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(atividade.id)}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Excluir Atividade</span>
        </Button>
      </TableCell>
    </TableRow>
  );
};