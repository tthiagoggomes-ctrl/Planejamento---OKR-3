"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Dashboard FADE-UFPE OKR</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Bem-vindo ao sistema de gestão de OKRs da FADE-UFPE.
            Use a barra lateral para navegar entre as seções.
          </p>
          <p className="text-gray-600">
            Em breve, este dashboard exibirá resultados consolidados, gráficos interativos e alertas.
          </p>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default Index;