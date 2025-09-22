"use client";

import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSession } from "@/components/auth/SessionContextProvider"; // Import useSession
import { Loader2 } from "lucide-react"; // For loading indicator

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const { session, loading } = useSession(); // Get session and loading state from context

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not loading and no session, the SessionContextProvider will handle redirection to /login
  // So, if we reach here, it means there's a session or we are on a public route (handled by App.tsx)
  // For now, all routes under Layout are protected.
  if (!session) {
    return null; // Or a loading spinner, but SessionContextProvider handles redirect
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
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
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
          <h1 className="text-xl font-semibold">FADE-UFPE OKR System</h1>
          {/* Add a logout button here later */}
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;