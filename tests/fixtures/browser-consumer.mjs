import * as documents from "@centrail/calculations/documents";
import * as energy from "@centrail/calculations/energy";
import * as pricing from "@centrail/calculations/pricing";
import * as workflow from "@centrail/calculations/workflow";
import * as observations from "@centrail/calculations/catalog-observations";
import energyArtifact from "./fixtures/energy.json";
import fixtures from "./fixtures/legacy.v2.json";
import pricingArtifact from "./fixtures/pricing.json";

const equal = (actual, expected) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Browser result mismatch: ${JSON.stringify(actual)}`);
};
const rejects = (run) => {
  try { run(); } catch (error) { if (/hash mismatch/i.test(error.message)) return; throw error; }
  throw new Error("Tampered artifact was accepted");
};
if ("process" in globalThis || "Buffer" in globalThis || "require" in globalThis) throw new Error("Node globals leaked into browser consumer");
equal(documents.sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
equal(energy.compileEnergyArtifact(JSON.stringify(energyArtifact.parameters)).parameterRevision, energyArtifact.parameterRevision);
const calculator = energy.createEnergyCalculator(energyArtifact);
for (const fixture of fixtures.models) {
  equal(energy.replayEnergy(energyArtifact, fixtures.tokens, fixture.model), fixture.energy);
  equal(calculator.replay(fixtures.tokens, fixture.model), fixture.energy);
  for (const mix of ["chat", "coding"]) {
    equal(energy.replayEnergyFromTotal(energyArtifact, fixtures.totalTokens, fixture.model, mix), fixture[mix]);
    equal(calculator.fromTotal(fixtures.totalTokens, fixture.model, mix), fixture[mix]);
  }
}
const catalog = pricing.loadPricingArtifact(JSON.stringify(pricingArtifact));
const event = { provider: "openai", model: "chat-latest", input: 0, output: 0, cacheRead: 1, cacheCreation: 0, cacheWrite: 0, cacheWrite5m: 0, cacheWrite1h: 0, completeness: "complete" };
equal(pricing.replayPricing(catalog, "token-rates-v1", [event, event]).usdExact, "0.000002");
equal(pricing.replayPricing(catalog, "token-buckets-v3", [event, event]).usdExact, "0.000001");
rejects(() => energy.replayEnergy({ ...energyArtifact, parameterRevision: "0".repeat(64) }, fixtures.tokens));
rejects(() => pricing.replayPricing({ ...catalog, parameterRevision: "0".repeat(64) }, "token-buckets-v3", [event]));
rejects(() => energy.createEnergyCalculator({ ...energyArtifact, parameterRevision: "0".repeat(64) }));
const signedZeroParameters = structuredClone(energyArtifact.parameters);
signedZeroParameters.blendedRates.chat.low = -0;
signedZeroParameters.blendedRates.chat.value = -0;
signedZeroParameters.blendedRates.chat.high = -0;
const signedZero = { parameters: signedZeroParameters, parameterRevision: documents.sha256(documents.canonicalJson(signedZeroParameters)) };
if (!Object.is(energy.createEnergyCalculator(signedZero).fromTotal(1).value, -0)) throw new Error("Prepared calculation lost signed zero");
const expected = calculator.replay(fixtures.tokens);
energyArtifact.parameters.coefficients.input.value += 1;
equal(calculator.replay(fixtures.tokens), expected);
// Retain every public export so browser bundling checks the complete API graph.
globalThis.calculations = { documents, energy, pricing, workflow, observations };
globalThis.result = { energyModels: fixtures.models.length, pricingMethods: 2, tamperChecks: 3, preparedSnapshot: true, signedZeroPreserved: true, noNodeGlobals: true };
