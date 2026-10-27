import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileEnergyArtifact, createEnergyCalculator, replayEnergy, replayEnergyFromTotal } from "../src/energy.js";
import { canonicalJson, sha256, readMethodDocument } from "../src/documents.js";

const root = new URL("../calculations/energy/", import.meta.url);
const source = readFileSync(new URL("parameters.v1.yaml", root), "utf8");
const artifact = compileEnergyArtifact(source);
const calculator = createEnergyCalculator(artifact);
const fixtures = JSON.parse(readFileSync(new URL("fixtures/legacy.v2.json", root), "utf8")) as {
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
  totalTokens: number;
  models: { model: string; energy: { low: number; value: number; high: number }; chat: { low: number; value: number; high: number }; coding: { low: number; value: number; high: number } }[];
};
const boundaries = JSON.parse(readFileSync(new URL("./fixtures/energy-legacy-boundaries.json", import.meta.url), "utf8")) as {
  orderedMatches: string[];
  cases: { name: string; tokens: { low: number; value: number; high: number }; total: { low: number; value: number; high: number } }[];
};

describe("retained energy method", () => {
  it("validates methodology metadata and preserves every ordered rule", () => {
    const doc = readMethodDocument(readFileSync(new URL("METHOD.md", root), "utf8"));
    expect(doc.metadata.id).toBe(artifact.parameters.methodId);
    expect(doc.metadata.revision).toBe(artifact.parameters.methodRevision);
    expect(artifact.parameters.modelFactors.map(({ match }) => match.value)).toEqual(boundaries.orderedMatches);
  });
  it.each(fixtures.models)("replays retained energy for $model", (fixture) => {
    expect(replayEnergy(artifact, fixtures.tokens, fixture.model)).toEqual(fixture.energy);
    expect(calculator.replay(fixtures.tokens, fixture.model)).toEqual(fixture.energy);
    for (const mix of ["chat", "coding"] as const) {
      expect(replayEnergyFromTotal(artifact, fixtures.totalTokens, fixture.model, mix)).toEqual(fixture[mix]);
      expect(calculator.fromTotal(fixtures.totalTokens, fixture.model, mix)).toEqual(fixture[mix]);
    }
  });
  it.each(boundaries.cases)("preserves captured legacy token arithmetic for $name", (fixture) => {
    const value = Number(fixture.name);
    const tokens = { input: value, output: value, cacheRead: value, cacheWrite: value };
    expect(replayEnergy(artifact, tokens)).toEqual(fixture.tokens);
    expect(replayEnergyFromTotal(artifact, value)).toEqual(fixture.total);
    expect(calculator.replay(tokens)).toEqual(fixture.tokens);
    expect(calculator.fromTotal(value)).toEqual(fixture.total);
  });
  it("preserves signed zero in accepted parameter values", () => {
    const parameters = structuredClone(artifact.parameters);
    parameters.blendedRates.chat = { ...parameters.blendedRates.chat, low: -0, value: -0, high: -0 };
    const signedZero = { parameters, parameterRevision: sha256(canonicalJson(parameters)) };
    const direct = replayEnergyFromTotal(signedZero, 1);
    const prepared = createEnergyCalculator(signedZero).fromTotal(1);
    expect(Object.is(direct.value, -0)).toBe(true);
    expect(prepared).toEqual(direct);
    expect(Object.is(prepared.value, -0)).toBe(true);
  });
  it("keeps a private validated snapshot across caller and result mutations", () => {
    const original = structuredClone(artifact);
    const prepared = createEnergyCalculator(original);
    const expected = prepared.replay(fixtures.tokens, "gpt-4o");
    original.parameters.coefficients.input.value = 0.3;
    original.parameters.modelFactors.length = 0;
    original.parameters.defaultModelFactor.value = 10;
    const previousResult = prepared.replay(fixtures.tokens, "gpt-4o");
    previousResult.value = -1;
    expect(prepared.replay(fixtures.tokens, "gpt-4o")).toEqual(expected);
    expect(Object.keys(prepared).sort()).toEqual(["fromTotal", "replay"]);
    expect(() => replayEnergy(original, fixtures.tokens)).toThrow();
  });
  it("rejects tampered or malformed snapshots and unsupported mixes", () => {
    expect(() => createEnergyCalculator({ ...artifact, parameterRevision: "0".repeat(64) })).toThrow(/hash mismatch/);
    const malformed = structuredClone(artifact);
    malformed.parameters.coefficients.input.value = Number.NaN;
    expect(() => createEnergyCalculator(malformed)).toThrow();
    expect(() => calculator.fromTotal(1, undefined, "other" as "chat")).toThrow(/Unsupported usage mix/);
  });
  it("checks the detached snapshot rather than validating an accessor then rereading it", () => {
    const original = structuredClone(artifact);
    let reads = 0;
    const factor = original.parameters.coefficients.input;
    const value = factor.value;
    Object.defineProperty(factor, "value", { enumerable: true, get: () => ++reads === 1 ? value : value + 1 });
    const prepared = createEnergyCalculator(original);
    expect(reads).toBe(1);
    expect(prepared.replay(fixtures.tokens)).toEqual(calculator.replay(fixtures.tokens));
    expect(reads).toBe(1);
  });
  it("is content-addressed independent of source object key order", () => {
    const reordered = Object.fromEntries(Object.entries(JSON.parse(source)).reverse());
    expect(compileEnergyArtifact(JSON.stringify(reordered))).toEqual(artifact);
  });
  it("replays old parameters independently after a new parameter proposal", () => {
    const proposed = JSON.parse(source);
    proposed.coefficients.input.value = 0.3;
    const changed = compileEnergyArtifact(JSON.stringify(proposed));
    expect(changed.parameterRevision).not.toBe(artifact.parameterRevision);
    expect(replayEnergy(changed, fixtures.tokens, "gpt-4o")).not.toEqual(replayEnergy(artifact, fixtures.tokens, "gpt-4o"));
    expect(replayEnergy(artifact, fixtures.tokens, fixtures.models[0].model)).toEqual(fixtures.models[0].energy);
  });
  it("rejects changed retained bytes, unimplemented method revisions, duplicate fields and unordered ranges", () => {
    const tampered = structuredClone(artifact);
    tampered.parameters.coefficients.input.value = 0.3;
    expect(() => replayEnergy(tampered, fixtures.tokens)).toThrow(/hash mismatch/);
    expect(() => compileEnergyArtifact(source.replace('"token-energy-v2"', '"token-energy-v3"'))).toThrow(/Unsupported/);
    expect(() => compileEnergyArtifact(source.replace('"schemaVersion": 1,', '"schemaVersion": 1, "schemaVersion": 1,'))).toThrow();
    const unordered = JSON.parse(source);
    unordered.defaultModelFactor.low = 100;
    expect(() => compileEnergyArtifact(JSON.stringify(unordered))).toThrow(/Unordered/);
  });
  it("leaves retained parameters and caller token counters unchanged during replay", () => {
    const before = JSON.stringify(artifact);
    const tokens = Object.freeze({ ...fixtures.tokens });
    expect(replayEnergy(artifact, tokens, fixtures.models[0].model)).toEqual(fixtures.models[0].energy);
    expect(JSON.stringify(artifact)).toBe(before);
    expect(tokens).toEqual(fixtures.tokens);
  });
});
