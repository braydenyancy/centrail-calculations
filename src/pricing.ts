import { canonicalJson, parseJsonStrict, sha256 } from "./documents.js";

export const PRICING_COMPONENTS = ["input", "output", "cacheRead", "cacheWrite", "cacheWrite5m", "cacheWrite1h"] as const;
export type Component = typeof PRICING_COMPONENTS[number];
export type Rate = { state: "priced"; value: string; evidence: string } | { state: "missing" | "not_applicable"; reason: string };
export type Identity = { provider: "openai" | "anthropic"; model: string };
export type PricingEntry = Identity & {
  mode: "chat" | "responses";
  scope: "direct-api-text-tokens";
  rates: Record<Component, Rate>;
  effective: { state: "unknown" } | { state: "known"; from: string; until: string | null; evidence: string };
  assumptions: string[];
};
export type PricingSource = { id: string; revision: string; sha256: string; retainedAt: string; license: string; notice: string };
export type PricingAlias = Identity & { target: Identity; rationale: string; evidence: string };
export type PricingExclusion = { identity: string; reason: string; dimensions: string[] };
export type PricingParameters = {
  schemaVersion: 1; importerVersion: "litellm-local-v1"; asOf: string;
  sources: PricingSource[]; entries: PricingEntry[]; aliases: PricingAlias[];
  exclusions: PricingExclusion[]; overlays: { id: string; revision: string; evidence: string; rationale: string }[];
};
export type PricingArtifact = { parameterRevision: string; parameters: PricingParameters };
export type PricingMethod = "token-rates-v1" | "token-buckets-v3";
const MAX = BigInt(Number.MAX_SAFE_INTEGER);
const key = (v: Identity) => `${v.provider}\0${v.model}`;
function assert(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
function obj(v: unknown): asserts v is Record<string, unknown> { assert(v !== null && typeof v === "object" && !Array.isArray(v), "Expected object"); }
function fields(v: Record<string, unknown>, names: string[]) { assert(Object.keys(v).every(k => names.includes(k)) && names.every(k => k in v), "Unexpected or missing field"); }
function text(v: unknown): asserts v is string { assert(typeof v === "string" && v.length > 0 && !v.includes("\0"), "Expected nonempty string"); }
function strings(v: unknown): asserts v is string[] { assert(Array.isArray(v), "Expected array"); v.forEach(text); }
function date(v: unknown): asserts v is string { text(v); assert(/^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(v).toISOString().slice(0, 10) === v, "Invalid date"); }
function identity(v: Record<string, unknown>) { assert(v.provider === "openai" || v.provider === "anthropic", "Unsupported provider"); text(v.model); }
/** Integer millionths of a USD-per-million rate, without binary conversion. */
export function rateUnits(v: string): bigint {
  assert(typeof v === "string" && /^(0|[1-9]\d*)(\.\d{1,5}[1-9]|\.[1-9])?$/.test(v), "Noncanonical or excessive rate precision");
  const [whole, fraction = ""] = v.split(".");
  const result = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  assert(result <= MAX, "Rate outside supported range"); return result;
}
function validateParameters(raw: unknown): asserts raw is PricingParameters {
  obj(raw); fields(raw, ["schemaVersion", "importerVersion", "asOf", "sources", "entries", "aliases", "exclusions", "overlays"]);
  assert(raw.schemaVersion === 1 && raw.importerVersion === "litellm-local-v1", "Unsupported schema/importer"); date(raw.asOf);
  for (const name of ["sources", "entries", "aliases", "exclusions", "overlays"]) assert(Array.isArray(raw[name]), "Expected array");
  const sources = new Set<string>();
  for (const s of raw.sources as unknown[]) { obj(s); fields(s, ["id", "revision", "sha256", "retainedAt", "license", "notice"]); Object.values(s).forEach(text); assert(/^[a-f0-9]{64}$/.test(s.sha256 as string), "Invalid source hash"); assert(!sources.has(s.id as string), "Duplicate source"); sources.add(s.id as string); }
  const entries = new Set<string>();
  for (const e of raw.entries as unknown[]) {
    obj(e); fields(e, ["provider", "model", "mode", "scope", "rates", "effective", "assumptions"]); identity(e);
    assert(e.mode === "chat" || e.mode === "responses", "Unsupported mode"); assert(e.scope === "direct-api-text-tokens", "Unsupported scope");
    obj(e.rates); fields(e.rates, [...PRICING_COMPONENTS]);
    for (const r of Object.values(e.rates)) { obj(r); if (r.state === "priced") { fields(r, ["state", "value", "evidence"]); text(r.value); rateUnits(r.value); text(r.evidence); } else { fields(r, ["state", "reason"]); assert(r.state === "missing" || r.state === "not_applicable", "Invalid rate state"); text(r.reason); } }
    obj(e.effective); if (e.effective.state === "unknown") fields(e.effective, ["state"]); else { fields(e.effective, ["state", "from", "until", "evidence"]); assert(e.effective.state === "known", "Invalid effective state"); date(e.effective.from); if (e.effective.until !== null) { date(e.effective.until); assert(e.effective.until > e.effective.from, "Invalid interval"); } text(e.effective.evidence); }
    strings(e.assumptions); const k = key(e as PricingEntry); assert(!entries.has(k), "Duplicate identity"); entries.add(k);
  }
  const aliases = new Set<string>();
  for (const a of raw.aliases as unknown[]) { obj(a); fields(a, ["provider", "model", "target", "rationale", "evidence"]); identity(a); obj(a.target); fields(a.target, ["provider", "model"]); identity(a.target); text(a.rationale); text(a.evidence); const k = key(a as PricingAlias); assert(!entries.has(k) && !aliases.has(k), "Alias shadows identity"); assert(entries.has(key(a.target as Identity)), "Alias must target exact entry, no chains"); assert(a.provider === a.target.provider, "Alias crosses provider"); aliases.add(k); }
  for (const e of raw.exclusions as unknown[]) { obj(e); fields(e, ["identity", "reason", "dimensions"]); text(e.identity); text(e.reason); strings(e.dimensions); }
  const overlays = new Set<string>();
  for (const o of raw.overlays as unknown[]) { obj(o); fields(o, ["id", "revision", "evidence", "rationale"]); Object.values(o).forEach(text); assert(!overlays.has(o.id as string), "Duplicate overlay"); overlays.add(o.id as string); }
}
export function createPricingArtifact(parameters: PricingParameters): PricingArtifact {
  validateParameters(parameters);
  const p = JSON.parse(JSON.stringify(parameters)) as PricingParameters;
  p.sources.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  p.entries.sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
  p.aliases.sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
  for (const e of p.exclusions) e.dimensions.sort();
  p.exclusions.sort((a, b) => canonicalJson(a) < canonicalJson(b) ? -1 : canonicalJson(a) > canonicalJson(b) ? 1 : 0);
  p.overlays.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  for (const e of p.entries) e.assumptions.sort();
  for (const e of p.exclusions) e.dimensions.sort();
  return { parameterRevision: sha256(canonicalJson(p)), parameters: p };
}
export function loadPricingArtifact(bytes: string): PricingArtifact {
  const raw = parseJsonStrict(bytes); obj(raw); fields(raw, ["parameterRevision", "parameters"]); validateParameters(raw.parameters);
  const artifact = createPricingArtifact(raw.parameters);
  assert(raw.parameterRevision === artifact.parameterRevision, "Parameter hash mismatch"); return artifact;
}
export function resolvePricing(artifact: PricingArtifact, observed: Identity): PricingEntry | undefined {
  const exact = artifact.parameters.entries.find(e => key(e) === key(observed)); if (exact) return exact;
  const alias = artifact.parameters.aliases.find(a => key(a) === key(observed));
  return alias ? artifact.parameters.entries.find(e => key(e) === key(alias.target)) : undefined;
}
export type PricingEvent = Identity & {
  input: number; output: number; cacheRead: number; cacheCreation: number;
  cacheWrite: number; cacheWrite5m: number; cacheWrite1h: number;
  completeness: "complete" | "incomplete" | "unpriced" | "legacy_assumed";
};
export type PricingReplay = { methodId: PricingMethod; methodRevision: "1"; parameterRevision: string; units: string; denominator: "1000000" | "1000000000000"; usdExact: string; usd: number; events: number; pricedTokens: number; tokens: number; issues: string[]; coverage: "complete" | "partial" | "unpriced"; assumptions: string[] };
export function replayPricing(artifact: PricingArtifact, method: PricingMethod, events: readonly PricingEvent[]): PricingReplay {
  assert(method === "token-rates-v1" || method === "token-buckets-v3", "Unsupported method");
  assert(createPricingArtifact(artifact.parameters).parameterRevision === artifact.parameterRevision, "Parameter hash mismatch");
  let units = 0n, tokens = 0, pricedTokens = 0; const issues = new Set<string>(), assumptions = new Set<string>();
  for (const e of events) {
    obj(e); identity(e);
    for (const c of ["input", "output", "cacheRead", "cacheCreation", "cacheWrite", "cacheWrite5m", "cacheWrite1h"] as const) assert(Number.isSafeInteger(e[c]) && e[c] >= 0, "Invalid token count");
    assert(["complete", "incomplete", "unpriced", "legacy_assumed"].includes(e.completeness), "Invalid completeness");
    const total = e.input + e.output + e.cacheRead + e.cacheCreation; assert(Number.isSafeInteger(total), "Token total overflow"); tokens += total;
    const entry = resolvePricing(artifact, e);
    if (!entry || e.completeness === "unpriced") { issues.add(!entry ? "model_unavailable" : "conflicting_inputs"); continue; }
    entry.assumptions.forEach(a => assumptions.add(a));
    const counts: Record<Component, number> = { input: e.input, output: e.output, cacheRead: e.cacheRead, cacheWrite: 0, cacheWrite5m: 0, cacheWrite1h: 0 };
    const ttl = e.cacheWrite5m + e.cacheWrite1h;
    const validTtl = Number.isSafeInteger(ttl) && ttl <= e.cacheCreation;
    const legacyEligible = validTtl && e.cacheWrite <= e.cacheCreation
      && (e.provider === "anthropic" ? e.cacheWrite === 0 : ttl === 0);
    const legacyAssumed = e.completeness === "legacy_assumed" && legacyEligible;
    if (!validTtl) issues.add("ttl_buckets_exceed_cache_creation_total");
    if (e.provider === "anthropic") {
      if (e.cacheWrite > 0) issues.add("generic_cache_write_unsupported_for_provider");
      if (validTtl) { counts.cacheWrite5m = e.cacheWrite5m; counts.cacheWrite1h = e.cacheWrite1h; const residual = e.cacheCreation - ttl;
        if (residual > 0 && method === "token-buckets-v3" && legacyAssumed) { counts.cacheWrite1h += residual; assumptions.add("legacy_residual_1h"); }
        else if (residual > 0) issues.add("cache_creation_ttl_detail_incomplete");
      }
    } else {
      if (ttl > 0) issues.add("ttl_cache_write_unsupported_for_provider");
      if (e.cacheWrite <= e.cacheCreation) counts.cacheWrite = e.cacheWrite; else issues.add("generic_cache_write_exceeds_cache_creation_total");
      if (e.cacheWrite < e.cacheCreation) issues.add("cache_write_input_incomplete");
    }
    if (e.completeness === "incomplete") issues.add("incomplete_inputs");
    if (legacyAssumed) assumptions.add("legacy_inputs");
    let eventUnits = 0n;
    for (const c of PRICING_COMPONENTS) { if (counts[c] === 0) continue; const r = entry.rates[c]; if (r.state !== "priced") { issues.add(`${c}_${r.state}`); continue; } pricedTokens += counts[c]; eventUnits += BigInt(counts[c]) * rateUnits(r.value); }
    units += method === "token-rates-v1" ? (eventUnits + 500_000n) / 1_000_000n : eventUnits;
  }
  assert(Number.isSafeInteger(tokens) && Number.isSafeInteger(pricedTokens), "Token total overflow");
  const denominator = method === "token-rates-v1" ? "1000000" : "1000000000000";
  const places = denominator.length - 1;
  const digits = units.toString().padStart(places + 1, "0");
  const fractional = digits.slice(-places).replace(/0+$/, "");
  const usdExact = digits.slice(0, -places) + (fractional ? `.${fractional}` : "");
  const usd = Number(usdExact); assert(Number.isFinite(usd), "Output outside finite numeric range");
  return { methodId: method, methodRevision: "1", parameterRevision: artifact.parameterRevision, units: units.toString(), denominator, usdExact, usd, events: events.length, tokens, pricedTokens, issues: [...issues].sort(), assumptions: [...assumptions].sort(), coverage: tokens > 0 && pricedTokens === 0 ? "unpriced" : issues.size || pricedTokens !== tokens ? "partial" : "complete" };
}
export type PricingChange = { kind: "added" | "removed" | "rates" | "zero_transition" | "coverage" | "aliases" | "evidence" | "assumptions" | "sources" | "overlays"; identity?: string };
export function diffPricing(before: PricingArtifact, after: PricingArtifact): PricingChange[] {
  const changes: PricingChange[] = []; const a = new Map(before.parameters.entries.map(e => [key(e), e])), b = new Map(after.parameters.entries.map(e => [key(e), e]));
  for (const [k, e] of a) { const next = b.get(k); if (!next) { changes.push({ kind: "removed", identity: k }); continue; }
    if (e.mode !== next.mode || e.scope !== next.scope) changes.push({ kind: "coverage", identity: k });
    if (canonicalJson(e.rates) !== canonicalJson(next.rates)) changes.push({ kind: "rates", identity: k });
    for (const c of PRICING_COMPONENTS) { const old = e.rates[c], n = next.rates[c]; if ((old.state === "priced" && old.value === "0") !== (n.state === "priced" && n.value === "0")) changes.push({ kind: "zero_transition", identity: `${k}/${c}` }); if (old.state !== n.state) changes.push({ kind: "coverage", identity: `${k}/${c}` }); }
    if (canonicalJson(e.effective) !== canonicalJson(next.effective)) changes.push({ kind: "evidence", identity: k });
    if (canonicalJson(e.assumptions) !== canonicalJson(next.assumptions)) changes.push({ kind: "assumptions", identity: k });
  }
  for (const k of b.keys()) if (!a.has(k)) changes.push({ kind: "added", identity: k });
  for (const field of ["aliases", "sources", "overlays"] as const) if (canonicalJson(before.parameters[field]) !== canonicalJson(after.parameters[field])) changes.push({ kind: field });
  if (before.parameters.asOf !== after.parameters.asOf) changes.push({ kind: "evidence" });
  if (canonicalJson(before.parameters.exclusions) !== canonicalJson(after.parameters.exclusions)) changes.push({ kind: "coverage" });
  return changes;
}

const SOURCE_FIELDS: Partial<Record<Component, string>> = { input: "input_cost_per_token", output: "output_cost_per_token", cacheRead: "cache_read_input_token_cost", cacheWrite5m: "cache_creation_input_token_cost", cacheWrite1h: "cache_creation_input_token_cost_above_1hr" };
const METADATA = new Set(["litellm_provider", "mode", "max_tokens", "max_input_tokens", "max_output_tokens", "supports_function_calling", "supports_parallel_function_calling", "supports_vision", "supports_prompt_caching", "supports_system_messages", "supports_tool_choice", "supports_response_schema", "supports_reasoning", "supports_web_search", "supported_openai_params", "deprecation_date", "source", "supported_endpoints", "supported_modalities", "supported_output_modalities", "supports_pdf_input", "supports_native_streaming", "supports_xhigh_reasoning_effort", "supports_none_reasoning_effort", "supports_minimal_reasoning_effort", "supports_max_reasoning_effort", "supports_low_reasoning_effort", "reasoning_effort_levels"]);
/** Convert a lexical JSON per-token decimal into canonical per-million form. */
function sourceRate(raw: unknown): string {
  assert(typeof raw === "string" && /^(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(raw), "Invalid source rate");
  const [mantissa, exponent = "0"] = raw.toLowerCase().split("e");
  const exp = Number(exponent); assert(Number.isSafeInteger(exp) && Math.abs(exp) <= 1000 && mantissa.length <= 1000, "Source rate range");
  const [whole, fractional = ""] = mantissa.split("."); const digits = whole + fractional;
  const scale = fractional.length - exp - 6; let output: string;
  if (scale <= 0) output = digits + "0".repeat(-scale);
  else { const padded = digits.padStart(scale + 1, "0"); output = `${padded.slice(0, -scale)}.${padded.slice(-scale)}`; }
  const [w, f = ""] = output.split("."); const canonical = (w.replace(/^0+(?=\d)/, "") || "0") + (f.replace(/0+$/, "") ? `.${f.replace(/0+$/, "")}` : ""); rateUnits(canonical); return canonical;
}
export type ImportPricingOptions = { asOf: string; source: PricingSource; aliases?: PricingAlias[] };
/** Offline candidate only: caller retains supplied bytes and separately reviews acceptance. */
export function importLiteLLMPricing(bytes: string, options: ImportPricingOptions): PricingArtifact {
  assert(sha256(bytes) === options.source.sha256, "Source byte hash mismatch");
  assert(/^[a-f0-9]{40}$/.test(options.source.revision), "Source revision must be immutable commit");
  const raw = parseJsonStrict(bytes, { numbersAsStrings: true }); obj(raw);
  const typed = parseJsonStrict(bytes); obj(typed);
  const entries: PricingEntry[] = [], exclusions: PricingExclusion[] = [];
  for (const [model, value] of Object.entries(raw)) {
    const exclude = (reason: string, dimensions: string[] = []) => exclusions.push({ identity: model, reason, dimensions });
    if (value === null || typeof value !== "object" || Array.isArray(value)) { exclude("malformed_entry"); continue; }
    const e = value as Record<string, unknown>; const provider = e.litellm_provider;
    const typedEntry = typed[model]; obj(typedEntry);
    const rateFields = Object.values(SOURCE_FIELDS) as string[];
    if (rateFields.some(f => f in e && typeof typedEntry[f] !== "number")) { exclude("invalid_rate_type"); continue; }
    if (provider !== "openai" && provider !== "anthropic") { exclude("unsupported_provider"); continue; }
    if (model.includes("/") || model.includes(":")) { exclude("non_direct_identity"); continue; }
    if (e.mode !== "chat" && e.mode !== "responses") { exclude(e.mode === undefined ? "missing_mode_requires_overlay" : "unsupported_mode"); continue; }
    if (e.input_cost_per_token === undefined || e.output_cost_per_token === undefined) { exclude("missing_base_rates"); continue; }
    const unknown = Object.keys(e).filter(f => !METADATA.has(f) && !Object.values(SOURCE_FIELDS).includes(f));
    if (unknown.length) { exclude("unsupported_dimensions", unknown.sort()); continue; }
    // Generic OpenAI cache writes cannot be inferred from TTL-specific source fields.
    if (provider === "openai" && (e.cache_creation_input_token_cost !== undefined || e.cache_creation_input_token_cost_above_1hr !== undefined)) { exclude("ambiguous_cache_write_scope", ["cache_creation_input_token_cost", "cache_creation_input_token_cost_above_1hr"].filter(f => e[f] !== undefined)); continue; }
    try {
      const rates = {} as Record<Component, Rate>;
      for (const c of PRICING_COMPONENTS) {
        const notApplicable = provider === "anthropic" ? c === "cacheWrite" : c === "cacheWrite5m" || c === "cacheWrite1h";
        const field = SOURCE_FIELDS[c];
        rates[c] = notApplicable ? { state: "not_applicable", reason: `${provider}_billing_scope` } : field && e[field] !== undefined ? { state: "priced", value: sourceRate(e[field]), evidence: `${options.source.id}:${model}:${field}` } : { state: "missing", reason: "source_field_absent" };
      }
      entries.push({ provider, model, mode: e.mode, scope: "direct-api-text-tokens", rates, effective: { state: "unknown" }, assumptions: [] });
    } catch (error) { exclude("invalid_rate", [error instanceof Error ? error.message : "Invalid rate"]); }
  }
  return createPricingArtifact({ schemaVersion: 1, importerVersion: "litellm-local-v1", asOf: options.asOf, sources: [options.source], entries, aliases: options.aliases ?? [], exclusions, overlays: [] });
}
