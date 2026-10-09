import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const excluded = new Set([".git", "node_modules", "dist", "coverage"]);
const documents = [];
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !excluded.has(entry.name)) visit(path);
    else if (entry.isFile() && entry.name.endsWith(".md")) documents.push(path);
  }
}
visit(root);
let links = 0;
for (const document of documents) {
  for (const match of readFileSync(document, "utf8").matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, "");
    if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith("#")) continue;
    const path = resolve(dirname(document), decodeURIComponent(target.split("#")[0]));
    assert.ok(existsSync(path), `${relative(root, document)} links to missing ${target}`);
    links++;
  }
}
console.log(`${links} local links resolve across ${documents.length} Markdown documents`);
