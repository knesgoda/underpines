import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
// Plain .mjs helper shared with scripts/deploy-smoke-test.mjs
import { extractPinnedTags, diffPinnedTags, diffBinaryAsset, PINNED_HEAD_PATTERNS } from "../../../scripts/deployHeadContract.mjs";

const ROOT = path.resolve(__dirname, "../../..");
const repoHtml = readFileSync(path.join(ROOT, "index.html"), "utf8");

describe("deploy head contract", () => {
  it("finds every pinned tag in the repo index.html", () => {
    const { tags, missing } = extractPinnedTags(repoHtml);
    expect(missing).toEqual([]);
    expect(Object.keys(tags)).toHaveLength(PINNED_HEAD_PATTERNS.length);
    expect(tags["viewport-fit"]).toContain("viewport-fit=cover");
    expect(tags["apple-touch-icon"]).toContain("/apple-touch-icon.png");
  });

  it("ships an apple-touch-icon.png in public/", () => {
    const bytes = readFileSync(path.join(ROOT, "public/apple-touch-icon.png"));
    expect(bytes.length).toBeGreaterThan(1000);
    // PNG magic number — an HTML error page must never pass as the icon.
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });

  it("passes when the deployment is identical", () => {
    expect(diffPinnedTags(repoHtml, repoHtml)).toEqual([]);
  });

  it("fails when hosting drops viewport-fit=cover", () => {
    const mangled = repoHtml.replace(", viewport-fit=cover", "");
    const failures = diffPinnedTags(repoHtml, mangled);
    expect(failures.join("\n")).toContain("viewport-fit");
  });

  it("fails when hosting drops a Supabase preconnect", () => {
    const mangled = repoHtml.replace(
      /<link rel="preconnect" href="https:\/\/[a-z0-9]+\.supabase\.co" \/>/,
      "",
    );
    expect(diffPinnedTags(repoHtml, mangled).join("\n")).toContain("supabase-preconnect-plain");
  });

  it("fails when the touch icon bytes differ", () => {
    const a = Buffer.from("aaaa");
    expect(diffBinaryAsset("apple-touch-icon.png", a, Buffer.from("bbbb"))).toContain("sha256 differs");
    expect(diffBinaryAsset("apple-touch-icon.png", a, Buffer.from("aa"))).toContain("size differs");
    expect(diffBinaryAsset("apple-touch-icon.png", a, a)).toBeNull();
  });

  it("ignores whitespace-only formatting differences", () => {
    const reformatted = repoHtml.replace(
      /<meta name="apple-mobile-web-app-capable" content="yes" \/>/,
      '<meta   name="apple-mobile-web-app-capable"\n      content="yes" />',
    );
    expect(diffPinnedTags(repoHtml, reformatted)).toEqual([]);
  });
});
