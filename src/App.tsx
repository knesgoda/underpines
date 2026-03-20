import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import AppLayout from "@/components/navigation/AppLayout";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import InviteLanding from "./pages/InviteLanding";
import Onboarding from "./pages/Onboarding";
import Cabin from "./pages/Cabin";
import Invites from "./pages/Invites";
import Campfires from "./pages/Campfires";
import Lantern from "./pages/Lantern";
import SettingsPage from "./pages/SettingsPage";
import StoryComposer from "./pages/StoryComposer";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OnboardingProvider>
        <NavigationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/invite/:slug" element={<InviteLanding />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/cabin" element={<Cabin />} />
                  <Route path="/invites" element={<Invites />} />
                  <Route path="/campfires" element={<Campfires />} />
                  <Route path="/lantern" element={<Lantern />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/new/story" element={<StoryComposer />} />
                  <Route path="/:handle" element={<Cabin />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            </BrowserRouter>
          </TooltipProvider>
        </NavigationProvider>
      </OnboardingProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
