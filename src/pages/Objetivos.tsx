"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Objetivos = () => {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Gestão de Objetivos e KRs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Esta é a página de gestão de Objetivos e Key Results (KRs).
          </p>
          <p className="text-gray-600">
            Em breve, você poderá criar, visualizar e gerenciar seus objetivos e seus respectivos KRs aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Objetivos;