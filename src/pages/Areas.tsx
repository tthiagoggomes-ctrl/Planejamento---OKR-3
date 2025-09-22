"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Areas = () => {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Gestão de Áreas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Aqui você poderá gerenciar as áreas da FADE-UFPE.
            Em breve, funcionalidades de CRUD para Áreas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Areas;