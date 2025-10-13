"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Home, Building, Users, Target, ListTodo, LayoutDashboard, MessageSquare, UserCircle, FolderOpen, CalendarDays, GitCommit } from "lucide-react"; // Import CalendarDays icon and GitCommit for committees
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
}

const strategicPlanningItems = [
  {
    name: "Dashboard OKR",
    href: "/",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    name: "Objetivos & KRs",
    href: "/objetivos",
    icon: <Target className="h-4 w-4" />,
  },
  {
    name: "Atividades",
    href: "/atividades",
    icon: <ListTodo className="h-4 w-4" />,
  },
  {
    name: "Comentários",
    href: "/comentarios",
    icon: <MessageSquare className="h-4 w-4" />,
  },
];

const committeesModuleItems = [
  // These will be filled in a later step
  // {
  //   name: "Dashboard Comitês",
  //   href: "/comites/dashboard",
  //   icon: <LayoutDashboard className="h-4 w-4" />,
  // },
  // {
  //   name: "Comitês",
  //   href: "/comites",
  //   icon: <GitCommit className="h-4 w-4" />,
  // },
];

const cadastroItems = [
  {
    name: "Áreas",
    href: "/areas",
    icon: <Building className="h-4 w-4" />,
  },
  {
    name: "Períodos",
    href: "/periodos",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    name: "Usuários",
    href: "/usuarios",
    icon: <Users className="h-4 w-4" />,
  },
].sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

export function Sidebar({ isOpen, onClose, className }: SidebarProps) {
  const [isStrategicPlanningOpen, setIsStrategicPlanningOpen] = React.useState(true); // Open by default
  const [isCommitteesOpen, setIsCommitteesOpen] = React.useState(false);
  const [isCadastrosOpen, setIsCadastrosOpen] = React.useState(false);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background border-r border-sidebar-border transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
        className
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-sidebar-primary-foreground" onClick={onClose}>
          <img src="/assets/logo-fade-ufpe.png" alt="Logo FADE-UFPE" className="h-8" />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-sidebar-foreground"
          onClick={onClose}
        >
          <span className="sr-only">Close sidebar</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Button>
      </div>
      <ScrollArea className="h-[calc(100vh-4rem)] px-4 py-6">
        <nav className="grid items-start gap-2">
          {/* Meu Perfil - Top Level */}
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary hover:bg-sidebar-accent"
            onClick={onClose}
          >
            <UserCircle className="h-4 w-4" />
            Meu Perfil
          </Link>

          {/* Módulo de Planejamento Estratégico */}
          <Collapsible open={isStrategicPlanningOpen} onOpenChange={setIsStrategicPlanningOpen} className="space-y-2">
            <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary hover:bg-sidebar-accent [&[data-state=open]>svg]:rotate-180">
              <Target className="h-4 w-4" />
              <span className="text-base">Módulo de Planejamento Estratégico</span>
              <ChevronDown className="ml-auto h-4 w-4 transition-transform" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pl-6">
              {strategicPlanningItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary hover:bg-sidebar-accent"
                  onClick={onClose}
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Módulo de Comitês (Placeholder for now) */}
          <Collapsible open={isCommitteesOpen} onOpenChange={setIsCommitteesOpen} className="space-y-2">
            <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary hover:bg-sidebar-accent [&[data-state=open]>svg]:rotate-180">
              <GitCommit className="h-4 w-4" />
              <span className="text-base">Módulo de Comitês</span>
              <ChevronDown className="ml-auto h-4 w-4 transition-transform" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pl-6">
              {committeesModuleItems.length > 0 ? (
                committeesModuleItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary hover:bg-sidebar-accent"
                    onClick={onClose}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground px-3 py-2">Em desenvolvimento...</p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Cadastros Section */}
          <Collapsible open={isCadastrosOpen} onOpenChange={setIsCadastrosOpen} className="space-y-2">
            <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary hover:bg-sidebar-accent [&[data-state=open]>svg]:rotate-180">
              <FolderOpen className="h-4 w-4" />
              <span className="text-base">Cadastros</span>
              <ChevronDown className="ml-auto h-4 w-4 transition-transform" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pl-6">
              {cadastroItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary hover:bg-sidebar-accent"
                  onClick={onClose}
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </nav>
      </ScrollArea>
    </aside>
  );
}