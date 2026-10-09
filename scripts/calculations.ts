import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, parseJsonStrict, readMethodDocument, sha256 } from "../src/documents.js";
import { compileEnergyArtifact } from "../src/energy.js";
import { importLiteLLMPricing, loadPricingArtifact, replayPricing, type ImportPricingOptions, type PricingEvent, type PricingMethod } from "../src/pricing.js";
import { proposePricing, renderPricingMethodology, type ComparisonEvidence } from "../src/workflow.js";

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!args[i].startsWith("--") || !args[i + 1] || args[i + 1].startsWith("--") || flags[args[i]]) throw new Error("Expected unique --name value pairs");
    flags[args[i]] = args[i + 1];
  }
  const allowed: Record<string, string[]> = {
    "propose-pricing": ["--source", "--manifest", "--notice", "--method", "--previous", "--comparisons", "--out"],
    "compile-energy": ["--parameters", "--method", "--out"],
    "replay-pricing": ["--artifact", "--method-id", "--events"],
  };
  if (!allowed[command] || Object.keys(flags).some(f => !allowed[command].includes(f))) throw new Error("Commands: propose-pricing, compile-energy, replay-pricing; see calculations/README.md");
  const required = (name: string) => { if (!flags[name]) throw new Error(`Required ${name}`); return flags[name]; };
  const read = async (name: string) => new TextDecoder("utf-8", { fatal: true }).decode(await readFile(required(name)));
  if (command === "replay-pricing") {
    const artifact = loadPricingArtifact(await read("--artifact"));
    const events = parseJsonStrict(await read("--events"));
    if (!Array.isArray(events)) throw new Error("Events must be an array");
    console.log(canonicalJson(replayPricing(artifact, required("--method-id") as PricingMethod, events as PricingEvent[])).trim());
    return;
  }
  const out = path.resolve(required("--out"));
  const methodDocument = await read("--method");
  const method = readMethodDocument(methodDocument);
  let files: Record<string, string>;
  if (command === "propose-pricing") {
    const source = await read("--source");
    const manifest = parseJsonStrict(await read("--manifest")) as ImportPricingOptions;
    const notice = await read("--notice");
    if (!notice.trim()) throw new Error("Source license notice must not be empty");
    manifest.source.retainedAt = "source.json";
    manifest.source.notice = "SOURCE-LICENSE.txt";
    const artifact = importLiteLLMPricing(source, manifest);
    const previous = flags["--previous"] ? loadPricingArtifact(await read("--previous")) : undefined;
    const comparisons = flags["--comparisons"] ? parseJsonStrict(await read("--comparisons")) as ComparisonEvidence[] : [];
    const proposal = proposePricing(artifact, methodDocument, previous, comparisons);
    files = { "source.json": source, "source-manifest.json": canonicalJson(manifest), "SOURCE-LICENSE.txt": notice, "artifact.json": canonicalJson(artifact), "proposal.json": canonicalJson(proposal), "METHOD.md": methodDocument, "methodology.md": renderPricingMethodology(artifact, methodDocument, proposal) };
  } else {
    if (method.metadata.kind !== "energy") throw new Error("Energy compilation requires energy methodology");
    const artifact = compileEnergyArtifact(await read("--parameters"));
    if (method.metadata.id !== artifact.parameters.methodId || method.metadata.revision !== artifact.parameters.methodRevision) throw new Error("Energy methodology revision mismatch");
    files = { "artifact.json": canonicalJson(artifact), "METHOD.md": methodDocument, "manifest.json": canonicalJson({ status: "proposed", parameterRevision: artifact.parameterRevision, methodDocumentHash: sha256(methodDocument) }) };
  }
  // A new directory prevents an update from overwriting retained evidence.
  await mkdir(out, { recursive: false });
  for (const [name, bytes] of Object.entries(files)) await writeFile(path.join(out, name), bytes, { flag: "wx" });
  console.log(`Wrote ${Object.keys(files).length} proposal files to ${out}; no acceptance or runtime change.`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
