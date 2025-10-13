/// <reference types="react" />
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, GitCommit, LayoutDashboard } from "lucide-react";
import { useUserPermissions } from '@/hooks/use-user-permissions';

const CommitteesDashboard = () => {
  const { can, isLoading: permissionsLoading } = useUserPermissions();
  const canViewCommitteesDashboard = can('dashboard', 'committees_view'); // Assuming a specific dashboard permission for committees

  if (permissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewCommitteesDashboard) {
    return (
      <div className="container mx-auto py-6 text-center text-red-500">
        Você não tem permissão para visualizar o Dashboard de Comitês.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <LayoutDashboard className="mr-2 h-6 w-6" /> Dashboard de Comitês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Bem-vindo ao dashboard do módulo de Comitês. Aqui você poderá ver um resumo das atividades e status dos seus comitês.
          </p>
          <p className="text-gray-500">
            Funcionalidades como resumo de reuniões, atividades pendentes e resultados de enquetes serão implementadas aqui.
          </p>
        </CardContent>
      </Card>

      {/* Placeholder for future dashboard widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Comitês Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Em desenvolvimento...</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Próximas Reuniões</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Em desenvolvimento...</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Enquetes Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Em desenvolvimento...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CommitteesDashboard;