import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), "centrail artifact replay "));
const pricing = join(root, "calculations", "pricing", "proposal-2026-10-08");
const energy = join(root, "calculations", "energy");
const invoke = (args) => execFileSync(process.execPath, ["--import", "tsx", "scripts/calculations.ts", ...args], {
  cwd: root,
  encoding: "utf8",
});

try {
  const pricingArgs = [
    "propose-pricing", "--source", join(pricing, "source.json"),
    "--manifest", join(pricing, "source-manifest.json"),
    "--notice", join(pricing, "SOURCE-LICENSE.txt"),
    "--method", join(root, "calculations", "pricing", "METHOD.md"),
    "--out", join(temporary, "pricing"),
  ];
  invoke(pricingArgs);
  invoke([
    "compile-energy", "--parameters", join(energy, "parameters.v1.yaml"),
    "--method", join(energy, "METHOD.md"), "--out", join(temporary, "energy"),
  ]);
  const compared = [];
  for (const [kind, retained] of [["pricing", pricing], ["energy", join(energy, "proposal-2026-10-08")]]) {
    const names = readdirSync(retained).sort();
    assert.deepEqual(readdirSync(join(temporary, kind)).sort(), names);
    for (const name of names) {
      assert.deepEqual(readFileSync(join(temporary, kind, name)), readFileSync(join(retained, name)), `${kind}/${name}`);
      compared.push(`${kind}/${name}`);
    }
  }
  const overwrite = spawnSync(process.execPath, ["--import", "tsx", "scripts/calculations.ts", ...pricingArgs], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(overwrite.error, undefined);
  assert.equal(overwrite.status, 1);
  assert.match(overwrite.stderr, /EEXIST/);
  for (const name of readdirSync(pricing)) {
    assert.deepEqual(readFileSync(join(temporary, "pricing", name)), readFileSync(join(pricing, name)));
  }
  console.log(JSON.stringify({ retainedFilesReproduced: compared, count: compared.length, overwriteRefused: true }, null, 2));
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
