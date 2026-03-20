// LEGAL-REVIEW-NEEDED: Full terms of service required before public launch

const Terms = () => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-16">
      <h1 className="font-display text-3xl text-foreground mb-6">Terms of Service</h1>

      <div className="prose prose-sm font-body text-foreground/80 space-y-6">
        <p>
          Under Pines is an invite-only social platform built around
          privacy, warmth, and real human connection. By using Under Pines,
          you agree to these terms.
        </p>

        <h2 className="font-display text-xl text-foreground">
          Age Requirement
        </h2>
        <p>
          Under Pines is for users aged 13 and older. Users aged 13–17 must
          have parental consent to participate. Users under 13 are not
          permitted on the platform under any circumstances.
        </p>

        <h2 className="font-display text-xl text-foreground">
          Community Standards
        </h2>
        <p>
          Every member of Under Pines was vouched for by another member.
          You are responsible for who you invite. Harmful, dangerous, or
          illegal content will result in account suspension or permanent
          removal.
        </p>

        <h2 className="font-display text-xl text-foreground">
          Your Content
        </h2>
        <p>
          You own what you create on Under Pines. We do not claim rights to
          your posts, stories, or messages. We do not sell your data or use
          it for advertising.
        </p>

        <p className="text-muted-foreground italic text-xs mt-12">
          Last updated: Draft — not yet legally reviewed.
        </p>
      </div>
    </div>
  );
};

export default Terms;
