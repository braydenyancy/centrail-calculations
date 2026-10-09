import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { relative, isAbsolute } from "node:path";
import { canonicalJson, sha256, readMethodDocument } from "@centrail/calculations/documents";
import { replayEnergy, replayEnergyFromTotal } from "@centrail/calculations/energy";
import { loadPricingArtifact, replayPricing } from "@centrail/calculations/pricing";
import { proposePricing, recordPricingAcceptance } from "@centrail/calculations/workflow";
import { observeCatalog } from "@centrail/calculations/catalog-observations";

const json = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const artifact = json("energy.json");
const fixtures = json("legacy.v2.json");
assert.equal(artifact.parameterRevision, "ca8dbed39db8267eb1019d7d44683c34d23a5d29f7af794ce2bf0b8de66330dd");
assert.equal(artifact.parameterRevision, sha256(canonicalJson(artifact.parameters)));
assert.equal(artifact.parameters.methodRevision, "token-energy-v2");
assert.equal(fixtures.models.length, 32);
for (const fixture of fixtures.models) {
  assert.deepEqual(replayEnergy(artifact, fixtures.tokens, fixture.model), fixture.energy);
  for (const mix of ["chat", "coding"]) {
    assert.deepEqual(replayEnergyFromTotal(artifact, fixtures.totalTokens, fixture.model, mix), fixture[mix]);
  }
}

const pricing = loadPricingArtifact(readFileSync(new URL("./fixtures/pricing.json", import.meta.url), "utf8"));
assert.equal(pricing.parameterRevision, "90e707af812dbc3a46a495b358da6dd21f05149e8cbfcaef159cab0639c9348e");
const event = { provider: "openai", model: "chat-latest", input: 0, output: 0, cacheRead: 1, cacheCreation: 0, cacheWrite: 0, cacheWrite5m: 0, cacheWrite1h: 0, completeness: "complete" };
const frozen = replayPricing(pricing, "token-rates-v1", [event, event]);
const live = replayPricing(pricing, "token-buckets-v3", [event, event]);
assert.equal(frozen.usdExact, "0.000002");
assert.equal(live.usdExact, "0.000001");
assert.equal(live.coverage, "complete");
assert.equal(live.methodRevision, "1");
assert.equal(live.parameterRevision, pricing.parameterRevision);

const method = readFileSync(new URL("./fixtures/pricing-METHOD.md", import.meta.url), "utf8");
assert.equal(readMethodDocument(method).metadata.kind, "pricing");
const proposal = proposePricing(pricing, method);
const acceptance = recordPricingAcceptance(proposal, {
  proposalHash: sha256(canonicalJson(proposal)),
  acceptedAt: "2026-10-09T12:00:00.000Z",
  reference: "synthetic-package-test",
});
assert.equal(acceptance.parameterRevision, pricing.parameterRevision);
assert.equal(proposal.status, "proposed");

const bytes = '{"data":[{"id":"openai/synthetic","pricing":{"prompt":"0.000001","completion":"0.000002"}}]}';
const observations = observeCatalog("openrouter", bytes, {
  id: "synthetic", revision: `sha256:${sha256(bytes)}`, sha256: sha256(bytes),
  retainedAt: "synthetic.json", license: "Apache-2.0", notice: "Invented test values; no provider price claim",
});
assert.equal(observations.observations.length, 1);

const tampered = structuredClone(artifact);
tampered.parameters.coefficients.input.high += 1;
assert.throws(() => replayEnergy(tampered, fixtures.tokens), /hash mismatch/);
for (const name of ["documents", "pricing", "energy", "workflow", "catalog-observations"]) {
  const resolved = fileURLToPath(import.meta.resolve(`@centrail/calculations/${name}`));
  const inside = relative(fileURLToPath(new URL("./node_modules/@centrail/calculations/", import.meta.url)), resolved);
  assert.ok(!inside.startsWith("..") && !isAbsolute(inside), `Export ${name} resolves outside the installed package`);
}
console.log(JSON.stringify({ energyCases: fixtures.models.length, energyAssertions: fixtures.models.length * 3, pricingMethodsDistinct: true, allFiveExportsExercised: true, hashTamperRejected: true }));
