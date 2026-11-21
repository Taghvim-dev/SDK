import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
const ZERO='0'.repeat(40);
const git=(dir,...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
function init(t){
 const dir=mkdtempSync(join(tmpdir(),'taghvim-t0-src-'));
 const bin=mkdtempSync(join(tmpdir(),'taghvim-t0-bin-'));
 t.after(()=>{rmSync(dir,{recursive:true,force:true});rmSync(bin,{recursive:true,force:true});});
 git(dir,'init','-q','-b','main');git(dir,'config','user.name','T0');git(dir,'config','user.email','test@example.invalid');
 writeFileSync(join(dir,'data'),'ok');git(dir,'add','.');git(dir,'commit','-qm','source');
 const sha=git(dir,'rev-parse','HEAD');
 writeFileSync(join(bin,'npm'),'#!/bin/sh\n[ "$1" = run ] && [ "$2" = t0:preflight ]\n');
 chmodSync(join(bin,'npm'),0o755);
 const env={...process.env,PATH:bin+':'+process.env.PATH};
 const hook=join(process.cwd(),'.githooks','pre-push');
 const run=input=>spawnSync('sh',[hook],{cwd:dir,input,env,encoding:'utf8'});
 return {dir,bin,sha,run};
}
test('tested HEAD can be pushed',t=>{
 const f=init(t);assert.equal(f.run(`refs/heads/main ${f.sha} refs/heads/main ${ZERO}\n`).status,0);
});
test('other SHA or mixed outgoing refs block the entire push',t=>{
 const f=init(t);git(f.dir,'checkout','-qb','other');writeFileSync(join(f.dir,'data'),'updated');git(f.dir,'add','.');git(f.dir,'commit','-qm','other');
 const other=git(f.dir,'rev-parse','HEAD');git(f.dir,'checkout','-q','main');
 assert.notEqual(f.run(`refs/heads/other ${other} refs/heads/other ${ZERO}\n`).status,0);
 assert.notEqual(f.run(`refs/heads/main ${f.sha} refs/heads/main ${ZERO}\nrefs/heads/other ${other} refs/heads/other ${ZERO}\n`).status,0);
});
test('tags, deletes, empty and malformed ref manifests deny before effect',t=>{
 const f=init(t);
 for(const input of [`(delete) ${ZERO} refs/heads/main ${f.sha}\n`,`refs/tags/x ${f.sha} refs/tags/x ${ZERO}\n`,'',`refs/heads/main ${f.sha} refs/heads/main\n`])
  assert.notEqual(f.run(input).status,0);
});
test('preflight cannot change validated checkout',t=>{
 const f=init(t);writeFileSync(join(f.bin,'npm'),'#!/bin/sh\ngit -c user.name=T0 -c user.email=test@example.invalid commit --allow-empty -qm raced\n');
 const result=f.run(`refs/heads/main ${f.sha} refs/heads/main ${ZERO}\n`);
 assert.notEqual(result.status,0);assert.match(result.stderr,/HEAD changed/);
});
