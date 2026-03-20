// LEGAL-REVIEW-NEEDED: Full privacy policy required before public launch

const Privacy = () => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-16">
      <h1 className="font-display text-3xl text-foreground mb-6">Privacy Policy</h1>

      <div className="prose prose-sm font-body text-foreground/80 space-y-6">
        <p>
          Under Pines is committed to your privacy. This policy is being
          finalized and will be published before public launch. Under Pines
          does not run ads, does not sell user data, and does not track
          engagement. For questions: hello@underpines.com
        </p>

        <h2 className="font-display text-xl text-foreground">
          Children's Privacy (COPPA)
        </h2>
        <p>
          Under Pines complies with the Children's Online Privacy Protection
          Act. Users under 13 are not permitted on the platform. Users aged
          13–17 require verifiable parental consent before their account is
          activated.
        </p>
        <p className="text-muted-foreground italic text-xs">
          [Full policy — legal review pending]
        </p>

        <h2 className="font-display text-xl text-foreground">
          What We Collect
        </h2>
        <p>
          Under Pines collects the minimum data needed to operate: your
          display name, handle, email address, and age bracket. We do not
          store full dates of birth. We do not share your data with
          third-party advertisers.
        </p>

        <h2 className="font-display text-xl text-foreground">
          Data Minimization
        </h2>
        <p>
          We store hashed versions of sensitive identifiers (phone numbers,
          IP addresses, parent email addresses) rather than plaintext. Your
          content belongs to you.
        </p>

        <p className="text-muted-foreground italic text-xs mt-12">
          Last updated: Draft — not yet legally reviewed.
        </p>
      </div>
    </div>
  );
};

export default Privacy;
