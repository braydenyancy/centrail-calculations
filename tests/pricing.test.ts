import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalJson, sha256 } from "../src/documents.js";
import { createPricingArtifact, diffPricing, importLiteLLMPricing, loadPricingArtifact, rateUnits, replayPricing, resolvePricing, type ImportPricingOptions, type PricingArtifact, type PricingEvent } from "../src/pricing.js";
const bytes = readFileSync(new URL("./fixtures/litellm.synthetic.json", import.meta.url), "utf8");
function options(input = bytes): ImportPricingOptions { return { asOf: "2026-10-08", source: { id: "synthetic", revision: "a".repeat(40), sha256: sha256(input), retainedAt: "pricing/litellm.synthetic.json", license: "Apache-2.0", notice: "Synthetic test data; no provider pricing claim" } }; }
function artifact() { return importLiteLLMPricing(bytes, options()); }
function event(overrides: Partial<PricingEvent> = {}): PricingEvent { return { provider: "openai", model: "gpt-fixture", input: 1, output: 0, cacheRead: 0, cacheCreation: 0, cacheWrite: 0, cacheWrite5m: 0, cacheWrite1h: 0, completeness: "complete", ...overrides }; }
function mutate(a: PricingArtifact, f: (p: PricingArtifact["parameters"]) => void) { const p = structuredClone(a.parameters); f(p); return createPricingArtifact(p); }
describe("offline pricing artifacts", () => {
  it("imports exact identities, explicit source evidence and retained exclusions", () => {
    const a = artifact(); expect(a.parameters.entries).toHaveLength(3);
    expect(resolvePricing(a, { provider: "openai", model: "gpt-fixture-20261008" })?.rates.input).toMatchObject({ state: "priced", value: "9" });
    expect(a.parameters.exclusions.map(e => e.reason)).toEqual(expect.arrayContaining(["missing_mode_requires_overlay", "unsupported_dimensions"]));
    expect(loadPricingArtifact(canonicalJson(a))).toEqual(a);
  });
  it("is deterministic across object and artifact ordering; source-byte provenance remains distinct", () => {
    const a = artifact(); const p = structuredClone(a.parameters); p.entries.reverse(); p.exclusions.reverse();
    expect(canonicalJson(createPricingArtifact(p))).toBe(canonicalJson(a));
    const reordered = JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(bytes)).reverse()));
    const b = importLiteLLMPricing(reordered, options(reordered));
    expect(b.parameters.entries).toEqual(a.parameters.entries);
    expect(b.parameterRevision).not.toBe(a.parameterRevision);
  });
  it("rejects tampered sources and parameter hashes", () => {
    expect(() => importLiteLLMPricing(bytes + " ", options())).toThrow("Source byte hash");
    const a = artifact(); a.parameters.asOf = "2026-10-09";
    expect(() => loadPricingArtifact(canonicalJson(a))).toThrow("Parameter hash");
    expect(() => replayPricing(a, "token-rates-v1", [])).toThrow("Parameter hash");
  });
  it.each(["{\"x\":{},\"x\":{}}", "{\"x\":{\"mode\":\"chat\",\"mode\":\"chat\"}}"])("rejects duplicate keys before object construction: %s", input => {
    expect(() => importLiteLLMPricing(input, options(input))).toThrow();
  });
  it.each(["-1", "NaN", "Infinity", "01", "1.0", "0.0000001", "1e-6", "1.1234567", "9007199255"])("rejects noncanonical/range-invalid rates %s", rate => expect(() => rateUnits(rate)).toThrow());
  it.each(["0", "0.000001", "1.123456", "1", "10.5"])("parses canonical rate %s", rate => expect(rateUnits(rate)).toBeGreaterThanOrEqual(0n));
  it.each(["-0.1", "1e-20", "1e300"])("quarantines source rates %s", rate => {
    const input = `{"gpt-test":{"mode":"chat","litellm_provider":"openai","input_cost_per_token":${rate},"output_cost_per_token":0}}`;
    expect(importLiteLLMPricing(input, options(input)).parameters.exclusions[0].reason).toBe("invalid_rate");
  });
  it.each(['"0.000001"', 'null', 'true', '{}'])("rejects nonnumeric source rate %s", rate => {
    const input = `{"gpt-test":{"mode":"chat","litellm_provider":"openai","input_cost_per_token":${rate},"output_cost_per_token":0}}`;
    expect(importLiteLLMPricing(input, options(input)).parameters.exclusions[0].reason).toBe("invalid_rate_type");
  });
  it.each([{}, { input_cost_per_token: 0.000001 }, { output_cost_per_token: 0 }])("excludes absent required base rate %s", rates => {
    const input = JSON.stringify({ "gpt-test": { mode: "chat", litellm_provider: "openai", ...rates } });
    expect(importLiteLLMPricing(input, options(input)).parameters.exclusions[0].reason).toBe("missing_base_rates");
  });
  it("accepts enumerated descriptive metadata without accepting unknown rate dimensions", () => {
    const entry = { mode: "chat", litellm_provider: "openai", input_cost_per_token: 0.000001, output_cost_per_token: 0, source: "https://example.test/prices", supported_endpoints: ["/chat/completions"], supported_modalities: ["text", "image"], supported_output_modalities: ["text"], supports_pdf_input: true, supports_native_streaming: true, supports_xhigh_reasoning_effort: true };
    for (const extra of [{}, { supports_new_unknown: true }, { input_cost_per_token_batches: 0.0000005 }, { region: "us" }]) {
      const input = JSON.stringify({ "gpt-test": { ...entry, ...extra } });
      const a = importLiteLLMPricing(input, options(input));
      expect(a.parameters.entries.length).toBe(Object.keys(extra).length ? 0 : 1);
      if (Object.keys(extra).length) expect(a.parameters.exclusions[0].reason).toBe("unsupported_dimensions");
    }
  });
  it("classifies unsupported providers and modes before missing base rates", () => {
    const input = JSON.stringify({ other: { litellm_provider: "azure", mode: "chat" }, image: { litellm_provider: "openai", mode: "image_generation" } });
    const a = importLiteLLMPricing(input, options(input));
    expect(a.parameters.exclusions.map(e => e.reason).sort()).toEqual(["unsupported_mode", "unsupported_provider"]);
  });
  it("enumerates dotted aliases without normalization, chains, cycles or shadowing", () => {
    const a = artifact(); const alias = { provider: "openai" as const, model: "gpt.fixture", target: { provider: "openai" as const, model: "gpt-fixture" }, rationale: "Observed spelling", evidence: "synthetic observation" };
    const b = mutate(a, p => p.aliases.push(alias));
    expect(resolvePricing(b, alias)?.model).toBe("gpt-fixture");
    expect(resolvePricing(b, { provider: "openai", model: "gpt-unknown" })).toBeUndefined();
    expect(() => mutate(b, p => p.aliases.push({ ...alias, model: "chain", target: { ...alias.target, model: alias.model } }))).toThrow("no chains");
    expect(() => mutate(b, p => p.aliases.push({ ...alias, model: "gpt-fixture" }))).toThrow("shadows");
    expect(() => mutate(a, p => p.aliases.push({ ...alias, target: { ...alias.target, model: alias.model } }))).toThrow("no chains");
  });
  it.each([
    ["extra grammar", (p: PricingArtifact["parameters"]) => Object.assign(p, { latest: true })],
    ["unsupported scope", (p: PricingArtifact["parameters"]) => Object.assign(p.entries[0], { scope: "batch" })],
    ["duplicate exact identity", (p: PricingArtifact["parameters"]) => p.entries.push(p.entries[0])],
    ["invalid calendar date", (p: PricingArtifact["parameters"]) => { p.asOf = "2026-02-30"; }],
    ["unproven alias", (p: PricingArtifact["parameters"]) => p.aliases.push({ provider: "openai", model: "unproven", target: { provider: "openai", model: "gpt-fixture" }, rationale: "", evidence: "" })],
  ] as const)("rejects malformed artifact: %s", (_name, change) => expect(() => mutate(artifact(), change)).toThrow());
  it("retains absent rate coverage after exact model removal instead of falling back", () => {
    const a = mutate(artifact(), p => { p.entries = p.entries.filter(e => e.model !== "gpt-fixture-20261008"); });
    expect(replayPricing(a, "token-rates-v1", [event({ model: "gpt-fixture-20261008" })])).toMatchObject({ coverage: "unpriced", usd: 0, issues: ["model_unavailable"] });
  });
  it("reports removals, rate changes, zeros, coverage and evidence separately", () => {
    const a = artifact(); const b = mutate(a, p => { p.entries = p.entries.filter(e => e.model !== "gpt-fixture-20261008"); const e = p.entries.find(e => e.model === "gpt-fixture")!; e.rates.input = { state: "priced", value: "0", evidence: "free" }; e.rates.output = { state: "missing", reason: "removed" }; e.effective = { state: "known", from: "2026-10-08", until: null, evidence: "fixture" }; });
    expect(diffPricing(a, b).map(c => c.kind)).toEqual(expect.arrayContaining(["removed", "rates", "zero_transition", "coverage", "evidence"]));
  });
});
describe("version-selected offline replay", () => {
  it("preserves assignment per-event rounding versus live exact aggregation", () => {
    const a = artifact(); expect(replayPricing(a, "token-rates-v1", [event(), event()]).usd).toBe(0.000002);
    expect(replayPricing(a, "token-buckets-v3", [event(), event()]).usd).toBe(0.000001);
    expect(replayPricing(a, "token-rates-v1", [event({ input: 2 })]).usd).toBe(0.000001);
    expect(replayPricing(a, "token-buckets-v3", [event()]).usdExact).toBe("0.0000005");
  });
  it("keeps missing, explicit zero and not-applicable distinct with partial subtotal", () => {
    const a = artifact(); expect(replayPricing(a, "token-rates-v1", [event({ input: 0, output: 1 })])).toMatchObject({ usd: 0, coverage: "complete", pricedTokens: 1 });
    expect(replayPricing(a, "token-rates-v1", [event({ cacheRead: 1 })])).toMatchObject({ usd: 0.000001, coverage: "partial", pricedTokens: 1 });
    const b = mutate(a, p => { p.entries.find(e => e.model === "gpt-fixture")!.rates.input = { state: "not_applicable", reason: "fixture contradiction" }; });
    expect(replayPricing(b, "token-rates-v1", [event()]).issues).toContain("input_not_applicable");
  });
  it("prices independent TTL rates and explicitly retains only live legacy residual assumptions", () => {
    const e = event({ provider: "anthropic", model: "claude-fixture", input: 0, cacheCreation: 3, cacheWrite5m: 1, cacheWrite1h: 1, completeness: "legacy_assumed" });
    expect(replayPricing(artifact(), "token-buckets-v3", [e])).toMatchObject({ usd: 0.00001575, pricedTokens: 3, assumptions: ["legacy_inputs", "legacy_residual_1h"] });
    expect(replayPricing(artifact(), "token-rates-v1", [e])).toMatchObject({ usd: 0.00001, pricedTokens: 2, coverage: "partial" });
    expect(replayPricing(artifact(), "token-buckets-v3", [{ ...e, cacheCreation: 1 }])).toMatchObject({ usd: 0, pricedTokens: 0, coverage: "unpriced" });
  });
  // Independent method contract: Anthropic 5m=$3.75/M and 1h=$6/M;
  // OpenAI generic writes=$2/M. Invalid evidence never earns a residual assumption.
  // This library does not import or change the application's live pricing kernel.
  it.each([
    ["anthropic", 3, 0, 1, 1, "0.00001575", 3, true, "complete"],
    ["anthropic", 3, 1, 1, 1, "0.00000975", 2, false, "partial"],
    ["anthropic", 3, 4, 1, 1, "0.00000975", 2, false, "partial"],
    ["anthropic", 1, 0, 1, 1, "0", 0, false, "unpriced"],
    ["anthropic", 3, 0, 0, 0, "0.000018", 3, true, "complete"],
    ["anthropic", 2, 0, 1, 1, "0.00000975", 2, true, "complete"],
    ["openai", 3, 3, 0, 0, "0.000006", 3, true, "complete"],
    ["openai", 3, 3, 1, 1, "0.000006", 3, false, "partial"],
    ["openai", 3, 4, 0, 0, "0", 0, false, "unpriced"],
    ["openai", 3, 1, 0, 0, "0.000002", 1, true, "partial"],
    ["openai", 1, 1, 1, 1, "0.000002", 1, false, "partial"],
  ] as const)("retains method contract for %s cache total=%s generic=%s 5m=%s 1h=%s", (provider, cacheCreation, cacheWrite, cacheWrite5m, cacheWrite1h, usdExact, pricedTokens, assumed, coverage) => {
    const model = provider === "anthropic" ? "claude-fixture" : "gpt-fixture";
    const a = mutate(artifact(), p => { p.entries.find(e => e.model === "gpt-fixture")!.rates.cacheWrite = { state: "priced", value: "2", evidence: "synthetic" }; });
    const e = event({ provider, model, input: 0, cacheCreation, cacheWrite, cacheWrite5m, cacheWrite1h, completeness: "legacy_assumed" });
    const actual = replayPricing(a, "token-buckets-v3", [e]);
    expect(actual).toMatchObject({ usdExact, pricedTokens, coverage });
    expect(actual.assumptions.includes("legacy_inputs")).toBe(assumed);
  });
  it("preserves frozen replay after current parameters change", () => {
    const a = artifact(); const receipt = replayPricing(a, "token-rates-v1", [event()]);
    const b = mutate(a, p => { p.entries.find(e => e.model === "gpt-fixture")!.rates.input = { state: "missing", reason: "removed" }; });
    expect(replayPricing(b, "token-rates-v1", [event()]).coverage).toBe("unpriced");
    expect(replayPricing(loadPricingArtifact(canonicalJson(a)), "token-rates-v1", [event()])).toEqual(receipt);
  });
  it.each([-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])("rejects malformed token input %s", input => expect(() => replayPricing(artifact(), "token-rates-v1", [event({ input })])).toThrow());
  it("retains exact high-value output alongside approximate numeric USD", () => {
    const result = replayPricing(artifact(), "token-buckets-v3", [event({ input: Number.MAX_SAFE_INTEGER })]);
    expect(result.units).toBe("4503599627370495500000");
    expect(result.usdExact).toBe("4503599627.3704955");
    expect(Number.isFinite(result.usd)).toBe(true);
  });
  it.each([{ provider: "azure" }, { provider: null }, { model: 123 }, { model: "" }, { model: "bad\\0model" }])("rejects invalid event identity %s", fields => {
    if (fields.model === "bad\\0model") fields.model = "bad" + String.fromCharCode(0) + "model";
    expect(() => replayPricing(artifact(), "token-rates-v1", [event(fields as Partial<PricingEvent>)])).toThrow();
  });
});
