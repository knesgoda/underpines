import { useAuth } from '@/contexts/AuthContext';
import Feed from './Feed';
import Index from './Index';

const HomePage = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Feed />;
  return <Index />;
};

export default HomePage;
