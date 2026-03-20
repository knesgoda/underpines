import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background texture-paper">
      <div className="text-center px-6">
        <p className="text-4xl mb-6">🌲</p>
        <h1 className="font-display text-2xl text-foreground mb-2">
          You've wandered off the trail.
        </h1>
        <p className="font-body text-sm text-muted-foreground mb-8">
          This page doesn't exist.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm hover:opacity-90 transition-opacity"
        >
          Head back home →
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
