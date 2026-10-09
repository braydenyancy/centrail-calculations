import { canonicalJson, readMethodDocument, type MethodMetadata } from "@centrail/calculations/documents";
import { compileEnergyArtifact, replayEnergy, type EnergyTokens, type EnergyRange } from "@centrail/calculations/energy";
import { loadPricingArtifact, replayPricing, type PricingEvent, type PricingReplay } from "@centrail/calculations/pricing";
import { proposePricing, recordPricingAcceptance, type PricingProposal } from "@centrail/calculations/workflow";
import { observeCatalog, type CatalogKind } from "@centrail/calculations/catalog-observations";

// Compile this consumer against packed declarations with no ambient Node types.
export function typedConsumer(bytes: string, method: string, events: PricingEvent[]) {
  const metadata: MethodMetadata = readMethodDocument(method).metadata;
  const pricing = loadPricingArtifact(bytes);
  const replay: PricingReplay = replayPricing(pricing, "token-buckets-v3", events);
  const proposal: PricingProposal = proposePricing(pricing, method);
  const tokens: EnergyTokens = { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 };
  const range: EnergyRange = replayEnergy(compileEnergyArtifact(bytes), tokens);
  const kind: CatalogKind = "models-dev";
  return { metadata, replay, range, proposal: canonicalJson(proposal), kind, recordPricingAcceptance, observeCatalog };
}
