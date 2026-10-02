import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const functionsRoot = resolve(repositoryRoot, "supabase/functions");
const sharedRoot = resolve(functionsRoot, "_shared");
const targets = ["product-admin-api", "product-admin-ai"];

const IMPORT_PATTERN = /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

function isInside(path, root) {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== "..");
}

function localImports(source) {
  return [...source.matchAll(IMPORT_PATTERN)]
    .map((match) => match[1] ?? match[2])
    .filter((specifier) => specifier.startsWith("."));
}

function resolveModule(importer, specifier) {
  const candidate = resolve(dirname(importer), specifier);
  const alternatives = [candidate, `${candidate}.ts`, resolve(candidate, "index.ts")];
  const found = alternatives.find((path) => existsSync(path));
  assert.ok(found, `Import locale non risolto: ${relative(repositoryRoot, importer)} -> ${specifier}`);
  return found;
}

export function auditFunctionGraph(functionName) {
  const functionRoot = resolve(functionsRoot, functionName);
  const entrypoint = resolve(functionRoot, "index.ts");
  assert.ok(existsSync(entrypoint), `Entrypoint assente: ${functionName}/index.ts`);

  const pending = [entrypoint];
  const visited = new Set();
  const edges = [];

  while (pending.length > 0) {
    const importer = pending.pop();
    if (visited.has(importer)) continue;
    visited.add(importer);

    const source = readFileSync(importer, "utf8");
    for (const specifier of localImports(source)) {
      const imported = resolveModule(importer, specifier);
      const allowed = isInside(imported, functionRoot) || isInside(imported, sharedRoot);
      assert.ok(
        allowed,
        `Import sibling vietato: ${relative(repositoryRoot, importer)} -> ${relative(repositoryRoot, imported)}`,
      );
      edges.push([importer, imported]);
      pending.push(imported);
    }
  }

  return {
    functionName,
    modules: [...visited].map((path) => relative(repositoryRoot, path)).sort(),
    edges: edges.map(([from, to]) => [relative(repositoryRoot, from), relative(repositoryRoot, to)]),
  };
}

export function auditAllFunctionGraphs() {
  return targets.map(auditFunctionGraph);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const graph of auditAllFunctionGraphs()) {
    console.log(`PASS ${graph.functionName}: ${graph.modules.length} moduli locali risolvibili; zero import sibling.`);
  }
}
