import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Home from "./pages/Home";
import StartCampaign from "./pages/StartCampaign";
import CampaignDetails from "./pages/CampaignDetails";
import TransactionHistory from "./pages/TransactionHistory";
import NotFound from "./pages/NotFound";

// Import MeshProvider
import { MeshProvider } from "@meshsdk/react";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* Wrap your app with MeshProvider */}
      <MeshProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <Navigation />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/start-campaign" element={<StartCampaign />} />
              <Route path="/campaign/:id" element={<CampaignDetails />} />
              <Route path="/transactions" element={<TransactionHistory />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </MeshProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
