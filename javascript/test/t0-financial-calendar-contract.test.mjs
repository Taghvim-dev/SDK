import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const shared=readFileSync(new URL("../finance.d.ts",import.meta.url),"utf8");
const primary=readFileSync(new URL("../index.d.ts",import.meta.url),"utf8");
test("Both portable Finance SDK entrypoints share one canonical worldwide holiday response",()=>{
 assert.match(shared,/export type FinanceHolidaysResult=/);
 assert.match(shared,/status:"available_preview"\|"source_unavailable"\|"candidate_preview"/);
 assert.match(shared,/candidate_count\?:number;/);
 assert.match(shared,/candidate_events\?:Array/);
 assert.match(shared,/financial_decision_allowed:false;/);
 assert.match(shared,/holidays:.*Promise<ApiResponse<FinanceHolidaysResult>>;/);
 assert.match(primary,/import type \{FinanceHolidaysResult\} from "\.\/finance\.js";/);
 assert.match(primary,/financeHolidays\(.*Promise<ApiResponse<FinanceHolidaysResult>>;/);
 assert.doesNotMatch(primary,/financeHolidays\(.*status:"available_preview"/);
});
