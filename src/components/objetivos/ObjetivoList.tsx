"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, ChevronUp, Edit, Trash2, PlusCircle } from "lucide-react"; // Import PlusCircle
import { Objetivo } from "@/integrations/supabase/api/objetivos";
import { KeyResult } from "@/integrations/supabase/api/key_results";
import { Atividade } from "@/integrations/supabase/api/atividades";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { KeyResultItem } from "./KeyResultItem";

interface ObjetivoListProps {
  objetivos: Objetivo[] | null;
  keyResultsMap: Map<string, KeyResult[]> | undefined;
  isLoadingKeyResults: boolean;
  expandedObjetivos: Set<string>;
  toggleObjetivoExpansion: (objetivoId: string) => void;
  expandedKeyResults: Set<string>;
  toggleKeyResultExpansion: (krId: string) => void;
  onEditObjetivo: (objetivo: Objetivo) => void;
  onDeleteObjetivo: (objetivoId: string) => void;
  onAddKeyResult: (objetivo: Objetivo) => void;
  onEditKeyResult: (kr: KeyResult, objetivo: Objetivo) => void;
  onDeleteKeyResult: (krId: string) => void;
  onAddAtividade: (kr: KeyResult) => void;
  onEditAtividade: (atividade: Atividade, kr: KeyResult) => void;
  onDeleteAtividade: (atividadeId: string) => void;
  calculateObjetivoOverallProgress: (objetivoId: string) => number;
  getObjetivoStatusBadgeClass: (status: Objetivo['status']) => string;
  getKeyResultStatusBadgeClass: (status: KeyResult['status']) => string;
  getAtividadeStatusBadgeClass: (status: Atividade['status']) => string;
}

export const ObjetivoList: React.FC<ObjetivoListProps> = ({
  objetivos,
  keyResultsMap,
  isLoadingKeyResults,
  expandedObjetivos,
  toggleObjetivoExpansion,
  expandedKeyResults,
  toggleKeyResultExpansion,
  onEditObjetivo,
  onDeleteObjetivo,
  onAddKeyResult,
  onEditKeyResult,
  onDeleteKeyResult,
  onAddAtividade,
  onEditAtividade,
  onDeleteAtividade,
  calculateObjetivoOverallProgress,
  getObjetivoStatusBadgeClass,
  getKeyResultStatusBadgeClass,
  getAtividadeStatusBadgeClass,
}) => {
  if (!objetivos || objetivos.length === 0) {
    return <p className="text-gray-600">Nenhum objetivo cadastrado ainda.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]"></TableHead> {/* For expand/collapse button */}
          <TableHead>Título</TableHead>
          <TableHead>Área</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Progresso</TableHead> {/* New column for Objective progress */}
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {objetivos.map((objetivo) => {
          const objectiveProgress = calculateObjetivoOverallProgress(objetivo.id);
          const isObjetivoExpanded = expandedObjetivos.has(objetivo.id);
          const krsForObjetivo = keyResultsMap?.get(objetivo.id) || [];

          return (
            <React.Fragment key={objetivo.id}>
              <TableRow>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleObjetivoExpansion(objetivo.id)}
                  >
                    {isObjetivoExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="sr-only">Expandir/Colapsar KRs</span>
                  </Button>
                </TableCell>
                <TableCell className="font-medium">
                  <Link to={`/objetivos/${objetivo.id}`} className="text-blue-600 hover:underline">
                    {objetivo.titulo}
                  </Link>
                </TableCell>
                <TableCell>{objetivo.area_name}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getObjetivoStatusBadgeClass(objetivo.status)}`}>
                    {objetivo.status === 'draft' && 'Rascunho'}
                    {objetivo.status === 'active' && 'Ativo'}
                    {objetivo.status === 'completed' && 'Concluído'}
                    {objetivo.status === 'archived' && 'Arquivado'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={objectiveProgress} className="w-[100px]" />
                    <span className="text-sm text-muted-foreground">{objectiveProgress}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditObjetivo(objetivo)}
                    className="mr-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Editar Objetivo</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteObjetivo(objetivo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Excluir Objetivo</span>
                  </Button>
                </TableCell>
              </TableRow>
              {isObjetivoExpanded && (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 border-t border-b">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-lg font-semibold">Key Results para "{objetivo.titulo}"</h4>
                        <Button size="sm" onClick={() => onAddKeyResult(objetivo)}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar KR
                        </Button>
                      </div>
                      {isLoadingKeyResults ? (
                        <div className="flex justify-center items-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        krsForObjetivo.length > 0 ? (
                          <Table className="bg-white dark:bg-gray-900">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Título do KR</TableHead>
                                <TableHead>Período</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Meta</TableHead>
                                <TableHead>Progresso (%)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {krsForObjetivo.map((kr) => (
                                <KeyResultItem
                                  key={kr.id}
                                  kr={kr}
                                  objetivo={objetivo}
                                  expandedKeyResults={expandedKeyResults}
                                  toggleKeyResultExpansion={toggleKeyResultExpansion}
                                  onEditKeyResult={onEditKeyResult}
                                  onDeleteKeyResult={onDeleteKeyResult}
                                  onAddAtividade={onAddAtividade}
                                  onEditAtividade={onEditAtividade}
                                  onDeleteAtividade={onDeleteAtividade}
                                  getKeyResultStatusBadgeClass={getKeyResultStatusBadgeClass}
                                  getAtividadeStatusBadgeClass={getAtividadeStatusBadgeClass}
                                />
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-gray-600 text-center py-4">Nenhum Key Result cadastrado para este objetivo.</p>
                        )
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
};