import { canonicalJson, parseJsonStrict, sha256 } from "./documents.js";
import type { PricingSource } from "./pricing.js";

export type CatalogKind = "models-dev" | "openrouter";
type ObjectValue = Record<string, unknown>;
function object(value: unknown): value is ObjectValue {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !value.includes("\0");
}

export type CatalogObservation = {
  catalogProvider: string;
  catalogKey: string;
  model: string;
  // Applies only to token-rate fields; request/image/audio fees keep their
  // source-specific dimensions and require review before interpretation.
  tokenRateUnit: "USD-per-token" | "USD-per-million-tokens";
  // Preserve all fields, including thresholds, fees, modes and nulls. These
  // are source observations, not our flat six-component pricing parameters.
  pricing: ObjectValue | null;
  sourceRecord: ObjectValue;
  reviewReasons: string[];
};

export function observeCatalog(kind: CatalogKind, bytes: string, source: PricingSource) {
  if (kind !== "models-dev" && kind !== "openrouter") throw new Error("Unsupported catalog kind");
  const sourceFields = ["id", "revision", "sha256", "retainedAt", "license", "notice"];
  if (!object(source) || Object.keys(source).length !== sourceFields.length || !sourceFields.every((key) => Object.hasOwn(source, key))
    || ![source.id, source.revision, source.sha256, source.retainedAt, source.license, source.notice].every(text)
    || !/^[a-f0-9]{64}$/.test(source.sha256) || sha256(bytes) !== source.sha256) {
    throw new Error("Catalog requires retained source evidence and matching byte hash");
  }
  // HTTP feeds need not have a git revision: their exact retained content hash
  // is an immutable revision. Mutable labels like main/latest are not revisions.
  if (!/^[a-f0-9]{40}$/.test(source.revision) && source.revision !== `sha256:${source.sha256}`) {
    throw new Error("Catalog revision must be a commit or exact content hash");
  }
  const raw = parseJsonStrict(bytes, { numbersAsStrings: true });
  if (!object(raw)) throw new Error("Catalog must be an object");
  const observations: CatalogObservation[] = [];
  const seen = new Set<string>();
  const add = (catalogProvider: string, catalogKey: string, row: ObjectValue, price: unknown) => {
    const key = canonicalJson([catalogProvider, catalogKey]);
    if (seen.has(key)) throw new Error("Duplicate catalog identity");
    seen.add(key);
    if (!text(catalogProvider) || !text(catalogKey)) throw new Error("Catalog identity is missing");
    const pricing = object(price) ? price : null;
    observations.push({
      catalogProvider, catalogKey, model: text(row.id) ? row.id : catalogKey,
      tokenRateUnit: kind === "models-dev" ? "USD-per-million-tokens" : "USD-per-token",
      pricing, sourceRecord: row,
      reviewReasons: [
        "identity_and_tariff_scope_require_review",
        "non_token_pricing_fields_retain_source_specific_units",
        ...(kind === "openrouter" ? ["router_listing_does_not_identify_serving_endpoint"] : []),
        ...(pricing === null ? ["pricing_missing_or_unrecognized"] : []),
      ],
    });
  };
  if (kind === "models-dev") {
    for (const [provider, value] of Object.entries(raw)) {
      if (!object(value) || !object(value.models)) throw new Error("Provider models must be an object");
      for (const [key, row] of Object.entries(value.models)) {
        if (!object(row)) throw new Error("Model must be an object");
        add(provider, key, row, row.cost);
      }
    }
  } else {
    if (!Array.isArray(raw.data)) throw new Error("OpenRouter data must be an array");
    for (const row of raw.data) {
      if (!object(row) || !text(row.id)) throw new Error("OpenRouter model identity is missing");
      add("openrouter", row.id, row, row.pricing);
    }
  }
  observations.sort((a, b) => {
    const left = canonicalJson([a.catalogProvider, a.catalogKey]);
    const right = canonicalJson([b.catalogProvider, b.catalogKey]);
    return left < right ? -1 : left > right ? 1 : 0;
  });
  const payload = { schemaVersion: 1, status: "review-only", kind, source, observations } as const;
  return { observationRevision: sha256(canonicalJson(payload)), ...payload };
}
