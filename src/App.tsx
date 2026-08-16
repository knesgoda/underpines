import React, { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ScrollToTop from "@/components/ScrollToTop";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import PineTreeLoading from "@/components/PineTreeLoading";
import ErrorBoundary from "@/components/ErrorBoundary";
import { CABIN_ENABLED, MARKETPLACE_ENABLED } from "@/lib/flags";

import AppLayout from "@/components/navigation/AppLayout";

// Lazy-loaded page components.
//
// HomePage gets its chunk warmed at module scope: a cold start used to
// serialize "download entry → boot React → render the router → discover '/'
// needs the HomePage chunk → download it". Kicking the fetch off here overlaps
// it with React's own startup. HomePage carries both the signed-in feed and
// the logged-out landing, so it is the right warm for every visitor. The
// catch keeps a flaky first fetch from surfacing as an unhandled rejection —
// lazy() below re-imports on demand and stays the real error path.
import("./pages/HomePage").catch(() => {});
const HomePage = lazy(() => import("./pages/HomePage"));
const Login = lazy(() => import("./pages/Login"));
const InviteLanding = lazy(() => import("./pages/InviteLanding"));
const TrailPassLanding = lazy(() => import("./pages/TrailPassLanding"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Welcome = lazy(() => import("./pages/Welcome"));
const MyPage = lazy(() => import("./pages/MyPage"));
const CabinPage = lazy(() => import("./pages/CabinPage"));
const PageCustomizer = lazy(() => import("./pages/PageCustomizer"));
const Photos = lazy(() => import("./pages/Photos"));
const Listening = lazy(() => import("./pages/Listening"));
const Events = lazy(() => import("./pages/Events"));
const EventComposer = lazy(() => import("./pages/EventComposer"));
const Invites = lazy(() => import("./pages/Invites"));
const InviteTree = lazy(() => import("./pages/InviteTree"));
const Campfires = lazy(() => import("./pages/Campfires"));
const Lantern = lazy(() => import("./pages/Lantern"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const PrivacySettings = lazy(() => import("./pages/PrivacySettings"));
const Diagnostics = lazy(() => import("./pages/Diagnostics"));
const StoryComposer = lazy(() => import("./pages/StoryComposer"));
const CirclesPage = lazy(() => import("./pages/CirclesPage"));
const CircleSuggestions = lazy(() => import("./pages/CircleSuggestions"));
const CollectionsList = lazy(() => import("./pages/CollectionsList"));
const CollectionView = lazy(() => import("./pages/CollectionView"));
const CollectionEditor = lazy(() => import("./pages/CollectionEditor"));
const CampsDirectory = lazy(() => import("./pages/CampsDirectory"));
const MyCamps = lazy(() => import("./pages/MyCamps"));
const CreateCamp = lazy(() => import("./pages/CreateCamp"));
const CampView = lazy(() => import("./pages/CampView"));
const CampSettings = lazy(() => import("./pages/CampSettings"));
const CampNewsletterComposer = lazy(() => import("./pages/CampNewsletterComposer"));
const CampNewsletterView = lazy(() => import("./pages/CampNewsletterView"));
const CampNewsletterArchive = lazy(() => import("./pages/CampNewsletterArchive"));
const SearchPage = lazy(() => import("./pages/Search"));
const RangerStation = lazy(() => import("./pages/RangerStation"));
const Explore = lazy(() => import("./pages/Explore"));
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
const GroveSettings = lazy(() => import("./pages/grove/GroveSettings"));
const GroveDesigns = lazy(() => import("./pages/grove/GroveDesigns"));
const GroveCases = lazy(() => import("./pages/grove/GroveCases"));
const GroveCaseDetail = lazy(() => import("./pages/grove/GroveCaseDetail"));
const GroveTrails = lazy(() => import("./pages/grove/GroveTrails"));
const GroveAppeals = lazy(() => import("./pages/grove/GroveAppeals"));
const GroveAudit = lazy(() => import("./pages/grove/GroveAudit"));
const GroveWaitlist = lazy(() => import("./pages/grove/GroveWaitlist"));

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
    <AuthProvider>
      {/* ThemeProvider reads the signed-in user to load their saved theme, so
          it has to sit below AuthProvider. */}
      <ThemeProvider>
      <OnboardingProvider>
        <NavigationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            
            <BrowserRouter>
              <ScrollToTop />
              {/* A single boundary around the whole routed tree. Without it, a
                  crash on a full-screen route (onboarding, login, the boot
                  gates), anywhere under /grove, or a lazy chunk that 404s after
                  a deploy is a blank white page. The inner boundary in
                  AppLayout still gives signed-in routes a finer-grained
                  fallback that keeps the nav chrome. */}
              <ErrorBoundary>
              <Suspense fallback={<PineTreeLoading />}>
              <Routes>
                {/* Grove admin routes — outside AppLayout */}
                <Route path="/grove" element={<GroveLayout />}>
                  <Route index element={<GroveOverview />} />
                  <Route path="queue" element={<GroveQueue />} />
                  <Route path="members" element={<GroveMembers />} />
                  <Route path="members/:handle" element={<GroveMemberDetail />} />
                  <Route path="camps" element={<GroveCamps />} />
                  <Route path="camps/:id" element={<GroveCampDetail />} />
                  <Route path="settings" element={<GroveSettings />} />
                  <Route path="designs" element={<GroveDesigns />} />
                  {/* Moderation */}
                  <Route path="cases" element={<GroveCases />} />
                  <Route path="cases/:id" element={<GroveCaseDetail />} />
                  <Route path="trails" element={<GroveTrails />} />
                  <Route path="trails/:handle" element={<GroveTrails />} />
                  <Route path="appeals" element={<GroveAppeals />} />
                  <Route path="audit" element={<GroveAudit />} />
                  <Route path="waitlist" element={<GroveWaitlist />} />
                  {/* Without this, a stale admin bookmark renders the Grove
                      chrome around an empty main area rather than a 404. */}
                  <Route path="*" element={<NotFound />} />
                </Route>

                {/* Main app routes */}
                <Route path="/*" element={
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/invite/:slug" element={<InviteLanding />} />
                      <Route path="/join/:token" element={<TrailPassLanding />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/welcome" element={<Welcome />} />
                      <Route path="/me" element={<MyPage />} />
                      <Route path="/me/edit" element={<PageCustomizer />} />
                      <Route path="/photos" element={<Photos />} />
                      <Route path="/listening" element={<Listening />} />
                      <Route path="/events" element={<Events />} />
                      <Route path="/events/new" element={<EventComposer />} />
                      {/* The Cabin — the place. /:handle stays the page. Hidden
                          behind CABIN_ENABLED while it's worked on; the routes
                          stay so /u/foo never falls through to /:handle. */}
                      <Route path="/u/:handle" element={CABIN_ENABLED ? <CabinPage /> : <Navigate to="/" replace />} />
                      <Route path="/cabin" element={CABIN_ENABLED ? <CabinPage /> : <Navigate to="/" replace />} />
                      {/* Ranger Station — the member feedback board. */}
                      <Route path="/ranger-station" element={<RangerStation />} />
                      <Route path="/ranger" element={<Navigate to="/ranger-station" replace />} />
                      <Route path="/invites" element={<Invites />} />
                      <Route path="/invites/tree" element={<InviteTree />} />
                      <Route path="/messages" element={<Campfires />} />
                      <Route path="/campfires" element={<Navigate to="/messages" replace />} />
                      <Route path="/search" element={<SearchPage />} />
                      <Route path="/explore" element={<Explore />} />
                      <Route path="/updates" element={<Lantern />} />
                      <Route path="/lantern" element={<Navigate to="/updates" replace />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/settings/notifications" element={<NotificationSettings />} />
                      <Route path="/settings/privacy" element={<PrivacySettings />} />
                      <Route path="/settings/troubleshooting" element={<Diagnostics />} />
                      {/* Pines+ and Stripe payouts are gone; old links land on
                          Settings rather than a 404. */}
                      <Route path="/settings/subscription" element={<Navigate to="/settings" replace />} />
                      <Route path="/settings/payouts" element={<Navigate to="/settings" replace />} />
                      {/* The design economy is parked behind MARKETPLACE_ENABLED.
                          Routes stay registered so /marketplace etc. never fall
                          through to the /:handle catch-all. */}
                      <Route path="/settings/designs" element={MARKETPLACE_ENABLED ? <MyDesigns /> : <Navigate to="/settings" replace />} />
                      <Route path="/marketplace" element={MARKETPLACE_ENABLED ? <Marketplace /> : <Navigate to="/" replace />} />
                      <Route path="/marketplace/:id" element={MARKETPLACE_ENABLED ? <MarketplaceDetail /> : <Navigate to="/" replace />} />
                      <Route path="/designs/create" element={MARKETPLACE_ENABLED ? <DesignCreator /> : <Navigate to="/" replace />} />
                      <Route path="/new/story" element={<StoryComposer />} />
                      <Route path="/friends" element={<CirclesPage />} />
                      <Route path="/circles" element={<Navigate to="/friends" replace />} />
                      <Route path="/circles/suggestions/:handle" element={<CircleSuggestions />} />
                      <Route path="/collections/new" element={<CollectionEditor />} />
                      <Route path="/collections/edit/:id" element={<CollectionEditor />} />
                      <Route path="/groups" element={<CampsDirectory />} />
                      <Route path="/camps" element={<CampsDirectory />} />
                      <Route path="/camps/new" element={<CreateCamp />} />
                      <Route path="/camps/mine" element={<MyCamps />} />
                      <Route path="/camps/:id" element={<CampView />} />
                      <Route path="/camps/:id/settings" element={<CampSettings />} />
                      <Route path="/camps/:id/newsletter/new" element={<CampNewsletterComposer />} />
                      <Route path="/camps/:id/newsletter/:newsletterId" element={<CampNewsletterView />} />
                      <Route path="/camps/:id/newsletters" element={<CampNewsletterArchive />} />
                      <Route path="/:handle/photos" element={<Photos />} />
                      <Route path="/:handle/collections" element={<CollectionsList />} />
                      <Route path="/:handle/collections/:id" element={<CollectionView />} />
                      <Route path="/wrapped/:year" element={<Wrapped />} />
                      <Route path="/post/:id" element={<PostDetail />} />
                      <Route path="/:handle" element={<MyPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                } />
              </Routes>
              </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </NavigationProvider>
      </OnboardingProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
