import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_RATES,bonus,emptyLedger,newDay,totals,markPaid,reopenReport,validateLedger,reportCSV} from './core.mjs';
import {newCipher,seal,open} from './crypto.mjs';
import {GitHubVault} from './github.mjs';

function workday(date='2026-09-17') {
  const d=newDay(date,DEFAULT_RATES);
  d.shifts=[{id:crypto.randomUUID(),start:date+'T09:00:00Z',end:date+'T17:00:00Z',breakMinutes:30}];
  return d;
}
test('sales tiers require strictly greater totals; only the highest tier applies',()=>{
  assert.deepEqual([0,50000,50001,100000,100001,150000,150001].map(bonus),[0,0,500,500,1000,1000,2000]);
});
test('hours deduct breaks and item types use distinct rates',()=>{
  const d=workday();d.sales=150001;d.counts={repair:4,case:2,other:3,device:1,computer:2};
  assert.deepEqual(totals(d),{minutes:450,wages:7500,items:1850,bonus:2000,total:11350,sales:150001});
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
