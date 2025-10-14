"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GitCommit } from "lucide-react";
import { Comite } from "@/integrations/supabase/api/comites";

interface CommitteeDetailsHeaderProps {
  comite: Comite;
}

export const CommitteeDetailsHeader: React.FC<CommitteeDetailsHeaderProps> = ({ comite }) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-3xl font-bold flex items-center">
          <GitCommit className="mr-3 h-8 w-8" /> {comite.nome}
        </CardTitle>
        <p className="text-muted-foreground">{comite.descricao}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Status: <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            comite.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {comite.status === 'active' ? 'Ativo' : 'Arquivado'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end gap-2">
        </div>
      </CardContent>
    </Card>
  );
};