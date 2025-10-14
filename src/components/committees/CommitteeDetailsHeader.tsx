"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GitCommit, Eye } from "lucide-react"; // Import Eye icon
import { Comite } from "@/integrations/supabase/api/comites";
import { Button } from "@/components/ui/button";

interface CommitteeDetailsHeaderProps {
  comite: Comite;
  onViewRulesClick: () => void; // NOVO: Prop para o clique no ícone
}

export const CommitteeDetailsHeader: React.FC<CommitteeDetailsHeaderProps> = ({ comite, onViewRulesClick }) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-3xl font-bold flex items-center">
            <GitCommit className="mr-3 h-8 w-8" /> {comite.nome}
          </CardTitle>
          {comite.regras_comite && (
            <Button variant="ghost" size="icon" onClick={onViewRulesClick} className="ml-auto">
              <Eye className="h-5 w-5 text-muted-foreground hover:text-primary" />
              <span className="sr-only">Ver Regras do Comitê</span>
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">{comite.descricao}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Status: <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            comite.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {comite.status === 'active' ? 'Ativo' : 'Arquivado'}
          </span>
        </div>
      </CardHeader>
      {/* A seção de documento oficial foi removida daqui */}
    </Card>
  );
};