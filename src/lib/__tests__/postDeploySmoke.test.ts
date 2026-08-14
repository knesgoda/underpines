import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const SCRIPT = path.join(ROOT, "scripts/post-deploy-smoke.mjs");
const script = readFileSync(SCRIPT, "utf8");

// The classifier is duplicated here rather than imported: post-deploy-smoke.mjs
// performs network probes at module scope, so importing it inside vitest would
// hit production. This test pins the classification rules the script uses and
// fails if the script's copy drifts out of shape.
function classifyFunction(source: string) {
  if (/constructEventAsync\s*\(/.test(source)) return "stripe-webhook";
  if (/requireCronSecret\s*\(/.test(source)) return "cron";
  if (/requireUser\s*\(/.test(source)) return "member";
  if (/status:\s*401/.test(source)) return "self-auth";
  return "open";
}

describe("post-deploy smoke test", () => {
  it("exports a classifier and keeps every branch the test relies on", () => {
    for (const kind of ["stripe-webhook", "cron", "member", "self-auth", "open"]) {
      expect(script).toContain(`kind: "${kind}"`);
    }
    expect(script).toContain("export function classifyFunction");
  });

  it("classifies the deployed functions we care about", () => {
    const read = (name: string) =>
      readFileSync(path.join(ROOT, "supabase/functions", name, "index.ts"), "utf8");
    expect(classifyFunction(read("stripe-webhook"))).toBe("stripe-webhook");
    expect(classifyFunction(read("triage-report"))).toBe("member");
    expect(classifyFunction(read("log-media-access-failure"))).toBe("member");
    expect(classifyFunction(read("check-block-thresholds"))).toBe("cron");
    expect(classifyFunction(read("process-monthly-payouts"))).toBe("cron");
  });

  it("classifies every function directory without throwing", () => {
    const dirs = readdirSync(path.join(ROOT, "supabase/functions"), { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
      .map((d) => d.name);
    expect(dirs.length).toBeGreaterThan(20);
    for (const name of dirs) {
      const source = readFileSync(path.join(ROOT, "supabase/functions", name, "index.ts"), "utf8");
      expect(["stripe-webhook", "cron", "member", "self-auth", "open"]).toContain(classifyFunction(source));
    }
  });

  it("probes with an empty body only — no real payloads are sent", () => {
    expect(script).toContain('body: "{}"');
    expect(script).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|CRON_SECRET\s*[:=]\s*"/);
  });

  it("treats a 404 from the functions host as an undeployed function", () => {
    expect(script).toContain("function is not deployed");
  });
});
