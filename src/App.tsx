import React, { Suspense, lazy } from "react";
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
import PineTreeLoading from "@/components/PineTreeLoading";

import AppLayout from "@/components/navigation/AppLayout";

// Lazy-loaded page components
const HomePage = lazy(() => import("./pages/HomePage"));
const Login = lazy(() => import("./pages/Login"));
const InviteLanding = lazy(() => import("./pages/InviteLanding"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Cabin = lazy(() => import("./pages/Cabin"));
const Invites = lazy(() => import("./pages/Invites"));
const InviteTree = lazy(() => import("./pages/InviteTree"));
const Campfires = lazy(() => import("./pages/Campfires"));
const Lantern = lazy(() => import("./pages/Lantern"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const PrivacySettings = lazy(() => import("./pages/PrivacySettings"));
const StoryComposer = lazy(() => import("./pages/StoryComposer"));
const CirclesPage = lazy(() => import("./pages/CirclesPage"));
const CircleSuggestions = lazy(() => import("./pages/CircleSuggestions"));
const CollectionsList = lazy(() => import("./pages/CollectionsList"));
const CollectionView = lazy(() => import("./pages/CollectionView"));
const CollectionEditor = lazy(() => import("./pages/CollectionEditor"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const CreatorPayouts = lazy(() => import("./pages/CreatorPayouts"));
const CampsDirectory = lazy(() => import("./pages/CampsDirectory"));
const MyCamps = lazy(() => import("./pages/MyCamps"));
const CreateCamp = lazy(() => import("./pages/CreateCamp"));
const CampView = lazy(() => import("./pages/CampView"));
const CampSettings = lazy(() => import("./pages/CampSettings"));
const CampNewsletterComposer = lazy(() => import("./pages/CampNewsletterComposer"));
const CampNewsletterView = lazy(() => import("./pages/CampNewsletterView"));
const CampNewsletterArchive = lazy(() => import("./pages/CampNewsletterArchive"));
const SearchPage = lazy(() => import("./pages/Search"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const MarketplaceDetail = lazy(() => import("./pages/MarketplaceDetail"));
const DesignCreator = lazy(() => import("./pages/DesignCreator"));
const MyDesigns = lazy(() => import("./pages/MyDesigns"));
const Wrapped = lazy(() => import("./pages/Wrapped"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PostDetail = lazy(() => import("./pages/PostDetail"));

// Grove (admin) — layout is not lazy, pages are
import GroveLayout from "./pages/grove/GroveLayout";
const GroveOverview = lazy(() => import("./pages/grove/GroveOverview"));
const GroveQueue = lazy(() => import("./pages/grove/GroveQueue"));
const GroveMembers = lazy(() => import("./pages/grove/GroveMembers"));
const GroveMemberDetail = lazy(() => import("./pages/grove/GroveMemberDetail"));
const GroveCamps = lazy(() => import("./pages/grove/GroveCamps"));
const GroveCampDetail = lazy(() => import("./pages/grove/GroveCampDetail"));
const GroveRevenue = lazy(() => import("./pages/grove/GroveRevenue"));
const GroveSettings = lazy(() => import("./pages/grove/GroveSettings"));
const GroveCompanions = lazy(() => import("./pages/grove/GroveCompanions"));
const GroveDesigns = lazy(() => import("./pages/grove/GroveDesigns"));

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
