"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChevronDown, ChevronUp, PlusCircle, ListTodo } from "lucide-react";
import { KeyResult, calculateKeyResultProgress } from "@/integrations/supabase/api/key_results";
import { Objetivo } from "@/integrations/supabase/api/objetivos";
import { Atividade } from "@/integrations/supabase/api/atividades";
import { Progress } from "@/components/ui/progress";
import { ActivityItem } from "./ActivityItem";

interface KeyResultItemProps {
  kr: KeyResult;
  objetivo: Objetivo;
  expandedKeyResults: Set<string>;
  toggleKeyResultExpansion: (krId: string) => void;
  onEditKeyResult: (kr: KeyResult, objetivo: Objetivo) => void;
  onDeleteKeyResult: (krId: string) => void;
  onAddAtividade: (kr: KeyResult) => void;
  onEditAtividade: (atividade: Atividade, kr: KeyResult) => void;
  onDeleteAtividade: (atividadeId: string) => void;
  getKeyResultStatusBadgeClass: (status: KeyResult['status']) => string;
  getAtividadeStatusBadgeClass: (status: Atividade['status']) => string;
  // Novas props de permissão
  canEditKeyResults: boolean;
  canDeleteKeyResults: boolean;
  canInsertAtividades: boolean;
  canEditAtividades: boolean;
  canDeleteAtividades: boolean;
}

export const KeyResultItem: React.FC<KeyResultItemProps> = ({
  kr,
  objetivo,
  expandedKeyResults,
  toggleKeyResultExpansion,
  onEditKeyResult,
  onDeleteKeyResult,
  onAddAtividade,
  onEditAtividade,
  onDeleteAtividade,
  getKeyResultStatusBadgeClass,
  getAtividadeStatusBadgeClass,
  canEditKeyResults,
  canDeleteKeyResults,
  canInsertAtividades,
  canEditAtividades,
  canDeleteAtividades,
}) => {
  const krProgress = calculateKeyResultProgress(kr);
  const isExpanded = expandedKeyResults.has(kr.id);

  return (
    <>
      <TableRow>
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleKeyResultExpansion(kr.id)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span className="sr-only">Detalhar KR</span>
          </Button>
        </TableCell>
        <TableCell className="font-medium">{kr.titulo}</TableCell>
        <TableCell>{kr.periodo}</TableCell>
        <TableCell>
          {kr.tipo === 'numeric' && 'Numérico'}
          {kr.tipo === 'boolean' && 'Booleano'}
          {kr.tipo === 'percentage' && 'Porcentagem'}
        </TableCell>
        <TableCell>
          {kr.valor_inicial} {kr.unidade} para {kr.valor_meta} {kr.unidade}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Progress value={krProgress} className="w-[80px]" />
            <span className="text-sm text-muted-foreground">{krProgress}%</span>
          </div>
        </TableCell>
        <TableCell>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getKeyResultStatusBadgeClass(kr.status)}`}>
            {kr.status === 'on_track' && 'No Caminho'}
            {kr.status === 'at_risk' && 'Em Risco'}
            {kr.status === 'off_track' && 'Fora do Caminho'}
            {kr.status === 'completed' && 'Concluído'}
          </span>
        </TableCell>
        <TableCell className="text-right">
          {canEditKeyResults && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEditKeyResult(kr, objetivo)}
              className="mr-2"
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Editar KR</span>
            </Button>
          )}
          {canDeleteKeyResults && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteKeyResult(kr.id)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Excluir KR</span>
            </Button>
          )}
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={8} className="p-0">
            <div className="bg-gray-100 dark:bg-gray-700 p-4 border-t border-b">
              <div className="flex justify-between items-center mb-3">
                <h5 className="text-md font-semibold flex items-center">
                  <ListTodo className="mr-2 h-4 w-4" /> Atividades para "{kr.titulo}"
                </h5>
                {canInsertAtividades && (
                  <Button size="sm" onClick={() => onAddAtividade(kr)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Atividade
                  </Button>
                )}
              </div>
              {kr.atividades && kr.atividades.length > 0 ? (
                <Table className="bg-white dark:bg-gray-900">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título da Atividade</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kr.atividades.map((atividade) => (
                      <ActivityItem
                        key={atividade.id}
                        atividade={atividade}
                        onEdit={(a) => onEditAtividade(a, kr)}
                        onDelete={onDeleteAtividade}
                        getAtividadeStatusBadgeClass={getAtividadeStatusBadgeClass}
                        canEditAtividades={canEditAtividades} // Pass permissions
                        canDeleteAtividades={canDeleteAtividades}
                      />
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-600 text-center py-4">Nenhuma atividade cadastrada para este Key Result.</p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};