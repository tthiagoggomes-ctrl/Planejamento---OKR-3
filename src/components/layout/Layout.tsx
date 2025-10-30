"use client";

import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Menu, LogOut } from "lucide-react"; // Import LogOut icon
import { useIsMobile } from "@/hooks/use-mobile";
import { useSession } from "@/components/auth/SessionContextProvider";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { showError } from "@/utils/toast"; // Import showError for logout errors
import { useIdleTimeout } from "@/hooks/use-idle-timeout"; // NEW: Import useIdleTimeout

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const { session, loading } = useSession();

  // NEW: Initialize idle timeout for the current user
  useIdleTimeout(session?.user?.id);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error during logout:", error);
      showError("Erro ao fazer logout.");
    }
    // SessionContextProvider will handle navigation to /login on SIGNED_OUT event
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={toggleSidebar} />
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
      <div className="flex flex-col flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6 justify-between"> {/* Added justify-between */}
          <div className="flex items-center gap-4">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={toggleSidebar}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle sidebar</span>
              </Button>
            )}
            <h1 className="text-xl font-semibold text-fade-red">FADE-UFPE OKR System</h1> {/* Cor aplicada aqui */}
          </div>
          <Button variant="ghost" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Sair</span> {/* Added for larger screens */}
          </Button>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;