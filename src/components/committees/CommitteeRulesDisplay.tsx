"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface CommitteeRulesDisplayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comiteName: string;
  rulesContent: string | null | undefined;
}

export const CommitteeRulesDisplay: React.FC<CommitteeRulesDisplayProps> = ({
  open,
  onOpenChange,
  comiteName,
  rulesContent,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Regras do Comitê: {comiteName}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Detalhes das regras e atribuições do comitê {comiteName}.
        </DialogDescription>
        <ScrollArea className="flex-1 p-4 border rounded-md mt-4">
          {rulesContent ? (
            <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">
              {rulesContent}
            </pre>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma regra ou atribuição detalhada para este comitê.
            </p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};