import { canonicalJson, parseJsonStrict, sha256 } from "./documents.js";

export type EnergyRange = { low: number; value: number; high: number };
type Citation = { label: string; url: string; note: string };
type CitedRange = EnergyRange & { source: Citation; rangeSource?: Citation };
type Factor = CitedRange & { basis: "anchor" | "price" | "default" };
type TokenClass = "input" | "output" | "cacheRead" | "cacheWrite";
export type EnergyTokens = Record<TokenClass, number>;
export type EnergyMix = "chat" | "coding";
export type EnergyParameters = {
  schemaVersion: 1;
  methodId: "token-energy";
  methodRevision: "token-energy-v2";
  unit: "kWh";
  rangeMeaning: "scenario-bounds";
  effectiveFrom: null;
  provenance: { path: string; sha256: string; note: string };
  coefficients: Record<TokenClass, CitedRange>;
  modelFactors: { match: { kind: "substring" | "regex"; value: string }; factor: Factor }[];
  defaultModelFactor: Factor;
  blendedRates: Record<EnergyMix, CitedRange>;
  usageMixes: Record<EnergyMix, Record<TokenClass, number>>;
};
export type EnergyArtifact = { parameterRevision: string; parameters: EnergyParameters };
const classes = ["input", "output", "cacheRead", "cacheWrite"] as const;
const ends = ["low", "value", "high"] as const;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected energy object");
  return value as Record<string, unknown>;
}
function keys(value: unknown, required: string[], optional: string[] = []) {
  const row = object(value);
  if (required.some((key) => !Object.hasOwn(row, key)) || Object.keys(row).some((key) => !required.includes(key) && !optional.includes(key))) {
    throw new Error("Invalid energy fields");
  }
  return row;
}
function text(value: unknown) {
  if (typeof value !== "string" || !value.trim()) throw new Error("Expected energy text");
}
function nonnegative(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("Invalid energy number");
}
function citation(value: unknown) {
  const row = keys(value, ["label", "url", "note"]);
  Object.values(row).forEach(text);
  if (!/^https:\/\//.test(row.url as string)) throw new Error("Invalid citation URL");
}
function range(value: unknown, factor = false) {
  const row = keys(value, [...ends, "source", ...(factor ? ["basis"] : [])], ["rangeSource"]);
  ends.forEach((end) => nonnegative(row[end]));
  if ((row.low as number) > (row.value as number) || (row.value as number) > (row.high as number)) throw new Error("Unordered energy range");
  citation(row.source);
  if (row.rangeSource !== undefined) citation(row.rangeSource);
  if (factor && !["anchor", "price", "default"].includes(row.basis as string)) throw new Error("Invalid factor basis");
}

export function validateEnergyParameters(value: unknown): asserts value is EnergyParameters {
  const p = keys(value, ["schemaVersion", "methodId", "methodRevision", "unit", "rangeMeaning", "effectiveFrom", "provenance", "coefficients", "modelFactors", "defaultModelFactor", "blendedRates", "usageMixes"]);
  if (p.schemaVersion !== 1 || p.methodId !== "token-energy" || p.methodRevision !== "token-energy-v2" || p.unit !== "kWh" || p.rangeMeaning !== "scenario-bounds" || p.effectiveFrom !== null) throw new Error("Unsupported energy method");
  const provenance = keys(p.provenance, ["path", "sha256", "note"]);
  Object.values(provenance).forEach(text);
  if (!/^[a-f0-9]{64}$/.test(provenance.sha256 as string)) throw new Error("Invalid provenance hash");
  const coefficients = keys(p.coefficients, [...classes]);
  classes.forEach((key) => range(coefficients[key]));
  range(p.defaultModelFactor, true);
  if (!Array.isArray(p.modelFactors) || !p.modelFactors.length) throw new Error("Missing ordered model factors");
  for (const item of p.modelFactors) {
    const row = keys(item, ["match", "factor"]);
    const match = keys(row.match, ["kind", "value"]);
    text(match.value);
    if ((match.value as string).length > 200 || !["regex", "substring"].includes(match.kind as string)) throw new Error("Invalid model matcher");
    if (match.kind === "regex") new RegExp(match.value as string);
    range(row.factor, true);
  }
  const rates = keys(p.blendedRates, ["chat", "coding"]);
  const mixes = keys(p.usageMixes, ["chat", "coding"]);
  for (const mix of ["chat", "coding"] as const) {
    range(rates[mix]);
    const shares = keys(mixes[mix], [...classes]);
    classes.forEach((key) => {
      nonnegative(shares[key]);
      if ((shares[key] as number) > 1) throw new Error("Invalid token share");
    });
  }
}

/** JSON-compatible YAML is the editable source; no executable YAML tags or duplicate keys. */
export function compileEnergyArtifact(source: string): EnergyArtifact {
  const parameters = parseJsonStrict(source);
  validateEnergyParameters(parameters);
  return { parameterRevision: sha256(canonicalJson(parameters)), parameters };
}

function parametersForReplay(artifact: EnergyArtifact): EnergyParameters {
  validateEnergyParameters(artifact.parameters);
  if (sha256(canonicalJson(artifact.parameters)) !== artifact.parameterRevision) throw new Error("Energy artifact hash mismatch");
  return artifact.parameters;
}
function factorFor(parameters: EnergyParameters, model?: string): Factor {
  const name = (model ?? "").toLowerCase();
  return parameters.modelFactors.find(({ match }) => match.kind === "substring" ? name.includes(match.value) : new RegExp(match.value).test(name))?.factor ?? parameters.defaultModelFactor;
}
const nn = (value: number) => Number.isFinite(value) && value > 0 ? value : 0;

/** Retained v2 arithmetic, including nonfinite/negative token sanitization and operation order. */
export function replayEnergy(artifact: EnergyArtifact, tokens: EnergyTokens, model?: string): EnergyRange {
  const p = parametersForReplay(artifact);
  const factor = factorFor(p, model);
  const c = p.coefficients;
  const at = (end: keyof EnergyRange) => ((nn(tokens.input) * c.input[end] + nn(tokens.output) * c.output[end] + nn(tokens.cacheRead) * c.cacheRead[end] + nn(tokens.cacheWrite) * c.cacheWrite[end]) * factor[end]) / 1_000_000;
  return { low: at("low"), value: at("value"), high: at("high") };
}

/** Retains the rounded illustrative blended rates rather than deriving new rates from shares. */
export function replayEnergyFromTotal(artifact: EnergyArtifact, totalTokens: number, model?: string, mix: EnergyMix = "chat"): EnergyRange {
  const p = parametersForReplay(artifact);
  const factor = factorFor(p, model);
  if (mix !== "chat" && mix !== "coding") throw new Error("Unsupported usage mix");
  const at = (end: keyof EnergyRange) => (nn(totalTokens) / 1_000_000) * p.blendedRates[mix][end] * factor[end];
  return { low: at("low"), value: at("value"), high: at("high") };
}
