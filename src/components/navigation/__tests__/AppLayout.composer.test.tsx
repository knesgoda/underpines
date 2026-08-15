import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * The feed's composer is a trigger-only stub: it flips composerOpen on
 * NavigationContext and nothing else. The sheet that listens to that flag
 * lives in AppLayout — and it was once lazy-loaded without ever being
 * rendered, which silently killed posting everywhere outside My Page.
 * These tests pin the mount and the intent plumbing so that can't reship.
 */

const navState = {
  unreadCount: 0,
  hasUnreadNotifications: false,
  hasUnreadCampfires: false,
  markCampfiresSeen: vi.fn(),
  onlineIds: new Set<string>(),
  composerOpen: false,
  composerIntent: null as 'spark' | 'ember' | null,
  setComposerOpen: vi.fn(),
  openComposer: vi.fn(),
  refreshNotifications: vi.fn(),
};

vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => navState,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'member-1' }, loading: false }),
}));

vi.mock('@/hooks/useBootState', () => ({
  useBootState: () => ({
    data: {
      profile: {
        onboarding_completed_at: '2026-01-01T00:00:00Z',
        is_age_verified: true,
      },
      suspension: null,
      is_admin: false,
      unread_notifications: 0,
      has_unread_messages: false,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

// Chrome that is irrelevant to the composer path. TopBar/TabBar pull their
// own data; the PWA banners import virtual service-worker modules.
vi.mock('@/components/navigation/TopBar', () => ({ default: () => null }));
vi.mock('@/components/navigation/TabBar', () => ({ default: () => null }));
vi.mock('@/components/pwa/OfflineBanner', () => ({ default: () => null }));
vi.mock('@/components/pwa/InstallPrompt', () => ({ default: () => null }));
vi.mock('@/components/pwa/UpdatePrompt', () => ({ default: () => null }));

// The real composers talk to Supabase; the sheet choosing which one to show
// is what's under test.
vi.mock('@/components/feed/SparkComposer', () => ({
  default: () => <div data-testid="spark-composer" />,
}));
vi.mock('@/components/feed/EmberComposer', () => ({
  default: () => <div data-testid="ember-composer" />,
}));
vi.mock('@/components/feed/SeedlingBanner', () => ({
  useSeedlingStatus: () => ({ isSeedling: false, daysLeft: 0 }),
}));

import AppLayout from '@/components/navigation/AppLayout';

const renderApp = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/']}>
        <AppLayout>
          <div data-testid="page-content" />
        </AppLayout>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  navState.composerOpen = false;
  navState.composerIntent = null;
  navState.setComposerOpen.mockReset();
});

describe('AppLayout composer sheet', () => {
  it('mounts the compose sheet in the signed-in shell (composerOpen has a listener)', async () => {
    navState.composerOpen = true;

    renderApp();

    // The picker appearing proves the sheet is rendered by AppLayout itself —
    // the regression was a lazy import with no JSX, which left this flag dead.
    await waitFor(() =>
      expect(screen.getByText('What would you like to share?')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('renders no sheet content while the composer is closed', async () => {
    renderApp();

    // Give the lazy chunk time to land, then confirm the closed sheet is empty.
    await waitFor(() => expect(screen.getByTestId('page-content')).toBeInTheDocument());
    await Promise.resolve();
    expect(screen.queryByText('What would you like to share?')).toBeNull();
  });

  it('opens straight into the photo composer when the trigger asked for photos', async () => {
    navState.composerOpen = true;
    navState.composerIntent = 'ember';

    renderApp();

    await waitFor(() => expect(screen.getByTestId('ember-composer')).toBeInTheDocument());
    expect(screen.queryByText('What would you like to share?')).toBeNull();
  });

  it('opens straight into the spark composer when the trigger asked for a spark', async () => {
    navState.composerOpen = true;
    navState.composerIntent = 'spark';

    renderApp();

    await waitFor(() => expect(screen.getByTestId('spark-composer')).toBeInTheDocument());
  });
});
