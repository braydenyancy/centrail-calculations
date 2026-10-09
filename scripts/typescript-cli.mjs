import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const manifestPath = require.resolve("typescript/package.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
// Resolve the declared JavaScript entry point rather than an npm .cmd shim.
export const typescriptCli = resolve(dirname(manifestPath), manifest.bin.tsc);
