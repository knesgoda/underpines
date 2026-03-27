import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ScrollToTop from "@/components/ScrollToTop";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SceneDebugProvider } from "@/contexts/SceneDebugContext";
import { RevenueCatProvider } from "@/contexts/RevenueCatContext";

import AppLayout from "@/components/navigation/AppLayout";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import InviteLanding from "./pages/InviteLanding";
import Onboarding from "./pages/Onboarding";
import Cabin from "./pages/Cabin";
import Invites from "./pages/Invites";
import InviteTree from "./pages/InviteTree";
import Campfires from "./pages/Campfires";
import Lantern from "./pages/Lantern";
import SettingsPage from "./pages/SettingsPage";
import NotificationSettings from "./pages/NotificationSettings";
import PrivacySettings from "./pages/PrivacySettings";
import StoryComposer from "./pages/StoryComposer";
import CirclesPage from "./pages/CirclesPage";
import CircleSuggestions from "./pages/CircleSuggestions";
import CollectionsList from "./pages/CollectionsList";
import CollectionView from "./pages/CollectionView";
import CollectionEditor from "./pages/CollectionEditor";
import SubscriptionPage from "./pages/SubscriptionPage";
import CreatorPayouts from "./pages/CreatorPayouts";
import CampsDirectory from "./pages/CampsDirectory";
import MyCamps from "./pages/MyCamps";
import CreateCamp from "./pages/CreateCamp";
import CampView from "./pages/CampView";
import CampSettings from "./pages/CampSettings";
import CampNewsletterComposer from "./pages/CampNewsletterComposer";
import CampNewsletterView from "./pages/CampNewsletterView";
import CampNewsletterArchive from "./pages/CampNewsletterArchive";
import SearchPage from "./pages/Search";
import Marketplace from "./pages/Marketplace";
import MarketplaceDetail from "./pages/MarketplaceDetail";
import DesignCreator from "./pages/DesignCreator";
import MyDesigns from "./pages/MyDesigns";
import Wrapped from "./pages/Wrapped";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import PostDetail from "./pages/PostDetail";

// Grove (admin)
import GroveLayout from "./pages/grove/GroveLayout";
import GroveOverview from "./pages/grove/GroveOverview";
import GroveQueue from "./pages/grove/GroveQueue";
import GroveMembers from "./pages/grove/GroveMembers";
import GroveMemberDetail from "./pages/grove/GroveMemberDetail";
import GroveCamps from "./pages/grove/GroveCamps";
import GroveCampDetail from "./pages/grove/GroveCampDetail";
import GroveRevenue from "./pages/grove/GroveRevenue";
import GroveSettings from "./pages/grove/GroveSettings";
import GroveCompanions from "./pages/grove/GroveCompanions";
import GroveDesigns from "./pages/grove/GroveDesigns";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes
      gcTime: 10 * 60 * 1000,       // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <SceneDebugProvider>
    <AuthProvider>
      <RevenueCatProvider>
      <OnboardingProvider>
        <NavigationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                {/* Grove admin routes — outside AppLayout */}
                <Route path="/grove" element={<GroveLayout />}>
                  <Route index element={<GroveOverview />} />
                  <Route path="queue" element={<GroveQueue />} />
                  <Route path="members" element={<GroveMembers />} />
                  <Route path="members/:handle" element={<GroveMemberDetail />} />
                  <Route path="camps" element={<GroveCamps />} />
                  <Route path="camps/:id" element={<GroveCampDetail />} />
                  <Route path="revenue" element={<GroveRevenue />} />
                  <Route path="settings" element={<GroveSettings />} />
                  <Route path="designs" element={<GroveDesigns />} />
                  <Route path="companions" element={<GroveCompanions />} />
                </Route>

                {/* Main app routes */}
                <Route path="/*" element={
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/invite/:slug" element={<InviteLanding />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/cabin" element={<Cabin />} />
                      <Route path="/invites" element={<Invites />} />
                      <Route path="/invites/tree" element={<InviteTree />} />
                      <Route path="/campfires" element={<Campfires />} />
                      <Route path="/search" element={<SearchPage />} />
                      <Route path="/lantern" element={<Lantern />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/settings/notifications" element={<NotificationSettings />} />
                      <Route path="/settings/privacy" element={<PrivacySettings />} />
                      <Route path="/settings/subscription" element={<SubscriptionPage />} />
                      <Route path="/settings/payouts" element={<CreatorPayouts />} />
                      <Route path="/settings/designs" element={<MyDesigns />} />
                      <Route path="/marketplace" element={<Marketplace />} />
                      <Route path="/marketplace/:id" element={<MarketplaceDetail />} />
                      <Route path="/designs/create" element={<DesignCreator />} />
                      <Route path="/new/story" element={<StoryComposer />} />
                      <Route path="/circles" element={<CirclesPage />} />
                      <Route path="/circles/suggestions/:handle" element={<CircleSuggestions />} />
                      <Route path="/collections/new" element={<CollectionEditor />} />
                      <Route path="/collections/edit/:id" element={<CollectionEditor />} />
                      <Route path="/camps" element={<CampsDirectory />} />
                      <Route path="/camps/new" element={<CreateCamp />} />
                      <Route path="/camps/mine" element={<MyCamps />} />
                      <Route path="/camps/:id" element={<CampView />} />
                      <Route path="/camps/:id/settings" element={<CampSettings />} />
                      <Route path="/camps/:id/newsletter/new" element={<CampNewsletterComposer />} />
                      <Route path="/camps/:id/newsletter/:newsletterId" element={<CampNewsletterView />} />
                      <Route path="/camps/:id/newsletters" element={<CampNewsletterArchive />} />
                      <Route path="/:handle/collections" element={<CollectionsList />} />
                      <Route path="/:handle/collections/:id" element={<CollectionView />} />
                      <Route path="/wrapped/:year" element={<Wrapped />} />
                      <Route path="/post/:id" element={<PostDetail />} />
                      <Route path="/:handle" element={<Cabin />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                } />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </NavigationProvider>
      </OnboardingProvider>
      </RevenueCatProvider>
    </AuthProvider>
    </SceneDebugProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
