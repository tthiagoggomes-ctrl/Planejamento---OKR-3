"use client";

import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KanbanColumnHeaderProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  colorClass: string;
}

export const KanbanColumnHeader: React.FC<KanbanColumnHeaderProps> = ({
  title,
  icon,
  count,
  colorClass,
}) => {
  return (
    <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-3 ${colorClass}`}>
      <CardTitle className="text-lg font-semibold flex items-center gap-2">
        {icon} {title}
      </CardTitle>
      <Badge variant="secondary" className="text-sm bg-white text-gray-900 dark:bg-gray-200 dark:text-gray-900">
        {count}
      </Badge>
    </CardHeader>
  );
};