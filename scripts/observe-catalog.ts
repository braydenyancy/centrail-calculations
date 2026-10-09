import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { observeCatalog, type CatalogKind } from "../src/catalog-observations.js";
import { canonicalJson, parseJsonStrict } from "../src/documents.js";
import type { PricingSource } from "../src/pricing.js";

async function main() {
  const [kind, sourceFile, manifestFile, noticeFile, out, ...extra] = process.argv.slice(2);
  if (!out || extra.length) throw new Error("Usage: observe-catalog <models-dev|openrouter> <source.json> <manifest.json> <NOTICE> <new-output-dir>");
  const read = async (file: string) => new TextDecoder("utf-8", { fatal: true }).decode(await readFile(file));
  const bytes = await read(sourceFile);
  const source = parseJsonStrict(await read(manifestFile)) as PricingSource;
  source.retainedAt = "source.json";
  source.notice = "NOTICE.txt";
  const notice = await read(noticeFile);
  if (!notice.trim()) throw new Error("Source notice must not be empty");
  const observations = observeCatalog(kind as CatalogKind, bytes, source);
  await mkdir(out);
  for (const [name, content] of Object.entries({ "source.json": bytes, "manifest.json": canonicalJson(source), "NOTICE.txt": notice, "observations.json": canonicalJson(observations) })) {
    await writeFile(join(out, name), content, { flag: "wx" });
  }
  console.log(`Retained ${observations.observations.length} review-only observations; no prices accepted.`);
}
main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
