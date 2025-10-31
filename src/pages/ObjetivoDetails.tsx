"use client";

import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getObjetivos, Objetivo } from "@/integrations/supabase/api/objetivos";

const ObjetivoDetails = () => {
  const { id } = useParams<{ id: string }>();

  const { data: objetivo, isLoading, error } = useQuery<Objetivo | null, Error>({
    queryKey: ["objetivos", id],
    queryFn: async () => {
      const allObjetivos = await getObjetivos();
      return allObjetivos?.find(obj => obj.id === id) || null;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !objetivo) {
    return (
      <div className="text-center text-red-500">
        Erro ao carregar objetivo ou objetivo não encontrado.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1>Detalhes do Objetivo: {objetivo.titulo}</h1>
      <p>ID: {objetivo.id}</p>
      <p>Descrição: {objetivo.descricao || 'N/A'}</p>
      {/* <p>Período: {objetivo.periodo}</p> REMOVIDO */}
    </div>
  );
};

export default ObjetivoDetails;