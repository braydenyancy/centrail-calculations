import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalJson, sha256 } from "../src/documents.js";
import { createPricingArtifact, importLiteLLMPricing } from "../src/pricing.js";
import { proposePricing, recordPricingAcceptance, renderPricingMethodology, type ComparisonEvidence } from "../src/workflow.js";

const source = readFileSync(new URL("./fixtures/litellm.synthetic.json", import.meta.url), "utf8");
const method = readFileSync(new URL("../calculations/pricing/METHOD.md", import.meta.url), "utf8");
const artifact = () => importLiteLLMPricing(source, { asOf: "2026-10-08", source: { id: "fixture", revision: "a".repeat(40), sha256: sha256(source), retainedAt: "fixture.json", license: "Apache-2.0", notice: "Synthetic" } });
const comparison = (): ComparisonEvidence => ({ provider: "openai", model: "gpt-fixture", component: "input", left: { source: "fixture-a", revision: "a1", value: "0.5" }, right: { source: "fixture-b", revision: "b1", value: "0.6" }, unit: "USD-per-million-tokens", comparable: true, reason: "Synthetic disagreement for the same text-token scope", resolution: "unresolved" });
describe("reviewed calculation proposal workflow", () => {
  it("generates deterministic proposal and documentation from the same records", () => {
    const a = artifact(); const p = proposePricing(a, method);
    expect(p.status).toBe("proposed");
    expect(canonicalJson(proposePricing(a, method))).toBe(canonicalJson(p));
    const prose = renderPricingMethodology(a, method, p);
    expect(prose).toContain(a.parameterRevision);
    expect(prose).toContain("awaiting review");
    expect(prose).toContain("3 exact entries");
    expect(() => renderPricingMethodology(a, method + "changed", p)).toThrow("match proposal");
  });
  it("retains discrepancies and requires their resolution before acceptance", () => {
    const p = proposePricing(artifact(), method, undefined, [comparison()]);
    expect(p.comparisons[0].right.value).toBe("0.6");
    const review = { proposalHash: sha256(canonicalJson(p)), acceptedAt: "2026-10-08T12:00:00.000Z", reference: "fixture-review" };
    expect(() => recordPricingAcceptance(p, review)).toThrow("Unresolved");
    p.comparisons[0].resolution = "keep-left";
    expect(() => recordPricingAcceptance(p, review)).toThrow("exact proposal");
    const accepted = recordPricingAcceptance(p, { ...review, proposalHash: sha256(canonicalJson(p)) });
    expect(accepted.parameterRevision).toBe(p.parameterRevision);
    expect(p.status).toBe("proposed");
  });
  it("keeps incompatible evidence separate and rejects invalid scope", () => {
    expect(() => proposePricing(artifact(), method, undefined, [{ ...comparison(), comparable: false }])).toThrow();
    expect(proposePricing(artifact(), method, undefined, [{ ...comparison(), comparable: false, resolution: "incomparable" }]).comparisons).toHaveLength(1);
  });
  it.each(["", "2026-02-30T12:00:00.000Z", "2026-10-08"])("rejects invalid acceptance time %s", acceptedAt => {
    const p = proposePricing(artifact(), method);
    expect(() => recordPricingAcceptance(p, { proposalHash: sha256(canonicalJson(p)), acceptedAt, reference: "test" })).toThrow();
  });
  it.each([
    { schemaVersion: 999 }, { parameterRevision: "not-a-hash" },
    { comparisons: [{ resolution: "anything" }] }, { changes: [{ kind: "auto-accept" }] },
  ])("rejects malformed proposal even with matching review hash: %j", change => {
    const p = Object.assign(proposePricing(artifact(), method), change);
    expect(() => recordPricingAcceptance(p, { proposalHash: sha256(canonicalJson(p)), acceptedAt: "2026-10-08T12:00:00.000Z", reference: "fixture" })).toThrow();
  });
  it("rejects a changed artifact before producing public methodology", () => {
    const a = artifact(); const p = proposePricing(a, method);
    a.parameters.asOf = "2099-01-01";
    expect(() => renderPricingMethodology(a, method, p)).toThrow("hash mismatch");
  });
  it("escapes source-controlled Markdown and HTML in generated explanations", () => {
    const parameters = artifact().parameters;
    parameters.sources[0].id = "![external image](https://example.invalid/pixel)";
    parameters.sources[0].revision = "`<img src='https://example.invalid/pixel'>`";
    const a = createPricingArtifact(parameters);
    const prose = renderPricingMethodology(a, method, proposePricing(a, method));
    expect(prose).not.toContain("![external image](");
    expect(prose).not.toContain("<img");
    expect(prose).toContain("&lt;img");
  });
});
