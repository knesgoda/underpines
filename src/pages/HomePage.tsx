import { useAuth } from '@/contexts/AuthContext';
import PineTreeLoading from '@/components/PineTreeLoading';
import Feed from './Feed';
import Index from './Index';

const HomePage = () => {
  const { user, loading } = useAuth();

  // Returning null here left a blank white screen for the whole auth
  // round trip, which is the first thing a returning user sees.
  if (loading) return <PineTreeLoading />;
  if (user) return <Feed />;
  return <Index />;
};

export default HomePage;
