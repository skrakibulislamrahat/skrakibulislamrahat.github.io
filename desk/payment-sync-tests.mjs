import test from 'node:test';
import {applySheetBonusPolicies} from './core.mjs';
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

const bridgeSource=readFileSync(new URL('./commission-sync.gs',import.meta.url),'utf8');
// Independently specified instants stand in for Apps Script's native date parser.
// Midnight on a DST transition still uses the offset before that day's change.
const dateInstants={
  'America/New_York':{
    '2026-01-01':'2026-01-01T05:00:00.000Z',
    '2026-03-01':'2026-03-01T05:00:00.000Z',
    '2026-03-08':'2026-03-08T05:00:00.000Z',
    '2026-03-09':'2026-03-09T04:00:00.000Z',
    '2026-09-17':'2026-09-17T04:00:00.000Z',
    '2026-10-01':'2026-10-01T04:00:00.000Z',
    '2026-10-02':'2026-10-02T04:00:00.000Z',
    '2026-10-18':'2026-10-18T04:00:00.000Z',
    '2026-11-01':'2026-11-01T04:00:00.000Z',
    '2026-11-02':'2026-11-02T05:00:00.000Z'
  },
  'Asia/Dhaka':{
    '2026-10-01':'2026-09-30T18:00:00.000Z',
    '2026-10-18':'2026-10-17T18:00:00.000Z',
    '2026-12-01':'2026-11-30T18:00:00.000Z',
    '2026-12-31':'2026-12-30T18:00:00.000Z',
    '2027-01-01':'2026-12-31T18:00:00.000Z'
  }
};
function sheetDateKey(value,timezone) {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value);
  const part=type=>parts.find(p=>p.type===type).value;
  return part('year')+'-'+part('month')+'-'+part('day');
}
function dateUtilities(timezone) {
  return {
    parseDate(value,zone,format){
      assert.equal(zone,timezone,'Dates must use the spreadsheet timezone');
      assert.equal(format,'yyyy-MM-dd');
      const instant=dateInstants[timezone][value];assert.ok(instant,'Missing native date-parser fixture: '+value);
      return new Date(instant);
    },
    formatDate(value,zone,format){assert.equal(format,'yyyy-MM-dd');return sheetDateKey(value,zone);}
  };
}
const bridge=vm.createContext({Date,Utilities:dateUtilities('America/New_York')});vm.runInContext(bridgeSource,bridge);
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
  const invalidDate=structuredClone(payload);invalidDate.days[0].date='2026-02-30';assert.throws(()=>bridge.validateDeskPayload_(invalidDate),/workday/);
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
  bridge.applyDeskDays_(sheet,{clears:[],writes:ordered.map((entry,index)=>({entry,index,note:''}))},'America/New_York');
  assert.equal(rows[0].values[0][9],'=IF(OR(A5="",B5=""),"",IF(H5>1200,20,IF(H5>1000,10,IF(H5>700,5,0))))');
  assert.equal(rows[1].values[0][9],'=IF(OR(A6="",B6=""),"",IF(H6>=1500,20,IF(H6>=1200,10,IF(H6>=1000,5,0))))');
  assert.match(rows[2].values[0][9],/H7>1500.*H7>1000.*H7>500/);
});
function dateSyncHarness(timezone,scriptTimezone) {
  let locked=false,flushed=0;
  function table(width,dateColumns,headings) {
    const rows=Array.from({length:1000},()=>Array(width).fill(''));
    return {rows,getRange(row,column,height,columns){return {
      getValues(){
        if(row===4)return [headings];
        return rows.slice(row-5,row-5+height).map(values=>values.slice(column-1,column-1+columns));
      },
      setValues(values){
        assert.equal(values.length,height);
        for(const valuesRow of values){
          assert.equal(valuesRow.length,columns);
          valuesRow.forEach((value,index)=>{
            if(dateColumns.includes(column+index)&&(!(value instanceof Date)||!Number.isFinite(value.getTime())))throw Error('Enter the work date.');
          });
        }
        values.forEach((valuesRow,index)=>rows[row-5+index].splice(column-1,columns,...valuesRow));
      },
      clearContent(){for(let index=row-5;index<row-5+height;index++)rows[index].fill('',column-1,column-1+columns);}
    };}};
  }
  const headings=Array(13).fill('');headings[0]='Date';headings[1]='Shop';headings[12]='Notes';
  const payHeadings=Array(6).fill('');payHeadings[0]='Commission month';payHeadings[2]='Amount paid ($)';
  const commissions=table(13,[1],headings),payments=table(6,[1,2],payHeadings);
  const ss={getSpreadsheetTimeZone:()=>timezone,getSheetByName:name=>name==='Commission Log'?commissions:name==='Payments'?payments:null};
  const properties={DESK_KEY:config.key,DESK_SPREADSHEET:'test-spreadsheet'};
  const context=vm.createContext({
    Date,Utilities:dateUtilities(timezone),Session:{getScriptTimeZone:()=>scriptTimezone},
    SpreadsheetApp:{openById(id){assert.equal(id,'test-spreadsheet');return ss;},flush(){flushed++;}},
    PropertiesService:{getScriptProperties:()=>({getProperty:name=>properties[name]})},
    LockService:{getScriptLock:()=>({waitLock(){locked=true;},hasLock:()=>locked,releaseLock(){locked=false;}})},
    HtmlService:{XFrameOptionsMode:{ALLOWALL:'ALLOWALL'},createHtmlOutput(html){return {html,setXFrameOptionsMode(){return this;}};}}
  });
  vm.runInContext(bridgeSource,context);
  return {commissions,payments,flushed:()=>flushed,sync(payload){
    const response=context.doPost({parameter:{key:config.key,nonce:'date-test-nonce',payload:JSON.stringify(payload)}});
    let result;
    vm.runInNewContext(response.html.match(/<script>([\s\S]+)<\/script>/)[1],{window:{top:{postMessage(message){result=message;}}}});
    assert.equal(locked,false);return result;
  }};
}
for(const [timezone,scriptTimezone,dates] of [
  ['America/New_York','Etc/UTC',['2026-01-01','2026-03-08','2026-03-09','2026-10-18','2026-11-01','2026-11-02']],
  ['Asia/Dhaka','America/Los_Angeles',['2026-10-18','2026-12-31','2027-01-01']]
])test('sync writes real workday and payment dates in '+timezone+' when script timezone is '+scriptTimezone,()=>{
  const data=emptyLedger();data.days=dates.map(date=>{const day=newDay(date,DEFAULT_RATES,'legacy');day.counts.repair=2;return day;});
  const payload=commissionPayload(data,config);
  payload.payments=dates.map((date,index)=>({id:'date-payment-'+index,month:date.slice(0,7)+'-01',date,amount:100}));
  const harness=dateSyncHarness(timezone,scriptTimezone),result=harness.sync(payload);
  assert.equal(result.ok,true,result.message);assert.equal(result.days,dates.length);assert.equal(result.payments,dates.length);assert.equal(harness.flushed(),1);
  function assertDate(actual,expected){
    assert.ok(actual instanceof Date,'Date-validated cells must receive Date objects');
    assert.equal(actual.toISOString(),dateInstants[timezone][expected]);
    assert.equal(sheetDateKey(actual,timezone),expected,'Calendar date must not shift');
  }
  payload.days.forEach((day,index)=>assertDate(harness.commissions.rows[index][0],day.date));
  payload.payments.forEach((payment,index)=>{
    assertDate(harness.payments.rows[index][0],payment.month);assertDate(harness.payments.rows[index][1],payment.date);
    assert.equal(harness.payments.rows[index][2],payment.amount/100);
  });
  assert.equal(harness.sync(payload).ok,true,'A repeated sync must accept previously written Date objects');
  assert.equal(harness.commissions.rows.filter(row=>row[0]!=='').length,dates.length);
  assert.equal(harness.payments.rows.filter(row=>row[0]!=='').length,dates.length);
});
test('an inferred shop keeps the existing sheet shop and saves its correct bonus rule back to the desk',()=>{
  const data=emptyLedger(),day=newDay('2026-09-21',DEFAULT_RATES);day.sales=100000;data.days=[day];
  const payload=commissionPayload(data,config),row=Array(13).fill('');row[1]='iFixandRepair';row[12]='[Private Desk:'+day.id+']';
  const corrections=bridge.resolveDeskShops_([row],payload.days);bridge.validateDeskPayload_(payload);
  assert.equal(payload.days[0].shop,'iFixandRepair');assert.equal(payload.days[0].bonus,500);
  applySheetBonusPolicies(data,corrections);assert.equal(data.days[0].bonusPolicy,'ifix');assert.equal(data.days[0].bonusPolicyAutomatic,false);assert.equal(commissionPayload(data,config).days[0].bonus,500);
  const explicit=commissionPayload(data,config);row[1]='Dayton Wireless';assert.equal(bridge.resolveDeskShops_([row],explicit.days).length,0);
  const wrong=structuredClone(corrections);wrong[0].id='unknown';assert.throws(()=>applySheetBonusPolicies(data,wrong),/Invalid sheet/);
});
