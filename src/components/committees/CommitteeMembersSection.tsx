"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, PlusCircle } from "lucide-react";
import { ComiteMember } from "@/integrations/supabase/api/comites";

interface CommitteeMembersSectionProps {
  members: ComiteMember[] | null;
  isLoadingMembers: boolean;
  errorMembers: Error | null;
  canManageComiteMembers: boolean;
  onManageMembersClick: () => void;
}

export const CommitteeMembersSection: React.FC<CommitteeMembersSectionProps> = ({
  members,
  isLoadingMembers,
  errorMembers,
  canManageComiteMembers,
  onManageMembersClick,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold flex items-center">
          <Users className="mr-2 h-5 w-5" /> Membros ({members?.length || 0})
        </CardTitle>
        {canManageComiteMembers && (
          <Button size="sm" variant="outline" onClick={onManageMembersClick}>
            <PlusCircle className="mr-2 h-4 w-4" /> Gerenciar Membros
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoadingMembers ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : errorMembers ? (
          <p className="text-red-500">Erro ao carregar membros: {errorMembers.message}</p>
        ) : members && members.length > 0 ? (
          <ul className="space-y-2">
            {members.map(member => (
              <li key={member.user_id} className="flex items-center justify-between p-2 border rounded-md">
                <div>
                  <p className="font-medium">{member.user_name}</p>
                  <p className="text-sm text-muted-foreground">{member.user_area_name || 'N/A'}</p>
                </div>
                <span className="text-sm font-semibold text-blue-600">{member.role}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">Nenhum membro cadastrado.</p>
        )}
      </CardContent>
    </Card>
  );
};