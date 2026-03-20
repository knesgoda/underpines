const PineTreeLoading = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background texture-paper">
      <div className="flex flex-col items-center gap-6">
        <svg
          width="48"
          height="72"
          viewBox="0 0 48 72"
          fill="none"
          className="animate-tree-sway"
        >
          {/* Tree top */}
          <path d="M24 4 L14 24 L34 24 Z" fill="hsl(var(--pine-dark))" opacity="0.9" />
          {/* Tree middle */}
          <path d="M24 14 L10 38 L38 38 Z" fill="hsl(var(--pine-dark))" opacity="0.75" />
          {/* Tree bottom */}
          <path d="M24 26 L6 52 L42 52 Z" fill="hsl(var(--pine-dark))" opacity="0.6" />
          {/* Trunk */}
          <rect x="20" y="52" width="8" height="16" rx="2" fill="hsl(var(--amber-deep))" opacity="0.7" />
        </svg>
        <p className="text-sm text-muted-foreground font-body animate-fade-in">
          Getting your Cabin ready
        </p>
      </div>
    </div>
  );
};

export default PineTreeLoading;
