import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { typescriptCli } from "./typescript-cli.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
rmSync(new URL("../dist/", import.meta.url), { recursive: true, force: true });
execFileSync(process.execPath, [typescriptCli, "-p", "tsconfig.build.json"], {
  cwd: root,
  stdio: "inherit",
});
