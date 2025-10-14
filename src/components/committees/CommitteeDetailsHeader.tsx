"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GitCommit, FileText } from "lucide-react"; // Import FileText icon
import { Comite } from "@/integrations/supabase/api/comites";
import { Button } from "@/components/ui/button"; // Import Button

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
        {comite.document_url && (
          <div className="flex justify-end">
            <a href={comite.document_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Visualizar Documento Oficial
              </Button>
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};