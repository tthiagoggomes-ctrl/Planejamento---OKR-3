"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Users = () => {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Gestão de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Aqui você poderá gerenciar os usuários do sistema.
            Em breve, funcionalidades de CRUD para Usuários.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;