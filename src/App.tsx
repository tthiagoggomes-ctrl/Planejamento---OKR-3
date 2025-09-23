import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Layout from "./components/layout/Layout";
import Areas from "./pages/Areas";
import Users from "./pages/Users";
import Objetivos from "./pages/Objetivos";
import Atividades from "./pages/Atividades";
import Comentarios from "./pages/Comentarios";
import Profile from "./pages/Profile"; // Import the Profile page
import Login from "./pages/Login";
import { SessionContextProvider } from "./components/auth/SessionContextProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Index />} />
              <Route path="profile" element={<Profile />} /> {/* Add the profile route */}
              <Route path="areas" element={<Areas />} />
              <Route path="usuarios" element={<Users />} />
              <Route path="objetivos" element={<Objetivos />} />
              <Route path="atividades" element={<Atividades />} />
              <Route path="comentarios" element={<Comentarios />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;