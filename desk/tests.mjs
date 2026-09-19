import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_RATES,bonus,emptyLedger,newDay,totals,sumDays,markPaid,reopenReport,validateLedger,reportText,reportCSV,companyBalance,upsertCompanyEntry,deleteCompanyEntry,companyReportText} from './core.mjs';
import {newCipher,seal,open} from './crypto.mjs';
import {GitHubVault} from './github.mjs';

function workday(date='2026-09-17') {
  const d=newDay(date,DEFAULT_RATES);
  d.shifts=[{id:crypto.randomUUID(),start:date+'T09:00:00Z',end:date+'T17:00:00Z',breakMinutes:30}];
  return d;
}
function companyEntry(overrides={}) {
  return {id:crypto.randomUUID(),date:'2026-09-19',type:'advance',method:'cash',amount:2000,note:'Supplier bill',...overrides};
}
test('company notebook tracks cash, card and partial repayments in exact cents',()=>{
  const data=emptyLedger();
  for(const e of [companyEntry({amount:10001}),companyEntry({method:'card',amount:2050}),companyEntry({type:'repayment',amount:2500}),companyEntry({type:'repayment',method:'transfer',amount:1001})])upsertCompanyEntry(data,e);
  validateLedger(data);
  assert.deepEqual(companyBalance(data),{advanced:12051,repaid:3501,balance:8550});
  assert.match(companyReportText(data),/Company owes me: \$85\.50/);
});
test('editing and deleting company entries recalculates balances and retains company credit',()=>{
  const data=emptyLedger(),e=companyEntry();upsertCompanyEntry(data,e);e.amount=999;
  assert.equal(companyBalance(data).balance,2000,'stored record must not alias the form object');
  upsertCompanyEntry(data,{...e,amount:1000,note:'Corrected supplier bill'});
  const repayment=companyEntry({type:'repayment',amount:1500});upsertCompanyEntry(data,repayment);
  assert.equal(data.companyLedger.length,2);assert.equal(companyBalance(data).balance,-500);
  assert.match(companyReportText(data),/Company credit: \$5\.00/);
  deleteCompanyEntry(data,repayment.id);assert.equal(companyBalance(data).balance,1000);
  deleteCompanyEntry(data,e.id);assert.equal(companyBalance(data).balance,0);
  assert.throws(()=>deleteCompanyEntry(data,e.id),/could not be found/);
});
test('older ledgers open without company records or a migration',()=>{
  const data=emptyLedger();delete data.companyLedger;data.days=[workday()];const before=JSON.stringify(data);
  validateLedger(data);assert.deepEqual(companyBalance(data),{advanced:0,repaid:0,balance:0});
  assert.equal(JSON.stringify(data),before);
  upsertCompanyEntry(data,companyEntry());validateLedger(data);assert.equal(companyBalance(data).balance,2000);
});
test('company notebook rejects malformed entries and duplicate IDs',()=>{
  for(const override of [{amount:0},{amount:-1},{amount:1.2},{amount:100000001},{amount:NaN},{date:'2026-02-30'},{date:'2026-13-01'},{type:'wage'},{method:'__proto__'},{method:['cash']},{note:null},{note:'x'.repeat(1001)},{id:''}]) {
    const data=emptyLedger();data.companyLedger=[companyEntry(override)];assert.throws(()=>validateLedger(data));
    assert.throws(()=>upsertCompanyEntry(emptyLedger(),companyEntry(override)));
  }
  for(const invalid of [null,{},'bad']){const data=emptyLedger();data.companyLedger=invalid;assert.throws(()=>validateLedger(data));}
  const data=emptyLedger(),e=companyEntry();data.companyLedger=[e,{...e}];assert.throws(()=>validateLedger(data),/Duplicate/);
});
test('company balance stays independent when wages are reported, paid, corrected and reopened',()=>{
  const data=emptyLedger(),day=workday();data.days=[day];
  const draft={days:data.days,name:'Rahat',shop:'',label:'Payday',status:'unpaid',paidAt:''};
  const before={totals:sumDays(data.days),text:reportText(draft),csv:reportCSV(draft)};
  const e=companyEntry({amount:4567});upsertCompanyEntry(data,e);
  assert.deepEqual(sumDays(data.days),before.totals);assert.equal(reportText(draft),before.text);assert.equal(reportCSV(draft),before.csv);
  const r=markPaid(data,[day.id],'Payday');validateLedger(data);
  assert.equal(companyBalance(data).balance,4567);assert.equal(r.total,before.totals.total);
  const snapshot=JSON.stringify(r);upsertCompanyEntry(data,{...e,amount:9999});
  assert.equal(JSON.stringify(r),snapshot);reopenReport(data,r.id);
  assert.equal(companyBalance(data).balance,9999);validateLedger(data);
});
test('company notebook survives encrypted vault and backup round trips',async()=>{
  const data=emptyLedger();upsertCompanyEntry(data,companyEntry({method:'card',note:'Parts on my card',amount:12345}));
  const cipher=await newCipher('not-a-real-password-123'),envelope=await seal(data,cipher);
  assert.ok(!JSON.stringify(envelope).includes('Parts on my card'));
  const restored=validateLedger((await open(envelope,'not-a-real-password-123')).value);
  assert.deepEqual(restored,data);assert.equal(companyBalance(restored).balance,12345);
});
test('sales tiers require strictly greater totals; only the highest tier applies',()=>{
  assert.deepEqual([0,50000,50001,100000,100001,150000,150001].map(bonus),[0,0,500,500,1000,1000,2000]);
});
test('hours deduct breaks and item types use distinct rates',()=>{
  const d=workday();d.sales=150001;d.counts={repair:4,case:2,other:3,device:1,computer:2};
  assert.deepEqual(totals(d),{minutes:450,wages:7500,labDropoffs:0,labPickups:0,labMinutes:0,labPay:0,paidMinutes:450,items:1850,bonus:2000,total:11350,sales:150001});
});
test('each lab drop-off and pickup adds thirty paid minutes without changing clocked time',()=>{
  for(const labTrips of [{dropoff:1,pickup:0},{dropoff:0,pickup:1},{dropoff:1,pickup:1},{dropoff:2,pickup:3}]) {
    const d=workday();d.labTrips=labTrips;
    const trips=labTrips.dropoff+labTrips.pickup,t=totals(d);
    assert.equal(t.minutes,450);assert.equal(t.wages,7500);
    assert.equal(t.labMinutes,trips*30);assert.equal(t.labPay,trips*500);
    assert.equal(t.paidMinutes,450+trips*30);assert.equal(t.total,7500+trips*500);
  }
});
test('lab trips can be logged on separate dates or without a shift, at each historical hourly rate',()=>{
  const data=emptyLedger(),dropoff=newDay('2026-09-17',DEFAULT_RATES),pickup=workday('2026-09-18');
  dropoff.labTrips.dropoff=1;pickup.labTrips.pickup=1;pickup.rates.hour=1200;
  data.days=[dropoff,pickup];data.settings.rates.hour=2000;
  validateLedger(data);
  assert.equal(totals(dropoff).total,500);assert.equal(totals(pickup).labPay,600);
  assert.equal(totals(pickup).total,9600);
  const t=sumDays(data.days);assert.equal(t.labMinutes,60);assert.equal(t.labPay,1100);
  assert.equal(t.labDropoffs,1);assert.equal(t.labPickups,1);assert.equal(t.total,10100);
  assert.equal(t.paidMinutes,510);
  const report=markPaid(data,[dropoff.id,pickup.id],'Lab work');
  assert.equal(report.total,10100);validateLedger(data);
});
test('lab salary rounds to cents per day and is unaffected by unpaid shift breaks',()=>{
  const d=workday();d.rates.hour=1001;d.labTrips={dropoff:1,pickup:0};
  assert.equal(totals(d).labPay,501);
  d.labTrips.pickup=1;assert.equal(totals(d).labPay,1001);
  d.shifts[0].breakMinutes=480;
  assert.equal(totals(d).wages,0);assert.equal(totals(d).total,1001);
});
test('old entries and paid snapshots without lab fields keep their exact original totals',()=>{
  const data=emptyLedger(),d=workday();delete d.labTrips;data.days=[d];
  const report=markPaid(data,[d.id],'Original pay'),before=JSON.stringify(data);
  validateLedger(data);assert.equal(JSON.stringify(data),before);
  assert.equal(report.total,7500);assert.equal(totals(d).labPay,0);
  assert.equal(sumDays(report.days).total,7500);
  assert.ok(!reportText(report).includes('Lab extra'));
  reopenReport(data,report.id);d.labTrips={dropoff:1,pickup:0};
  assert.equal(totals(d).total,8000);assert.equal(sumDays(report.days).total,7500);
  validateLedger(data);
});
test('negative, fractional, incomplete, or excessive lab trip counts are rejected',()=>{
  const data=emptyLedger(),d=workday();data.days=[d];
  for(const trips of [null,[],{dropoff:-1,pickup:0},{dropoff:0,pickup:1.5},{dropoff:100001,pickup:0},{dropoff:1},{dropoff:'1',pickup:0}]) {
    d.labTrips=trips;assert.throws(()=>validateLedger(data),/Lab trips/);
  }
});
test('paid lab credits remain in immutable reports and appear in text and CSV exports',()=>{
  const data=emptyLedger(),d=workday();d.labTrips={dropoff:1,pickup:2};data.days=[d];
  const report=markPaid(data,[d.id],'Lab week');
  const text=reportText(report),csv=reportCSV(report);
  assert.match(text,/drop-offs 1, pickups 2/);assert.match(text,/Lab extra paid time: 1h 30m/);
  assert.match(text,/Lab extra pay: \$15.00/);assert.match(text,/Total paid time: 9h 0m/);
  assert.match(text,/TOTAL: \$90.00/);
  const lines=csv.replace(/^\uFEFF/,'').split('\r\n');
  const cells=line=>line.slice(1,-1).split('","');
  const headings=cells(lines[2]),values=cells(lines[3]);
  const row=Object.fromEntries(headings.map((h,i)=>[h,values[i]]));
  assert.equal(row['Lab drop-offs'],'1');assert.equal(row['Lab pickups'],'2');
  assert.equal(row['Lab extra minutes'],'90');assert.equal(row['Lab extra pay $'],'15.00');
  assert.equal(row['Total paid hours'],'9.00');assert.equal(row['Total pay $'],'90.00');
  const ids=reopenReport(data,report.id);d.labTrips.pickup=0;
  const correction=markPaid(data,ids,'Corrected lab week');
  assert.equal(report.total,9000);assert.equal(correction.total,8000);
  assert.equal(report.days[0].labTrips.pickup,2);validateLedger(data);
});
test('overnight shifts and exact cent rounding',()=>{
  const d=workday();d.shifts=[{id:crypto.randomUUID(),start:'2026-09-17T23:30:00Z',end:'2026-09-18T01:01:40Z',breakMinutes:10}];
  assert.equal(totals(d).minutes,81);assert.equal(totals(d).wages,1350);
});
test('running shifts are excluded from finalized totals and block payment',()=>{
  const data=emptyLedger(),d=workday();d.shifts[0].end=null;data.days=[d];
  assert.equal(totals(d).minutes,0);assert.equal(totals(d,Date.parse('2026-09-17T17:00:00Z')).minutes,450);
  assert.throws(()=>markPaid(data,[d.id],'Pay'),/completed/);
});
test('reopen selects only original days and keeps original report immutable',()=>{
  const data=emptyLedger(),old=workday(),fresh=workday('2026-09-18');data.days=[old,fresh];
  const report=markPaid(data,[old.id],'First pay');
  const original=structuredClone(report.days);
  assert.equal(fresh.paidId,null);
  const ids=reopenReport(data,report.id);
  old.sales=150001;
  const replacement=markPaid(data,ids,'Corrected pay');
  assert.equal(fresh.paidId,null);assert.equal(old.paidId,replacement.id);
  assert.deepEqual(report.days,original);assert.equal(report.status,'reopened');
  validateLedger(data);
});
test('invalid dates, overlapping shifts, negative amounts and excessive breaks fail',()=>{
  const data=emptyLedger();data.days=[workday()];
  data.days[0].date='2026-02-31';assert.throws(()=>validateLedger(data));data.days[0].date='2026-09-17';
  data.days[0].sales=-1;assert.throws(()=>validateLedger(data));data.days[0].sales=0;
  data.days[0].shifts[0].breakMinutes=481;assert.throws(()=>validateLedger(data));data.days[0].shifts[0].breakMinutes=0;
  const second=workday('2026-09-18');second.shifts[0].start='2026-09-17T16:00:00Z';data.days.push(second);
  assert.throws(()=>validateLedger(data),/overlap/);
});
test('historical daily rates do not change when defaults change',()=>{
  const data=emptyLedger();data.days=[workday()];data.settings.rates.hour=2000;
  assert.equal(totals(data.days[0]).wages,7500);
});
test('CSV escapes formula-leading notes and includes shift detail',()=>{
  const data=emptyLedger();data.days=[workday()];data.days[0].note=' =HYPERLINK("bad")';
  const report=markPaid(data,[data.days[0].id],'Payment'),csv=reportCSV(report);
  assert.ok(csv.includes("\"' =HYPERLINK"));assert.ok(csv.includes('Unpaid break minutes'));
});
test('encryption rejects wrong passwords, tampering and cross-purpose use',async()=>{
  const password='test-only-long-passphrase',cipher=await newCipher(password),value={sensitive:'pay details'};
  const a=await seal(value,cipher),b=await seal(value,cipher);
  assert.notEqual(a.iv,b.iv);assert.ok(!JSON.stringify(a).includes('pay details'));
  assert.deepEqual((await open(a,password)).value,value);
  await assert.rejects(()=>open(a,'wrong-password'),/Wrong password/);
  await assert.rejects(()=>open(a,password,'connection'),/Unsupported/);
  a.ciphertext=(a.ciphertext[0]==='A'?'B':'A')+a.ciphertext.slice(1);
  await assert.rejects(()=>open(a,password),/Wrong password/);
});
const response=(status,value)=>({status,ok:status>=200&&status<300,json:async()=>value});
test('default browser fetch keeps the native global receiver',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=function(url,options) {
    // Browser-native fetch rejects a class instance as its receiver.
    if(this!==globalThis) throw new TypeError('Illegal invocation');
    assert.ok(url.startsWith('https://api.github.com/repos/'));
    return Promise.resolve(response(200,{private:true,owner:{login:'skrakibulislamrahat'},default_branch:'main'}));
  };
  try {
    const client=new GitHubVault('data','github_pat_test');
    assert.equal((await client.verify()).private,true);
  }finally{globalThis.fetch=original;}
});
test('public repositories are refused before any write',async()=>{
  const calls=[];
  const client=new GitHubVault('data','github_pat_test',async(url,options)=>{calls.push(options);return response(200,{private:false,owner:{login:'skrakibulislamrahat'}});});
  await assert.rejects(()=>client.write({},null),/PRIVATE/);assert.equal(calls.length,1);assert.equal(calls[0].method,undefined);
});
test('writes carry the expected SHA; conflicts never retry with overwrite',async()=>{
  const calls=[];
  const client=new GitHubVault('data','github_pat_test',async(url,options)=>{
    calls.push({url,options});
    if(!options.method)return response(200,{private:true,owner:{login:'skrakibulislamrahat'},default_branch:'main'});
    return response(409,{});
  });
  await assert.rejects(()=>client.write({encrypted:true},'old-sha'),/another device/);
  assert.equal(calls.length,2);assert.equal(JSON.parse(calls[1].options.body).sha,'old-sha');
  assert.equal(calls[1].options.headers.Authorization,'Bearer github_pat_test');
});
test('successful writes return the confirmed new SHA',async()=>{
  const client=new GitHubVault('data','github_pat_test',async(url,options)=>response(200,options.method?{content:{sha:'new-sha'}}:{private:true,owner:{login:'skrakibulislamrahat'},default_branch:'main'}));
  assert.equal(await client.write({},'old-sha'),'new-sha');
  client.clear();assert.equal(client.token,'');
});
