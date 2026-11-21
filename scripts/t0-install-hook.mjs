/** T0 local-only, repo-owned pre-push hook. Never alters another consumer's Git. */
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
const root=resolve(fileURLToPath(new URL("../",import.meta.url)));
if(process.env.CI==="true"||process.env.GITHUB_ACTIONS==="true")process.exit(0);
let gitRoot="";
try{gitRoot=execFileSync("git",["rev-parse","--show-toplevel"],{
 cwd:root,encoding:"utf8",timeout:5000,stdio:["ignore","pipe","ignore"]
}).trim();}catch{process.exit(0)}
if(resolve(gitRoot)!==root)process.exit(0);
execFileSync("git",["config","--local","core.hooksPath",".githooks"],{
 cwd:root,stdio:"inherit",timeout:5000
});
console.log("T0_LOCAL_PRE_PUSH_ADMITTED "+root);
