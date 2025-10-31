"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ArrowUp, ArrowDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAreas, Area } from "@/integrations/supabase/api/areas";
import { Objetivo } from "@/integrations/supabase/api/objetivos";

interface ObjetivoFiltersProps {
  statusFilter: Objetivo['status'] | 'all';
  setStatusFilter: (status: Objetivo['status'] | 'all') => void;
  areaFilter: string | 'all';
  setAreaFilter: (areaId: string | 'all') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: keyof Objetivo | 'area_name';
  setSortBy: (column: keyof Objetivo | 'area_name') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
}

export const ObjetivoFilters: React.FC<ObjetivoFiltersProps> = ({
  statusFilter,
  setStatusFilter,
  areaFilter,
  setAreaFilter,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
}) => {
  const { data: areas, isLoading: isLoadingAreas } = useQuery<Area[] | null, Error>({
    queryKey: ["areas"],
    queryFn: () => getAreas(),
  });

  const statuses = [
    { value: "draft", label: "Rascunho" },
    { value: "active", label: "Ativo" },
    { value: "completed", label: "Concluído" },
    { value: "archived", label: "Arquivado" },
  ];

  const handleSort = (column: keyof Objetivo | 'area_name') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar objetivos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filtrar por Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Status</SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={areaFilter} onValueChange={setAreaFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filtrar por Área" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as Áreas</SelectItem>
          <SelectItem value="null">Nenhuma Área</SelectItem>
          {isLoadingAreas ? (
            <SelectItem value="" disabled>Carregando áreas...</SelectItem>
          ) : (
            areas?.map((area) => (
              <SelectItem key={area.id} value={area.id}>
                {area.nome}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      <Button variant="outline" size="icon" onClick={() => handleSort(sortBy)}>
        {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        <span className="sr-only">Alterar Ordem</span>
      </Button>
    </div>
  );
};