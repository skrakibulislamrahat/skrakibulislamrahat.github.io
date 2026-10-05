import {TYPES,totals,localDate,reportDayTotals,BONUS_POLICIES,dayBonusPolicy} from './core.mjs?v=12';

export function sheetConfig(value) {
  if(!value||typeof value.url!=='string'||!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(value.url))throw Error('Paste the deployed Google Apps Script URL ending in /exec.');
  if(typeof value.key!=='string'||! /^[A-Za-z0-9_-]{32,100}$/.test(value.key))throw Error('Use the same connection key you entered in the sheet’s setup.');
  if(!['Dayton Wireless','iFixandRepair'].includes(value.shop))throw Error('Choose the shop whose commissions you are syncing.');
  return {url:value.url,key:value.key,shop:value.shop};
}

// Deliberately project commission data. Vault credentials, work hours, lab
// trips, company borrowing and private daily notes never enter this payload.
export function commissionPayload(data,config) {
  config=sheetConfig(config);
  const days=[...data.days].sort((a,b)=>a.date.localeCompare(b.date)).map(day=>{
    const t=totals(day);
    const bonusPolicy=dayBonusPolicy(day);
    return {id:day.id,date:day.date,shop:BONUS_POLICIES[bonusPolicy].shop||config.shop,bonusPolicy,counts:{...day.counts},rates:Object.fromEntries(TYPES.map(([key])=>[key,day.rates[key]])),sales:day.sales,items:t.items,bonus:t.bonus};
  });
  const payments=data.reports.filter(r=>r.status==='paid').flatMap(report=>{
    const months=new Map();
    for(const day of report.days){const t=reportDayTotals(report,day),amount=t.items+t.bonus;if(amount)months.set(day.date.slice(0,7),(months.get(day.date.slice(0,7))||0)+amount);}
    return [...months].map(([month,amount])=>({id:report.id+'_'+month,month:month+'-01',date:localDate(new Date(report.paidAt)),amount}));
  });
  return {version:1,days,payments};
}

export function trustedSheetOrigin(origin) {
  try {const u=new URL(origin);return u.protocol==='https:'&&(u.hostname==='script.google.com'||u.hostname==='script.googleusercontent.com'||u.hostname.endsWith('-script.googleusercontent.com'));}catch{return false;}
}

// A form POST + acknowledged postMessage works without exposing keys in
// query strings or treating an opaque, no-cors response as a successful sync.
export function syncCommissionSheet(config,payload,{document:doc=globalThis.document,window:win=globalThis.window,timeout=60000}={}) {
  config=sheetConfig(config);
  return new Promise((resolve,reject)=>{
    const nonce=crypto.randomUUID(),frame=doc.createElement('iframe'),form=doc.createElement('form');
    frame.name='desk-sheet-'+nonce;frame.hidden=true;frame.title='Commission spreadsheet sync';
    form.method='POST';form.action=config.url;form.target=frame.name;form.hidden=true;
    for(const [name,value] of Object.entries({key:config.key,nonce,payload:JSON.stringify(payload)})) {
      const field=doc.createElement('input');field.type='hidden';field.name=name;field.value=value;form.append(field);
    }
    let timer;
    const cleanup=()=>{clearTimeout(timer);win.removeEventListener('message',received);form.remove();frame.remove();};
    const received=event=>{
      const message=event.data;
      if(!trustedSheetOrigin(event.origin)||message?.type!=='private-desk-sheet-sync'||message.nonce!==nonce)return;
      cleanup();
      if(message.ok===true&&Number.isSafeInteger(message.days)&&Number.isSafeInteger(message.payments)&&message.days>=0&&message.payments>=0)resolve(message);
      else reject(Error(message.message||'The spreadsheet did not confirm the sync.'));
    };
    win.addEventListener('message',received);
    timer=setTimeout(()=>{cleanup();reject(Error('Sync not confirmed. Check the spreadsheet before retrying. Repeating a sync updates the same records.'));},timeout);
    try {doc.body.append(frame,form);form.submit();}catch(error){cleanup();reject(error);}
  });
}
