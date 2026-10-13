import { mkdtempSync,readFileSync,writeFileSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe,expect,it } from "vitest";
const workflow=readFileSync(new URL("../.github/workflows/publish.yml",import.meta.url),"utf8");
// Execute the actual publication workflow's guard, rather than a test-only copy.
const guard=workflow.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n\s*NODE/)[1];
describe("publication workflow release boundary",()=>{
  it.each([
    ["stable tagged release","tag","v0.1.1","0.1.1","0.1.1","@centrail/calculations",true,"latest"],
    ["prerelease","tag","v0.2.0-beta.1","0.2.0-beta.1","0.2.0-beta.1","@centrail/calculations",true,"next"],
    ["main dispatch","branch","main","0.1.1","0.1.1","@centrail/calculations",false],
    ["version-named branch","branch","v0.1.1","0.1.1","0.1.1","@centrail/calculations",false],
    ["different version tag","tag","v0.1.2","0.1.1","0.1.1","@centrail/calculations",false],
    ["unreviewed manifest version","tag","v0.1.1","0.1.1","0.1.0","@centrail/calculations",false],
    ["different package","tag","v0.1.1","0.1.1","0.1.1","other",false],
  ])("%s",(name,type,tag,version,manifest,packageName,allowed,channel)=>{
    const dir=mkdtempSync(join(tmpdir(),"centrail release boundary "));
    try {
      writeFileSync(join(dir,"package.json"),JSON.stringify({name:packageName,version}));
      writeFileSync(join(dir,".release-please-manifest.json"),JSON.stringify({".":manifest}));
      const output=join(dir,"outputs");
      const env={GITHUB_REF_TYPE:type,GITHUB_REF_NAME:tag,GITHUB_OUTPUT:output};
      for(const key of ["SystemRoot","SYSTEMROOT","windir"]) if(process.env[key]) env[key]=process.env[key];
      const result=spawnSync(process.execPath,["--input-type=module","-e",guard],{cwd:dir,env,encoding:"utf8",timeout:10000});
      expect(result.error).toBeUndefined();
      expect(result.status===0).toBe(allowed);
      if(allowed) expect(readFileSync(output,"utf8")).toBe(`dist-tag=${channel}\n`);
    } finally {rmSync(dir,{recursive:true,force:true});}
  });
});
