import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const index=JSON.parse(readFileSync(new URL("../contracts/operation-index.json",import.meta.url)));
assert.equal(index.schemaVersion,1);
assert.equal(index.contractVersion,"2.1.0");
assert.match(index.openApiGitBlobSHA,/^[0-9a-f]{40}$/);
assert.ok(index.operations.length>=47,"Canonical public operation contract shrank");
for(const [method,path] of [
 ["POST","/v1/workspaces"],["GET","/v1/workspaces/{workspace_id}"],
 ["POST","/v1/calendars/{calendar_id}/events"],["PATCH","/v1/calendars/{calendar_id}/events/{event_id}"],
 ["GET","/v1/calendars/{calendar_id}/events"],["GET","/v1/public/calendars/{calendar_id}/events"],
 ["POST","/v1/public/calendars/{calendar_id}/subscriptions"],["PATCH","/v1/calendars/{calendar_id}/notification-preferences"],
 ["GET","/v1/workspaces/current"],["POST","/v1/calendars"],
 ["PATCH","/v1/calendars/{calendar_id}"],["POST","/v1/calendars/{calendar_id}/publish"],
 ["POST","/v1/calendars/{calendar_id}/unpublish"],
 ["GET","/v1/public/calendars/{calendar_id}"],
 ["GET","/v1/public/calendars/{calendar_id}/ics"],
 ["GET","/v1/public/calendar-search"]
]) assert.ok(index.operations.some(x=>x.method===method&&x.path===path),
  "Missing canonical operation "+method+" "+path);
assert.equal(index.operations.filter(x=>x.method==="POST" && x.path==="/v1/dates/reconcile" &&
  x.operationId==="reconcileDates" && x.auth.includes("ApiKey")).length,1,
  "native reconciler must be in the exact public API registry");
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
