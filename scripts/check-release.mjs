import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const c=JSON.parse(readFileSync(new URL("../contracts/operation-index.json",import.meta.url),"utf8"));
assert.equal(c.schemaVersion,1);
assert.match(c.contractVersion,/^\d+\.\d+\.\d+$/);
assert.match(c.openApiGitBlobSHA,/^[a-f0-9]{40}$/);
assert.ok(c.operations.length>=40);
const seen=new Set();
for(const o of c.operations){
  assert.match(o.operationId,/^[a-zA-Z][a-zA-Z0-9]*$/);
  assert.ok(["GET","POST","PUT","PATCH","DELETE"].includes(o.method));
  assert.ok(o.path.startsWith("/"));
  assert.ok(Array.isArray(o.auth) && !o.auth.includes("OperatorToken"));
  assert.ok(!o.path.startsWith("/v1/admin/")&&!o.path.includes("/billing/callback/"));
  const key=o.method+" "+o.path+" "+o.operationId;
  assert.ok(!seen.has(key),"duplicate operation "+key);
  seen.add(key);
}
const js=readFileSync(new URL("../javascript/index.js",import.meta.url),"utf8");
for(const method of ["convertDate","addBusinessDays","schedulePreview","usage"])assert.ok(js.includes(method));
console.log("Public SDK registry and safe API surface verified: "+c.contractVersion+", "+c.operations.length+" operations");
