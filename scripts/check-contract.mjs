import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const index=JSON.parse(readFileSync(new URL("../contracts/operation-index.json",import.meta.url)));
assert.equal(index.schemaVersion,1);
assert.equal(index.contractVersion,"2.1.0");
assert.match(index.openApiGitBlobSHA,/^[0-9a-f]{40}$/);
assert.equal(index.operations.length,46);
const seen=new Set();
for(const o of index.operations){
 assert.ok(o.operationId&&o.method&&o.path);
 assert.ok(!o.path.startsWith("/v1/admin/"));
 assert.ok(!o.path.startsWith("/v1/billing/callback/"));
 assert.ok(!(o.auth||[]).includes("OperatorToken"));
 const id=o.method+" "+o.path;
 assert.ok(!seen.has(id), "duplicate "+id);
 seen.add(id);
}
console.log("SDK contract registry aligned:",index.contractVersion,index.operations.length,index.openApiGitBlobSHA);
