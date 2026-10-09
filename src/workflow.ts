import { canonicalJson, readMethodDocument, sha256 } from "./documents.js";
import { createPricingArtifact, diffPricing, rateUnits, type PricingArtifact, type PricingChange, type Component, type Identity } from "./pricing.js";

export type ComparisonEvidence = Identity & {
  component: Component;
  left: { source: string; revision: string; value: string };
  right: { source: string; revision: string; value: string };
  unit: "USD-per-million-tokens";
  comparable: boolean;
  reason: string;
  resolution: "unresolved" | "keep-left" | "keep-right" | "incomparable";
};

export type PricingProposal = {
  schemaVersion: 1;
  status: "proposed";
  parameterRevision: string;
  previousRevision: string | null;
  methodDocumentHash: string;
  changes: PricingChange[];
  comparisons: ComparisonEvidence[];
};

function record(raw: unknown, fields: string[]): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid proposal object");
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).some(k => !fields.includes(k)) || fields.some(k => !Object.hasOwn(value, k))) throw new Error("Invalid proposal fields");
  return value;
}
const nonempty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const hash = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

function validateComparisons(raw: unknown): asserts raw is ComparisonEvidence[] {
  if (!Array.isArray(raw)) throw new Error("Comparisons must be an array");
  for (const item of raw) {
    const c = record(item, ["provider", "model", "component", "left", "right", "unit", "comparable", "reason", "resolution"]);
    if (!nonempty(c.reason) || !nonempty(c.model) || !["openai", "anthropic"].includes(c.provider as string)
      || !["input", "output", "cacheRead", "cacheWrite", "cacheWrite5m", "cacheWrite1h"].includes(c.component as string)
      || c.unit !== "USD-per-million-tokens" || typeof c.comparable !== "boolean"
      || !["unresolved", "keep-left", "keep-right", "incomparable"].includes(c.resolution as string)
      || (!c.comparable && c.resolution !== "incomparable")
      || (c.comparable && c.resolution === "incomparable")) throw new Error("Invalid comparison scope or resolution");
    for (const value of [c.left, c.right]) {
      const side = record(value, ["source", "revision", "value"]);
      if (!nonempty(side.source) || !nonempty(side.revision) || !nonempty(side.value)) throw new Error("Comparison requires source revisions and values");
      rateUnits(side.value);
    }
  }
}

export function validatePricingProposal(raw: unknown): asserts raw is PricingProposal {
  const p = record(raw, ["schemaVersion", "status", "parameterRevision", "previousRevision", "methodDocumentHash", "changes", "comparisons"]);
  if (p.schemaVersion !== 1 || p.status !== "proposed" || !hash(p.parameterRevision)
    || !hash(p.methodDocumentHash) || (p.previousRevision !== null && !hash(p.previousRevision))
    || !Array.isArray(p.changes)) throw new Error("Invalid proposal schema or hash");
  for (const rawChange of p.changes) {
    if (!rawChange || typeof rawChange !== "object" || Array.isArray(rawChange)) throw new Error("Invalid proposal change");
    const c = record(rawChange, Object.hasOwn(rawChange, "identity") ? ["kind", "identity"] : ["kind"]);
    if (!["added", "removed", "rates", "zero_transition", "coverage", "aliases", "evidence", "assumptions", "sources", "overlays"].includes(c.kind as string)
      || (Object.hasOwn(c, "identity") && !nonempty(c.identity))) throw new Error("Invalid proposal change");
  }
  validateComparisons(p.comparisons);
}

export function proposePricing(artifact: PricingArtifact, methodDocument: string, previous?: PricingArtifact, comparisons: ComparisonEvidence[] = []): PricingProposal {
  const method = readMethodDocument(methodDocument);
  if (method.metadata.kind !== "pricing") throw new Error("Pricing proposal requires pricing methodology");
  if (createPricingArtifact(artifact.parameters).parameterRevision !== artifact.parameterRevision
    || (previous && createPricingArtifact(previous.parameters).parameterRevision !== previous.parameterRevision)) {
    throw new Error("Proposal artifact hash mismatch");
  }
  validateComparisons(comparisons);
  const changes = previous ? diffPricing(previous, artifact) : artifact.parameters.entries.map(e => ({ kind: "added" as const, identity: `${e.provider}\0${e.model}` }));
  return { schemaVersion: 1, status: "proposed", parameterRevision: artifact.parameterRevision, previousRevision: previous?.parameterRevision ?? null, methodDocumentHash: sha256(methodDocument), changes, comparisons: structuredClone(comparisons) };
}

// Acceptance records bind reviewed bytes; creating a proposal never accepts it.
export function recordPricingAcceptance(proposal: PricingProposal, review: { proposalHash: string; acceptedAt: string; reference: string }) {
  validatePricingProposal(proposal);
  if (proposal.status !== "proposed" || review.proposalHash !== sha256(canonicalJson(proposal))) throw new Error("Review must name exact proposal hash");
  if (!review.reference.trim() || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(review.acceptedAt)
    || new Date(review.acceptedAt).toISOString() !== review.acceptedAt) throw new Error("Acceptance requires review reference and explicit UTC time");
  if (proposal.comparisons.some(c => c.resolution === "unresolved")) throw new Error("Unresolved source discrepancies require review");
  return { schemaVersion: 1 as const, parameterRevision: proposal.parameterRevision, methodDocumentHash: proposal.methodDocumentHash, proposalHash: review.proposalHash, acceptedAt: review.acceptedAt, reviewReference: review.reference };
}

const cell = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/([\\`*_{}\[\]()#+.!|>~\-])/g, "\\$1").replace(/\r?\n/g, " ").replace(/\0/g, " / ");
export function renderPricingMethodology(artifact: PricingArtifact, methodDocument: string, proposal: PricingProposal): string {
  validatePricingProposal(proposal);
  if (createPricingArtifact(artifact.parameters).parameterRevision !== artifact.parameterRevision) throw new Error("Artifact hash mismatch");
  if (proposal.parameterRevision !== artifact.parameterRevision || proposal.methodDocumentHash !== sha256(methodDocument)) throw new Error("Methodology must match proposal");
  const { metadata, body } = readMethodDocument(methodDocument);
  const counts = new Map<string, number>();
  for (const e of artifact.parameters.exclusions) counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1);
  return `# ${cell(metadata.title)}\n\nStatus: proposed, awaiting review.\n\nParameter revision: \`${artifact.parameterRevision}\`. Catalog as-of: ${artifact.parameters.asOf}; this is not a historical effective date.\n\n${body.trim()}\n\n## Assumptions\n\n${metadata.assumptions.map(a => `- ${cell(a)}`).join("\n")}\n\n## Exclusions\n\n${metadata.exclusions.map(a => `- ${cell(a)}`).join("\n")}\n\n## Candidate coverage\n\n${artifact.parameters.entries.length} exact entries; ${artifact.parameters.aliases.length} explicit aliases; ${artifact.parameters.exclusions.length} excluded source entries.\n\n| Exclusion reason | Count |\n| --- | ---: |\n${[...counts].sort(([a], [b]) => a < b ? -1 : 1).map(([reason, count]) => `| ${cell(reason)} | ${count} |`).join("\n")}\n\n## Source evidence\n\n${artifact.parameters.sources.map(s => `- ${cell(s.id)} at ${cell(s.revision)}; SHA-256 \`${s.sha256}\`; license ${cell(s.license)}; notice: ${cell(s.notice)}.`).join("\n")}\n\n## Review changes\n\n${proposal.changes.length ? proposal.changes.map(c => `- ${c.kind}${c.identity ? `: ${cell(c.identity)}` : ""}`).join("\n") : "No changes from the comparison artifact."}\n\n${proposal.comparisons.length} retained source comparisons. Full values, exclusions and reasons are in the adjacent JSON proposal and artifact.\n`;
}
