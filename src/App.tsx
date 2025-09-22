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
import Objetivos from "./pages/Objetivos"; // Import the Objetivos page
import Atividades from "./pages/Atividades"; // Import the Atividades page
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
              <Route path="areas" element={<Areas />} />
              <Route path="usuarios" element={<Users />} />
              <Route path="objetivos" element={<Objetivos />} /> {/* Add the objetivos route */}
              <Route path="atividades" element={<Atividades />} /> {/* Add the atividades route */}
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