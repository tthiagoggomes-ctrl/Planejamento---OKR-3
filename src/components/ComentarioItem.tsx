"use client";

import React from "react";
import { Card } from "@/components/ui/card"; // Removido CardContent da desestruturação
import { Button } from "@/components/ui/button";
import { Edit, Trash2, UserCircle } from "lucide-react";
import { Comentario } from "@/integrations/supabase/api/comentarios";
import { format } from "date-fns";
import { useSession } from "@/components/auth/SessionContextProvider";

interface ComentarioItemProps {
  comment: Comentario;
  onEdit: (comment: Comentario) => void;
  onDelete: (commentId: string) => void;
  // Novas props de permissão
  canEditComentarios: boolean;
  canDeleteComentarios: boolean;
}

export const ComentarioItem: React.FC<ComentarioItemProps> = ({
  comment,
  onEdit,
  onDelete,
  canEditComentarios,
  canDeleteComentarios,
}) => {
  const { user } = useSession();
  const isAuthor = user?.id === comment.user_id;

  return (
    <Card className="p-4 flex space-x-3">
      <div className="flex-shrink-0">
        <UserCircle className="h-8 w-8 text-gray-500 dark:text-gray-400" />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold">{comment.author_name || "Usuário Desconhecido"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {comment.created_at ? format(new Date(comment.created_at), "PPP 'às' HH:mm") : 'N/A'}
            </p>
          </div>
          {(isAuthor && (canEditComentarios || canDeleteComentarios)) && ( // Only show buttons if author AND has permission
            <div className="flex space-x-1">
              {canEditComentarios && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(comment)}
                  className="h-7 w-7"
                >
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Editar Comentário</span>
                </Button>
              )}
              {canDeleteComentarios && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(comment.id)}
                  className="h-7 w-7"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Excluir Comentário</span>
                </Button>
              )}
            </div>
          )}
        </div>
        <p className="mt-2 text-gray-700 dark:text-gray-300">{comment.conteudo}</p>
      </div>
    </Card>
  );
};