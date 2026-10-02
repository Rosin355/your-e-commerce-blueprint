import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { auditAllFunctionGraphs } from "../test-edge-function-packaging.mjs";
import * as sharedCommands from "../../supabase/functions/_shared/admin-v2-commands.ts";
import * as sharedPermissions from "../../supabase/functions/_shared/admin-v2-permissions.ts";
import * as apiCommands from "../../supabase/functions/product-admin-api/commands.ts";
import * as apiPermissions from "../../supabase/functions/product-admin-api/permissions.ts";

test("2D.6: ogni Edge Function risolve solo moduli propri, _shared o dipendenze esterne", () => {
  const graphs = auditAllFunctionGraphs();
  assert.deepEqual(graphs.map((graph) => graph.functionName), ["product-admin-api", "product-admin-ai"]);
  assert.ok(graphs.every((graph) => graph.modules.some((module) => module.includes("/_shared/"))));
});

test("2D.6: le facade Admin V2 esportano esattamente le implementazioni shared", () => {
  assert.equal(apiPermissions.canRead, sharedPermissions.canRead);
  assert.equal(apiPermissions.canWrite, sharedPermissions.canWrite);
  assert.equal(apiCommands.executeCommand, sharedCommands.executeCommand);
  assert.equal(apiCommands.reconcileCommandReplay, sharedCommands.reconcileCommandReplay);
});

test("2D.6: admin, tech_admin e canary conservano la matrice autorizzativa", () => {
  assert.equal(sharedPermissions.canRead(["admin"]), true);
  assert.equal(sharedPermissions.canWrite(["admin"]), true);
  assert.equal(sharedPermissions.canWriteCanary(["admin"]), true);
  assert.equal(sharedPermissions.canRead(["tech_admin"]), true);
  assert.equal(sharedPermissions.canWrite(["tech_admin"]), true);
  assert.equal(sharedPermissions.canWriteCanary(["tech_admin"]), true);
  assert.equal(sharedPermissions.canWriteCanary(["editor"]), false);
  assert.equal(sharedPermissions.canWrite(["publisher"]), false);
});

test("2D.6: il contratto auth V2 resta JWT verificato, ruoli DB e AuthError tipizzato", () => {
  const source = readFileSync("supabase/functions/_shared/admin-v2-auth.ts", "utf8");
  const facade = readFileSync("supabase/functions/product-admin-api/auth.ts", "utf8");
  assert.match(source, /auth\.getUser\(\)/);
  assert.match(source, /\.from\("user_roles"\)/);
  assert.match(source, /export class AuthError extends Error/);
  assert.match(source, /"UNAUTHENTICATED" \| "FORBIDDEN"/);
  assert.doesNotMatch(source, /user_metadata|raw_user_meta_data/);
  assert.match(facade, /export \* from "\.\.\/_shared\/admin-v2-auth\.ts"/);
});

test("2D.6: packaging non introduce dipendenze Shopify nei due runtime Admin", () => {
  const sources = [
    "supabase/functions/product-admin-api/index.ts",
    "supabase/functions/product-admin-ai/index.ts",
    "supabase/functions/product-admin-ai/service.ts",
  ].map((path) => readFileSync(path, "utf8")).join("\n");
  assert.doesNotMatch(sources, /shopify-admin|shopifyAdmin|publish_product|publishProduct/);
});
