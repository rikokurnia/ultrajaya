import test from "node:test";
import assert from "node:assert/strict";
import { visibleMetrics, periodRange, inPeriod, exactQuantity, sumMoney, pendingRequests, pendingApprovals, awaitingQc, heldInvoices, duePayables, criticalCount } from "../src/features/dashboard/metrics";
import { ROUTES } from "../src/shared/routes";
import { can } from "../src/lib/auth/permissions";
import { ROLES } from "../src/shared/contracts/auth";
import type { Material, StockBalance, Invoice, PayableBalance } from "../src/shared/contracts/domain";
test("dashboard grants alone expose no business metrics; every queue is authorized", () => {
 assert.equal(visibleMetrics({id:"admin",role:"ADMIN"}).length,0);
 for(const role of ROLES) for(const metric of visibleMetrics({id:"test",role})) {
 const route = ROUTES.find(r => r.path === metric.href); assert.ok(route); assert.ok(can({id:"test",role},route.permission));
 }
 assert.ok(!visibleMetrics({id:"qc",role:"QC"}).some(m=>m.key === "due" || m.key === "held"));
});
test("periods use inclusive Jakarta business dates",()=>{
 const now = new Date("2026-10-28T18:00:00Z"); const range = periodRange("7d",now);
 assert.deepEqual(range,{start:"2026-10-23",end:"2026-10-29"});
 assert.equal(inPeriod("2026-10-22T17:00:00Z",range),true);
 assert.equal(inPeriod("2026-10-29T17:00:00Z",range),false);
 assert.equal(periodRange("90d",now).start,"2026-08-01");
});
test("quantities and monetary sums stay exact",()=>{
 assert.equal(exactQuantity("0.001"),BigInt(1)); assert.equal(exactQuantity("7800"),BigInt(7800000));
 assert.throws(()=>exactQuantity("1.0001")); assert.equal(sumMoney([15600000000,400000000]),16000000000);
 assert.throws(()=>sumMoney([Number.MAX_SAFE_INTEGER,1]));
});
test("connected empty sources calculate zero",()=>{
 assert.equal(pendingRequests([]),0);assert.equal(pendingApprovals([]),0);assert.equal(awaitingQc([]),0);assert.equal(heldInvoices([]),0);assert.equal(duePayables([],[],"2026-10-29"),0);
});
test("critical stock sums warehouses without decimal rounding",()=>{
 const materials = [{id:"m",active:true,minimum:"1.001"}] as Material[];
 const stocks = [{materialId:"m",available:"0.500"},{materialId:"m",available:"0.500"}] as StockBalance[];
 assert.equal(criticalCount(materials,stocks),1); stocks[1].available="0.501"; assert.equal(criticalCount(materials,stocks),0);
});
test("due payables include held outstanding, excluding voided and outside horizon",()=>{
 const invoices = [{id:"a",dueOn:"2026-11-05",status:"HELD"},{id:"b",dueOn:"2026-11-06",status:"POSTED"},{id:"c",dueOn:"2026-10-29",status:"VOIDED"}] as Invoice[];
 const balances = ["a","b","c"].map(invoiceId=>({invoiceId,outstanding:10000000000})) as PayableBalance[];
 assert.equal(duePayables(invoices,balances,"2026-10-29"),10000000000);
});
