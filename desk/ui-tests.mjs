import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as core from './core.mjs';
import * as cryptography from './crypto.mjs';
import * as sheet from './sheet-sync.mjs';

function harness() {
  const elements=new Map(),listeners=new Map();
  function element(selector) {
    if(!elements.has(selector))elements.set(selector,{innerHTML:'',textContent:'',dataset:{},hidden:false,open:false,classList:{add(){},toggle(){}},focus(){},setAttribute(){},removeAttribute(){},replaceChildren(){this.innerHTML='';},addEventListener(name,fn){listeners.set(selector+':'+name,fn);},showModal(){this.open=true;},close(){this.open=false;},reset(){}});
    return elements.get(selector);
  }
  const document={title:'',body:{classList:{toggle(){}}},querySelector:element,querySelectorAll:()=>[],addEventListener(name,fn){listeners.set(name,fn);},dispatchEvent(){}};
  class Fields {constructor(form){this.fields=form.fields;}get(key){return this.fields[key]??null;}has(key){return key in this.fields;}}
  const context=vm.createContext({...core,...cryptography,...sheet,OWNER:'test-owner',document,crypto,structuredClone,Intl,URL,FormData:Fields,Date,Event,CustomEvent:class{},localStorage:{getItem:()=>null},window:{addEventListener(){}},setTimeout,clearTimeout,setInterval(){},confirm:()=>true});
  vm.runInContext(readFileSync(new URL('./app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,''),context);
  return {context,element,listeners,run:code=>vm.runInContext(code,context)};
}
async function seed(h) {
  const data=core.emptyLedger(),day=core.newDay('2026-09-17',core.DEFAULT_RATES);
  day.shifts=[{id:crypto.randomUUID(),start:'2026-09-17T09:00:00Z',end:'2026-09-17T17:00:00Z',breakMinutes:30}];day.counts.case=2;day.sales=60000;data.days=[day];
  h.context.testData=data;h.context.testCipher=await cryptography.newCipher('fake-ui-test-password-123');h.context.writeCount=0;
  h.run("data=testData;cipher=testCipher;sha='old';api={repo:'test',write:async()=>{writeCount++;return 'new';}};date='2026-09-17';view='unpaid';selected=new Set(data.days.map(d=>d.id));render();");
  return day;
}
test('unpaid UI and confirmation keep commission pending after hourly-only payment',async()=>{
  const h=harness(),day=await seed(h),initial=h.element('#main').innerHTML;
  for(const label of ['Mark hours paid','Mark commissions paid','Mark all paid'])assert.ok(initial.includes(label));
  h.run("askPay('hours')");assert.match(h.element('#modal-content').innerHTML,/\$75\.00/);assert.match(h.element('#modal-content').innerHTML,/\$7\.00 in commissions and bonuses stays unpaid/);
  await h.run("pay({fields:{label:'Hours received',part:'hours'}})");assert.equal(h.context.writeCount,1);
  h.run("view='unpaid';render();");const updated=h.element('#main').innerHTML;
  assert.match(updated,/Hours: paid ✓/);assert.match(updated,/Commissions: unpaid/);assert.match(updated,/\$7\.00/);
  assert.ok(updated.includes('data-part="hours" disabled'));
  h.run("selected=new Set(data.days.map(d=>d.id));askPay('commission');");assert.match(h.element('#modal-content').innerHTML,/\$7\.00/);
  await h.run("pay({fields:{label:'Commission received',part:'commission'}})");h.run("view='unpaid';render();");
  assert.match(h.element('#main').innerHTML,/A fresh start/);assert.equal(h.run('data.reports.reduce((sum,r)=>sum+r.total,0)'),8200);
  assert.equal(h.run('data.days[0].id'),day.id);
});
test('day details show both component statuses and keep payment reports available',async()=>{
  const h=harness();await seed(h);
  h.run("markPaid(data,data.days.map(d=>d.id),'Hours',new Date().toISOString(),'hours');view='today';render();");
  assert.match(h.element('#main').innerHTML,/Hours: paid ✓/);assert.match(h.element('#main').innerHTML,/Commissions: unpaid/);assert.match(h.element('#main').innerHTML,/\$7\.00 remaining/);
  assert.match(h.element('#main').innerHTML,/Record remaining payment/);assert.ok(!h.element('#main').innerHTML.includes('id="day-form"'));
});
test('missing sheet connection opens honest setup and existing sync settings survive rate saves',async()=>{
  const h=harness();await seed(h);await h.run('syncSheet()');
  assert.match(h.element('#modal-content').innerHTML,/Step 1: Save/);assert.match(h.element('#modal-content').innerHTML,/setupPrivateDesk/);
  h.run("data.settings.sheetSync={url:'https://script.google.com/macros/s/test/exec',key:'fake-only-key-123456789012345678901234',shop:'Dayton Wireless'};view='settings';render();");
  assert.match(h.element('#main').innerHTML,/Connection saved/);
  const fields={name:'Rahat',shop:'Dayton Wireless',...Object.fromEntries(Object.entries(core.DEFAULT_RATES).map(([key,value])=>['rate_'+key,String(value/100)]))};
  await h.listeners.get('submit')({target:{id:'settings-form',fields},preventDefault(){}});
  assert.equal(h.run('data.settings.sheetSync.shop'),'Dayton Wireless');assert.equal(h.context.writeCount,1);
});
test('changing payment type disables zero-dollar confirmations without an exception',async()=>{
  const h=harness();await seed(h);h.run("markPaid(data,data.days.map(d=>d.id),'Hours',new Date().toISOString(),'hours');askPay('commission');");
  h.listeners.get('change')({target:{id:'payment-part',value:'hours',dataset:{}}});
  assert.equal(h.element('#payment-amount').textContent,'$0.00');assert.equal(h.element('#confirm-payment').disabled,true);
});

test('Google pairing starts only after a successful vault save and keeps that saved key',async()=>{
  const h=harness();await seed(h);h.run("showSheetSetup();api.write=async()=>{throw Error('Fake save failure');};");
  const fields={url:'https://script.google.com/macros/s/test/exec',key:'fake-ui-pairing-key-12345678901234567890',shop:'Dayton Wireless'};
  const submit=()=>h.listeners.get('submit')({target:{id:'sheet-form',fields},preventDefault(){}});
  await submit();assert.equal(h.run('data.settings.sheetSync'),undefined);assert.match(h.element('#modal-content').innerHTML,/Step 1: Save/);
  h.run("api.write=async()=>{writeCount++;return 'paired';};");await submit();
  assert.equal(h.context.writeCount,1);assert.equal(h.run('data.settings.sheetSync.key'),fields.key);
  assert.match(h.element('#modal-content').innerHTML,/Step 2: Connect Google/);assert.match(h.element('#modal-content').innerHTML,/Save script properties/);
  h.run('showSheetSetup()');assert.ok(h.element('#modal-content').innerHTML.includes(fields.key));
});

test('a rejected Google key opens repair instructions with the existing key and waits for a confirmed retry',async()=>{
  const h=harness();await seed(h);
  const config={url:'https://script.google.com/macros/s/test/exec',key:'fake-ui-existing-key-12345678901234567890',shop:'Dayton Wireless'};
  h.context.testConfig=config;h.run('data.settings.sheetSync=testConfig');
  h.context.syncCommissionSheet=async()=>{throw Error('Connection key not accepted. Check the saved key in your desk.');};
  await h.run('syncSheet()');assert.equal(h.element('#sync-status').textContent,'Sheet sync not confirmed');
  assert.match(h.element('#modal-content').innerHTML,/Google rejected the connection key/);assert.ok(h.element('#modal-content').innerHTML.includes(config.key));
  assert.equal(h.context.writeCount,0);assert.equal(h.element('#modal').open,true);
  h.context.syncCommissionSheet=async(saved,payload)=>{assert.equal(saved.key,config.key);assert.equal(payload.days.length,1);return {ok:true,days:1,payments:0};};
  await h.run('syncSheet()');assert.equal(h.element('#modal').open,false);assert.equal(h.element('#sync-status').textContent,'Sheet synced');
});
