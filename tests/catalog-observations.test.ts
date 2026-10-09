import { describe, expect, it } from "vitest";
import { observeCatalog } from "../src/catalog-observations.js";
import { sha256 } from "../src/documents.js";

function source(bytes: string) {
  const digest = sha256(bytes);
  return { id: "fixture", revision: `sha256:${digest}`, sha256: digest, retainedAt: "source.json", license: "synthetic", notice: "NOTICE.txt" };
}

describe("catalog observations remain separate review evidence", () => {
  it("retains exact decimals, zeroes, nulls and unknown pricing dimensions", () => {
    const bytes = '{"openai":{"models":{"dated-key":{"id":"gpt-model-20261008","cost":{"input":0.1234567890123456789,"output":0,"cache_read":null,"context_over_200k":{"input":2}},"limit":{"context":200000}}}}}';
    const result = observeCatalog("models-dev", bytes, source(bytes));
    expect(result.status).toBe("review-only");
    expect(result.observations[0]).toMatchObject({ catalogProvider: "openai", catalogKey: "dated-key", model: "gpt-model-20261008",
      tokenRateUnit: "USD-per-million-tokens", pricing: { input: "0.1234567890123456789", output: "0", cache_read: null, context_over_200k: { input: "2" } } });
    expect(result).not.toHaveProperty("parameterRevision");
  });
  it("does not turn an OpenRouter manufacturer prefix into a direct provider", () => {
    const bytes = JSON.stringify({ data: [{ id: "anthropic/claude-model", pricing: { prompt: "0.000003", completion: "0.000015", request: "0.01" } }] });
    const [row] = observeCatalog("openrouter", bytes, source(bytes)).observations;
    expect(row.catalogProvider).toBe("openrouter");
    expect(row.tokenRateUnit).toBe("USD-per-token");
    expect(row.pricing?.request).toBe("0.01");
    expect(row).not.toHaveProperty("unit");
    expect(row.reviewReasons).toContain("non_token_pricing_fields_retain_source_specific_units");
    expect(row.reviewReasons).toContain("router_listing_does_not_identify_serving_endpoint");
  });
  it("rejects unrelated manifest fields instead of retaining private metadata", () => {
    const bytes = '{"data":[]}';
    expect(() => observeCatalog("openrouter", bytes, { ...source(bytes), localPath: "/private/history" } as ReturnType<typeof source>)).toThrow("source evidence");
  });
  it("retains missing pricing instead of synthesizing free usage", () => {
    const bytes = '{"data":[{"id":"new-model"}]}';
    expect(observeCatalog("openrouter", bytes, source(bytes)).observations[0].pricing).toBeNull();
  });
  it("is reproducible and binds exact source bytes", () => {
    const bytes = '{"data":[]}';
    expect(observeCatalog("openrouter", bytes, source(bytes))).toEqual(observeCatalog("openrouter", bytes, source(bytes)));
    expect(() => observeCatalog("openrouter", bytes + " ", source(bytes))).toThrow("hash");
  });
  it("rejects a mutable revision", () => {
    const bytes = '{"data":[]}';
    expect(() => observeCatalog("openrouter", bytes, { ...source(bytes), revision: "main" })).toThrow("revision");
  });
  it.each(['{"data":[],"data":[]}', '{"data":[{"id":"a"},{"id":"a"}]}'])("rejects duplicate keys or identities", (bytes) => {
    expect(() => observeCatalog("openrouter", bytes, source(bytes))).toThrow();
  });
  it.each(['{"data":{}}', '{"data":[{}]}'])("rejects malformed catalog structure", (bytes) => {
    expect(() => observeCatalog("openrouter", bytes, source(bytes))).toThrow();
  });
});
