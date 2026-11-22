import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
test("T0 agent admission: local pre-push and no CI failure mail on Draft",()=>{
 const pkg=JSON.parse(file("package.json"));
 assert.equal(pkg.scripts.prepare,"node scripts/t0-install-hook.mjs");
 assert.equal(pkg.scripts["t0:preflight"],"npm test");
 assert.match(file(".githooks/pre-push"),/npm run t0:preflight/);
 assert.match(file("scripts/t0-install-hook.mjs"),/core\.hooksPath/);
 const wf=file(".github/workflows/verify.yml");
 assert.match(wf,/types: \[opened, synchronize, reopened, ready_for_review\]/);
 assert.ok(wf.includes("github.event_name == 'push' && github.ref == 'refs/heads/main' && github.actor == '007dude' && startsWith(github.event.head_commit.message, 'T0_CERTIFY_PUBLIC_SDK_20261122')"),"Only exact certified main source push may allocate minutes");
 assert.ok(wf.includes("github.head_ref == 'feat/finance-global-sdk-widgets-20261122'"),"Only one owner-approved finance PR can run source tests");
 assert.ok(wf.includes("github.event.pull_request.draft == false"),"Draft PR must not allocate minutes");
 assert.equal((wf.match(/github\.head_ref ==/g)||[]).length,1,"Only one finance branch is preadmitted");
 assert.doesNotMatch(wf,/^  schedule:/m,"CI must not poll");
});
