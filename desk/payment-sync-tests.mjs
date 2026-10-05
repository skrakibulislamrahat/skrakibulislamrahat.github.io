import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_RATES,emptyLedger,newDay,markPaid,reopenReport,validateLedger,paymentId,isFullyPaid,sumUnpaid,reportTotals,reportText,reportCSV,totals} from './core.mjs';
import {sheetConfig,commissionPayload,syncCommissionSheet} from './sheet-sync.mjs';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function fixture(date='2026-09-17') {
  const data=emptyLedger(),day=newDay(date,DEFAULT_RATES,'legacy');
  day.shifts=[{id:crypto.randomUUID(),start:date+'T09:00:00Z',end:date+'T17:00:00Z',breakMinutes:30}];
  day.counts.repair=4;day.sales=60000;day.labTrips.dropoff=1;data.days=[day];return {data,day};
}
const at='2026-10-04T16:00:00Z';
test('hours paid leaves exact commissions outstanding; subsequent commission pay never doubles wages',()=>{
  const {data,day}=fixture(),hours=markPaid(data,[day.id],'Hours',at,'hours');
  assert.equal(hours.total,8000);assert.equal(paymentId(day,'hours'),hours.id);assert.equal(paymentId(day,'commission'),null);
  assert.equal(isFullyPaid(day),false);assert.equal(sumUnpaid(data.days).total,700);assert.equal(sumUnpaid(data.days).wages,0);
  validateLedger(data);const snapshot=JSON.stringify(hours.days);
  const commission=markPaid(data,[day.id],'Commission',at,'commission');
  assert.equal(commission.total,700);assert.equal(sumUnpaid(data.days).total,0);assert.equal(isFullyPaid(day),true);
  assert.equal(hours.total+commission.total,totals(day).total);assert.equal(JSON.stringify(hours.days),snapshot);validateLedger(data);
  assert.throws(()=>markPaid(data,[day.id],'Again',at,'both'),/Select unpaid/);
});
test('commissions may be paid first and reopening one payment preserves the other',()=>{
  const {data,day}=fixture(),commission=markPaid(data,[day.id],'Commission',at,'commission'),hours=markPaid(data,[day.id],'Hours',at,'hours');
  assert.deepEqual(reopenReport(data,hours.id),[day.id]);assert.equal(paymentId(day,'commission'),commission.id);assert.equal(sumUnpaid(data.days).total,8000);
  validateLedger(data);const replacement=markPaid(data,[day.id],'Hours again',at,'hours');
  reopenReport(data,commission.id);assert.equal(paymentId(day,'hours'),replacement.id);assert.equal(sumUnpaid(data.days).total,700);validateLedger(data);
});
test('all remaining pay handles different partially paid days',()=>{
  const {data,day}=fixture(),second=fixture('2026-09-18').day;data.days.push(second);
  markPaid(data,[day.id],'Hours first',at,'hours');markPaid(data,[second.id],'Commission first',at,'commission');
  const report=markPaid(data,[day.id,second.id],'Remaining',at,'both');
  assert.equal(report.total,8700);assert.deepEqual(report.allocations.map(a=>[a.hours,a.commission]),[[false,true],[true,false]]);
  assert.equal(sumUnpaid(data.days).total,0);validateLedger(data);reopenReport(data,report.id);
  assert.equal(sumUnpaid(data.days).total,8700);validateLedger(data);
});
test('original single-paidId vaults open unchanged and reopen without losing history',()=>{
  const {data,day}=fixture(),legacy={id:crypto.randomUUID(),paidAt:at,label:'Legacy',status:'paid',name:'Rahat',shop:'',days:structuredClone(data.days),total:totals(day).total};
  data.reports=[legacy];day.paidId=legacy.id;const before=JSON.stringify(data);validateLedger(data);
  assert.equal(JSON.stringify(data),before);assert.equal(sumUnpaid(data.days).total,0);assert.equal(isFullyPaid(day),true);
  reopenReport(data,legacy.id);assert.equal(paymentId(day,'hours'),null);assert.equal(paymentId(day,'commission'),null);
  markPaid(data,[day.id],'Corrected hours',at,'hours');assert.equal(legacy.total,8700);validateLedger(data);
});
test('report text and CSV reflect only the payment received',()=>{
  const {data,day}=fixture(),hours=markPaid(data,[day.id],'Hours',at,'hours');
  assert.equal(reportTotals(hours).items,0);assert.match(reportText(hours),/TOTAL: \$80\.00/);assert.match(reportCSV(hours),/"Total pay \$","80.00"/);
  const commission=markPaid(data,[day.id],'Commission',at,'commission');
  assert.equal(reportTotals(commission).wages,0);assert.match(reportText(commission),/TOTAL: \$7\.00/);assert.match(reportCSV(commission),/"Total pay \$","7.00"/);
});
test('invalid scopes, duplicate payments, running days and paid-work edits are rejected',()=>{
  const {data,day}=fixture();assert.throws(()=>markPaid(data,[day.id],'bad',at,'invalid'));
  markPaid(data,[day.id],'Hours',at,'hours');assert.throws(()=>markPaid(data,[day.id],'Twice',at,'hours'),/no unpaid/);
  day.shifts[0].breakMinutes=0;assert.throws(()=>validateLedger(data),/Reopen/);
  const running=fixture();running.day.shifts[0].end=null;assert.throws(()=>markPaid(running.data,[running.day.id],'Commission',at,'commission'),/completed/);
});
test('zero commission days leave unpaid after hours are covered without ghost balances',()=>{
  const {data,day}=fixture();day.counts.repair=0;day.sales=0;
  markPaid(data,[day.id],'Hours',at,'hours');assert.equal(isFullyPaid(day),true);assert.equal(sumUnpaid(data.days).total,0);validateLedger(data);
});

const config={url:'https://script.google.com/macros/s/test-deployment/exec',key:'test-only-connection-key-1234567890123456',shop:'Dayton Wireless'};
test('sync configuration rejects off-site endpoints and missing connection keys',()=>{
  assert.deepEqual(sheetConfig(config),config);
  for(const override of [{url:'https://evil.example/exec'},{url:config.url+'?key=bad'},{url:config.url.replace('/exec','/dev')},{key:'short'},{shop:'Unknown'}])assert.throws(()=>sheetConfig({...config,...override}));
});
test('commission projection excludes private data and splits actual commission payments by work month',()=>{
  const {data,day}=fixture(),next=fixture('2026-10-01').day;data.days.push(next);day.note='PRIVATE_NOTE';data.settings.sheetSync=config;
  data.companyLedger=[{id:crypto.randomUUID(),date:'2026-09-17',type:'advance',amount:9999,method:'cash',note:'PRIVATE_COMPANY'}];
  markPaid(data,[day.id,next.id],'PRIVATE_PAYMENT_LABEL',at,'hours');
  assert.equal(commissionPayload(data,config).payments.length,0);
  const paid=markPaid(data,[day.id,next.id],'PRIVATE_PAYMENT_LABEL',at,'commission'),payload=commissionPayload(data,config),text=JSON.stringify(payload);
  assert.deepEqual(payload.payments.map(p=>[p.month,p.amount]),[['2026-09-01',700],['2026-10-01',700]]);
  for(const field of ['shifts','hour','labTrips','companyLedger','PRIVATE_NOTE','PRIVATE_COMPANY','PRIVATE_PAYMENT_LABEL',config.key])assert.ok(!text.includes('"'+field+'"')&&!text.includes('PRIVATE_')&&!text.includes(config.key));
  assert.equal(payload.days.length,2);reopenReport(data,paid.id);assert.equal(commissionPayload(data,config).payments.length,0);
});
function fakeBrowser() {
  const nodes=[],listeners=new Map();
  const doc={body:{append(...items){nodes.push(...items);}},createElement(tag){return {tag,children:[],append(node){this.children.push(node);},remove(){this.removed=true;},submit(){this.submitted=true;}};}};
  const win={addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name){listeners.delete(name);}};
  return {document:doc,window:win,nodes,send(origin,data){listeners.get('message')?.({origin,data});}};
}
test('sync succeeds only after trusted matching acknowledgement and cleans up hidden request data',async()=>{
  const b=fakeBrowser(),promise=syncCommissionSheet(config,{version:1,days:[],payments:[]},b),form=b.nodes[1],nonce=form.children.find(n=>n.name==='nonce').value;
  assert.equal(form.method,'POST');assert.equal(form.action,config.url);assert.equal(form.submitted,true);
  b.send('https://evil.example',{type:'private-desk-sheet-sync',nonce,ok:true,days:99,payments:99});
  b.send('https://script.googleusercontent.com',{type:'private-desk-sheet-sync',nonce:'wrong',ok:true,days:99,payments:99});
  assert.equal(form.removed,undefined);
  b.send('https://example-script.googleusercontent.com',{type:'private-desk-sheet-sync',nonce,ok:true,days:3,payments:1});
  assert.equal((await promise).days,3);assert.equal(form.removed,true);assert.equal(b.nodes[0].removed,true);
});
test('rejected syncs and missing acknowledgements are reported as unconfirmed',async()=>{
  const b=fakeBrowser(),promise=syncCommissionSheet(config,{},b),nonce=b.nodes[1].children.find(n=>n.name==='nonce').value;
  b.send('https://script.googleusercontent.com',{type:'private-desk-sheet-sync',nonce,ok:false,message:'Conflict'});
  await assert.rejects(promise,/Conflict/);
  const timed=fakeBrowser();await assert.rejects(syncCommissionSheet(config,{}, {...timed,timeout:2}),/not confirmed/);assert.equal(timed.nodes[1].removed,true);
});

const bridge=vm.createContext({});vm.runInContext(readFileSync(new URL('./commission-sync.gs',import.meta.url),'utf8'),bridge);
function editorSetup({key,active=true,validLayout=true}={}) {
  const properties={...(key?{DESK_KEY:key}:{}),...(active?{}:{DESK_SPREADSHEET:'tracker-id'})},logs=[];
  const spreadsheet={getId:()=> 'tracker-id',getSheetByName:()=>validLayout?{}:null};
  const context=vm.createContext({
    SpreadsheetApp:{getActiveSpreadsheet:()=>active?spreadsheet:null,openById(id){assert.equal(id,'tracker-id');return spreadsheet;}},
    PropertiesService:{getScriptProperties:()=>({getProperty:name=>properties[name],setProperty(name,value){properties[name]=value;}})},
    console:{log:message=>logs.push(message)}
  });
  vm.runInContext(readFileSync(new URL('./commission-sync.gs',import.meta.url),'utf8'),context);
  return {context,properties,logs};
}
test('setup runs in the script editor without a spreadsheet UI and never exposes the key',()=>{
  const pending=editorSetup();pending.context.setupPrivateDesk();
  assert.equal(pending.properties.DESK_SPREADSHEET,'tracker-id');assert.equal(pending.properties.DESK_KEY,undefined);
  assert.match(pending.logs[0],/Script properties.*DESK_KEY/);
  const ready=editorSetup({key:config.key,active:false});ready.context.setupPrivateDesk();
  assert.equal(ready.properties.DESK_KEY,config.key);assert.match(ready.logs[0],/Connection ready/);
  assert.ok(!JSON.stringify(ready.logs).includes(config.key));
});
test('setup rejects the wrong spreadsheet layout and invalid saved keys before enabling sync',()=>{
  const wrong=editorSetup({validLayout:false});assert.throws(()=>wrong.context.setupPrivateDesk(),/commission tracker/);
  assert.equal(wrong.properties.DESK_SPREADSHEET,undefined);
  const invalid=editorSetup({key:'short'});assert.throws(()=>invalid.context.setupPrivateDesk(),/DESK_KEY must contain/);
  assert.equal(invalid.properties.DESK_KEY,'short');assert.equal(invalid.logs.length,0);
});
test('sheet upserts are idempotent, safely adopt matching previous rows, and preserve manual rows',()=>{
  const rows=Array.from({length:5},()=>Array(13).fill('')),entry={id:'day-one',date:'2026-09-17',counts:{repair:4},sales:60000};
  rows[0][0]=entry.date;rows[0][12]='Manual note';rows[1][0]='Other manual day';
  const match=(e,row)=>row[0]===e.date,identical=()=>true;
  const plan=bridge.planDeskRows_(rows,[entry],12,match,identical);
  assert.equal(plan.writes[0].index,0);rows[0][12]='Manual note [Private Desk:day-one]';
  const again=bridge.planDeskRows_(rows,[entry],12,match,identical);assert.equal(again.writes[0].index,0);assert.equal(again.clears.length,0);
  const removed=bridge.planDeskRows_(rows,[],12,match,identical);assert.deepEqual(Array.from(removed.clears),[0]);assert.equal(rows[1][0],'Other manual day');
  rows[0][12]='';assert.throws(()=>bridge.planDeskRows_(rows,[entry],12,match,()=>false),/manual row differs/);
});
test('sheet validates the entire payload before applying updates',()=>{
  const {data}=fixture(),payload=commissionPayload(data,config);bridge.validateDeskPayload_(payload);
  const wrong=structuredClone(payload);wrong.days[0].bonus=999;assert.throws(()=>bridge.validateDeskPayload_(wrong),/totals/);
  const duplicate=structuredClone(payload);duplicate.days.push(duplicate.days[0]);assert.throws(()=>bridge.validateDeskPayload_(duplicate),/duplicate/);
});
test('mixed-shop sync carries each workday rule and the bridge validates its matching bonus',()=>{
  const data=emptyLedger(),dayton=newDay('2026-10-01',DEFAULT_RATES,'dayton'),ifix=newDay('2026-10-02',DEFAULT_RATES,'ifix');
  dayton.sales=120001;ifix.sales=120000;data.days=[dayton,ifix];
  const payload=commissionPayload(data,config);assert.deepEqual(payload.days.map(d=>[d.shop,d.bonusPolicy,d.bonus]),[['Dayton Wireless','dayton',2000],['iFixandRepair','ifix',1000]]);
  bridge.validateDeskPayload_(payload);
  const wrong=structuredClone(payload);wrong.days[1].shop='Dayton Wireless';assert.throws(()=>bridge.validateDeskPayload_(wrong),/shop does not match/);
  wrong.days[1].shop='iFixandRepair';wrong.days[1].bonusPolicy='unsupported';assert.throws(()=>bridge.validateDeskPayload_(wrong),/bonus rule/);
});
test('sheet formulas use per-day shop thresholds while legacy requests keep their old formulas',()=>{
  const rows=[],sheet={getRange(row,column,height,width){return {setValues(values){rows.push({row,column,height,width,values});}};}};
  const data=emptyLedger();data.days=[newDay('2026-10-01',DEFAULT_RATES,'dayton'),newDay('2026-10-02',DEFAULT_RATES,'ifix'),newDay('2026-09-17',DEFAULT_RATES,'legacy')];
  const payload=commissionPayload(data,config),legacy=payload.days.find(d=>d.bonusPolicy==='legacy');delete legacy.bonusPolicy;
  // The profile-less fixture represents an old request and is still supported.
  legacy.sales=60000;legacy.bonus=500;bridge.validateDeskPayload_(payload);
  const ordered=['dayton','ifix',undefined].map(policy=>payload.days.find(d=>d.bonusPolicy===policy));
  bridge.applyDeskDays_(sheet,{clears:[],writes:ordered.map((entry,index)=>({entry,index,note:''}))});
  assert.equal(rows[0].values[0][9],'=IF(OR(A5="",B5=""),"",IF(H5>1200,20,IF(H5>1000,10,IF(H5>700,5,0))))');
  assert.equal(rows[1].values[0][9],'=IF(OR(A6="",B6=""),"",IF(H6>=1500,20,IF(H6>=1200,10,IF(H6>=1000,5,0))))');
  assert.match(rows[2].values[0][9],/H7>1500.*H7>1000.*H7>500/);
});
