"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface KanbanColumnFooterProps {
  activitiesCount: number;
  displayedActivitiesCount: number;
  isExpanded: boolean;
  onToggleExpansion: () => void;
}

export const KanbanColumnFooter: React.FC<KanbanColumnFooterProps> = ({
  activitiesCount,
  displayedActivitiesCount,
  isExpanded,
  onToggleExpansion,
}) => {
  if (activitiesCount <= displayedActivitiesCount && !isExpanded) {
    return null; // Don't show footer if all activities are displayed and not expanded
  }

  return (
    <div className="p-4 pt-0">
      <Button
        variant="ghost"
        className="w-full text-sm"
        onClick={onToggleExpansion}
      >
        {isExpanded ? (
          <>
            <ChevronUp className="mr-2 h-4 w-4" /> Ocultar
          </>
        ) : (
          <>
            <ChevronDown className="mr-2 h-4 w-4" /> Ver todas ({activitiesCount - displayedActivitiesCount} mais)
          </>
        )}
      </Button>
    </div>
  );
};