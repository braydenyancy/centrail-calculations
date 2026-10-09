import { createHash } from "node:crypto";

// The initial parameter-file grammar is the JSON subset of YAML 1.2. Reject
// duplicate keys before materializing objects and preserve decimal source text.
export function parseJsonStrict(text: string, options: { numbersAsStrings?: boolean } = {}): unknown {
  let i = 0;
  const fail = (): never => { throw new Error(`Invalid or ambiguous JSON at offset ${i}`); };
  const space = () => { while (/[\t\n\r ]/.test(text[i] ?? "x")) i++; };
  const string = (): string => {
    const start = i++;
    while (i < text.length) {
      const c = text[i++];
      if (c === '"') return JSON.parse(text.slice(start, i)) as string;
      if (c === "\\") i++;
    }
    return fail();
  };
  const value = (depth: number): unknown => {
    if (depth > 100) throw new Error("JSON nesting exceeds 100 levels");
    space();
    const c = text[i];
    if (c === '"') return string();
    if (c === "{") {
      i++; space();
      const result: Record<string, unknown> = Object.create(null);
      if (text[i] === "}") { i++; return result; }
      while (i < text.length) {
        space();
        if (text[i] !== '"') return fail();
        const key = string();
        if (Object.hasOwn(result, key)) throw new Error(`Duplicate JSON key: ${key}`);
        space(); if (text[i++] !== ":") return fail();
        result[key] = value(depth + 1);
        space();
        const end = text[i++];
        if (end === "}") return result;
        if (end !== ",") return fail();
      }
      return fail();
    }
    if (c === "[") {
      i++; space();
      const result: unknown[] = [];
      if (text[i] === "]") { i++; return result; }
      while (i < text.length) {
        result.push(value(depth + 1)); space();
        const end = text[i++];
        if (end === "]") return result;
        if (end !== ",") return fail();
      }
      return fail();
    }
    for (const [literal, parsed] of [["true", true], ["false", false], ["null", null]] as const) {
      if (text.startsWith(literal, i)) { i += literal.length; return parsed; }
    }
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i));
    if (!match) return fail();
    i += match[0].length;
    if (options.numbersAsStrings) return match[0];
    const n = Number(match[0]);
    if (!Number.isFinite(n)) throw new Error("Nonfinite JSON number");
    return n;
  };
  const result = value(0); space();
  if (i !== text.length) return fail();
  return result;
}

export function canonicalJson(value: unknown): string {
  const encode = (v: unknown): string => {
    if (v === null || typeof v === "string" || typeof v === "boolean") return JSON.stringify(v);
    if (typeof v === "number") {
      if (!Number.isFinite(v)) throw new Error("Cannot serialize nonfinite number");
      return JSON.stringify(v);
    }
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) if (!Object.hasOwn(v, i)) throw new Error("Canonical arrays cannot have holes");
      return `[${v.map(encode).join(",")}]`;
    }
    if (typeof v === "object" && v !== null) {
      if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) {
        throw new Error("Canonical objects must be plain data");
      }
      const obj = v as Record<string, unknown>;
      return `{${Object.keys(obj).sort().map(k => `${JSON.stringify(k)}:${encode(obj[k])}`).join(",")}}`;
    }
    throw new Error("Canonical values must be JSON data");
  };
  return encode(value) + "\n";
}

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export type MethodMetadata = {
  schemaVersion: 1;
  id: string;
  revision: string;
  title: string;
  kind: "pricing" | "energy";
  inputUnit: string;
  outputUnit: string;
  assumptions: string[];
  exclusions: string[];
};

export function readMethodDocument(text: string): { metadata: MethodMetadata; body: string } {
  const openingLength = text.startsWith("---\r\n") ? 5 : text.startsWith("---\n") ? 4 : 0;
  if (!openingLength) throw new Error("Method requires frontmatter and a Markdown explanation");
  // Two literal scans avoid backtracking on repeated Markdown delimiters.
  const lf = text.indexOf("\n---\n", openingLength);
  const crlf = text.indexOf("\n---\r\n", openingLength);
  const closing = lf < 0 ? crlf : crlf < 0 ? lf : Math.min(lf, crlf);
  if (closing < 0) throw new Error("Method requires frontmatter and a Markdown explanation");
  const bodyStart = closing + (text[closing + 4] === "\r" ? 6 : 5);
  if (bodyStart === text.length) throw new Error("Method requires frontmatter and a Markdown explanation");
  const metadataEnd = text[closing - 1] === "\r" ? closing - 1 : closing;
  const raw = parseJsonStrict(text.slice(openingLength, metadataEnd));
  if (raw === null || Array.isArray(raw) || typeof raw !== "object") throw new Error("Invalid method metadata");
  const m = raw as Record<string, unknown>;
  const keys = ["schemaVersion", "id", "revision", "title", "kind", "inputUnit", "outputUnit", "assumptions", "exclusions"];
  if (Object.keys(m).some(k => !keys.includes(k)) || m.schemaVersion !== 1
    || !["pricing", "energy"].includes(m.kind as string)) throw new Error("Unsupported method metadata");
  for (const k of ["id", "revision", "title", "inputUnit", "outputUnit"]) {
    if (typeof m[k] !== "string" || !(m[k] as string).trim()) throw new Error(`Method requires ${k}`);
  }
  for (const k of ["assumptions", "exclusions"]) {
    if (!Array.isArray(m[k]) || (m[k] as unknown[]).some(s => typeof s !== "string" || !s.trim())) {
      throw new Error(`Method requires ${k} as text list`);
    }
  }
  const body = text.slice(bodyStart);
  if (!body.trim()) throw new Error("Method explanation is empty");
  return { metadata: m as MethodMetadata, body };
}
