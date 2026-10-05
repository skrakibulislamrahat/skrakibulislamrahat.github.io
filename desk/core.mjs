export const TYPES = [
  ['repair', 'Phone repairs', 50],
  ['case', 'Cases', 100],
  ['other', 'Other items', 50],
  ['device', 'Device sales', 300],
  ['computer', 'Laptop / console repairs', 500],
];
export const LAB_TYPES = [['dropoff', 'Lab drop-off'], ['pickup', 'Lab pickup']];
export const LAB_MINUTES = 30;
export const DEFAULT_RATES = {hour: 1000, ...Object.fromEntries(TYPES.map(([k,,v]) => [k,v]))};
export const money = cents => new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'}).format(cents / 100);
export const uid = () => crypto.randomUUID();
export const localDate = (d = new Date()) => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
export const BONUS_POLICIES = {
  dayton:{label:'Dayton Wireless · current',shop:'Dayton Wireless',thresholds:[70000,100000,120000],inclusive:false},
  ifix:{label:'iFixandRepair',shop:'iFixandRepair',thresholds:[100000,120000,150000],inclusive:true},
  legacy:{label:'Previously saved rule',shop:null,thresholds:[50000,100000,150000],inclusive:false},
};
export const DAYTON_BONUS_EFFECTIVE_DATE = '2026-09-20';
export const datedDaytonPolicy = date => date < DAYTON_BONUS_EFFECTIVE_DATE ? 'legacy' : 'dayton';
export const dayBonusPolicy = day => day.bonusPolicy??'legacy';
export const defaultBonusPolicy = settings => settings.bonusPolicy??(settings.shop==='iFixandRepair'||settings.sheetSync?.shop==='iFixandRepair'?'ifix':'dayton');
export function bonus(sales,policy='dayton') {
  if(!Object.hasOwn(BONUS_POLICIES,policy))throw Error('Choose a supported sales bonus rule.');
  const rule=BONUS_POLICIES[policy];
  for(let i=2;i>=0;i--)if(rule.inclusive?sales>=rule.thresholds[i]:sales>rule.thresholds[i])return [500,1000,2000][i];
  return 0;
}
export function bonusRuleText(policy) {
  const rule=BONUS_POLICIES[policy];
  return rule.label+': '+rule.thresholds.map((threshold,i)=>(rule.inclusive?'at least ':'over ')+money(threshold)+' = '+money([500,1000,2000][i])).join('; ')+'. Highest tier only.';
}
export const duration = minutes => Math.floor(minutes/60) + 'h ' + (minutes%60) + 'm';
export function emptyLedger() {
  return {schema:1, settings:{name:'Rahat',shop:'',rates:{...DEFAULT_RATES}},days:[],reports:[],companyLedger:[]};
}
export function newDay(date, rates,bonusPolicy='dayton') {
  return {id:uid(),date,bonusPolicy:bonusPolicy==='dayton'?datedDaytonPolicy(date):bonusPolicy,bonusPolicyAutomatic:bonusPolicy==='dayton',sales:0,counts:Object.fromEntries(TYPES.map(([k])=>[k,0])),labTrips:{dropoff:0,pickup:0},rates:{...rates},note:'',shifts:[],paidId:null};
}
export const running = day => day.shifts.some(s => s.end === null);
export function totals(day, now = null) {
  const minutes = day.shifts.reduce((sum,s) => {
    const end = s.end ? Date.parse(s.end) : now;
    return sum + (end == null ? 0 : Math.max(0, Math.floor((end-Date.parse(s.start))/60000)-s.breakMinutes));
  },0);
  const wages = Math.round(minutes * day.rates.hour / 60);
  // Missing labTrips means an older record with no credited trips. Do not
  // rewrite old entries or payment snapshots just to add default fields.
  const labDropoffs = day.labTrips?.dropoff ?? 0;
  const labPickups = day.labTrips?.pickup ?? 0;
  const labMinutes = (labDropoffs + labPickups) * LAB_MINUTES;
  const labPay = Math.round(labMinutes * day.rates.hour / 60);
  const paidMinutes = minutes + labMinutes;
  const items = TYPES.reduce((sum,[k]) => sum + day.counts[k]*day.rates[k],0);
  // Records saved before shop policies existed keep their recorded totals.
  // Do not guess the date a shop changed its rules or rewrite paid snapshots.
  const salesBonus = bonus(day.sales,dayBonusPolicy(day));
  return {minutes,wages,labDropoffs,labPickups,labMinutes,labPay,paidMinutes,items,bonus:salesBonus,total:wages+labPay+items+salesBonus,sales:day.sales};
}
export function sumDays(days, now=null) {
  return days.reduce((sum,d) => {
    const t=totals(d,now); for(const k of Object.keys(t)) sum[k]+=t[k]; return sum;
  }, {minutes:0,wages:0,labDropoffs:0,labPickups:0,labMinutes:0,labPay:0,paidMinutes:0,items:0,bonus:0,total:0,sales:0});
}
export const PAY_PARTS = {hours:'Hours + lab pay',commission:'Commissions + bonus',both:'All remaining pay'};
// Old vaults used one paidId. Read that as both components without rewriting
// their records or immutable payment snapshots.
export const paymentId = (day,part) => day.payments ? day.payments[part] : day.paidId;
// Update live unpaid days only. Report snapshots always keep their saved rule.
export function applyDatedBonusRules(data) {
  if(defaultBonusPolicy(data.settings)!=='dayton')return 0;
  let changed=0;
  for(const day of data.days) {
    if(day.date<DAYTON_BONUS_EFFECTIVE_DATE)continue;
    if(paymentId(day,'commission')||day.bonusPolicyAutomatic===false||day.bonusPolicy==='ifix')continue;
    if(day.bonusPolicy!==undefined&&day.bonusPolicy!=='legacy'&&day.bonusPolicyAutomatic!==true)continue;
    const policy=datedDaytonPolicy(day.date);
    if(day.bonusPolicy!==policy){day.bonusPolicy=policy;day.bonusPolicyAutomatic=true;changed++;}
  }
  return changed;
}
export function applySheetBonusPolicies(data,policies) {
  if(!Array.isArray(policies)||policies.length>data.days.length)throw Error('Invalid sheet bonus rules.');
  const seen=new Set();
  for(const entry of policies) {
    const day=data.days.find(d=>d.id===entry?.id);
    if(!day||seen.has(entry.id)||paymentId(day,'commission')||day.bonusPolicyAutomatic!==true||!['dayton','ifix','legacy'].includes(entry.bonusPolicy))throw Error('Invalid sheet bonus rule correction.');
    seen.add(entry.id);day.bonusPolicy=entry.bonusPolicy;day.bonusPolicyAutomatic=false;
  }
}
export const hasPayment = day => !!(paymentId(day,'hours') || paymentId(day,'commission'));
function componentTotals(day,allocation,now=null) {
  const t=totals(day,now);
  if(!allocation.hours)for(const key of ['minutes','wages','labDropoffs','labPickups','labMinutes','labPay','paidMinutes'])t[key]=0;
  if(!allocation.commission){t.items=0;t.bonus=0;}
  t.total=t.wages+t.labPay+t.items+t.bonus;return t;
}
export const unpaidTotals = (day,now=null) => componentTotals(day,{hours:!paymentId(day,'hours'),commission:!paymentId(day,'commission')},now);
export const isFullyPaid = day => hasPayment(day) && unpaidTotals(day).total===0;
export function sumUnpaid(days) {
  return days.reduce((sum,day)=>{const t=unpaidTotals(day);for(const key of Object.keys(t))sum[key]+=t[key];return sum;},sumDays([]));
}
export function paymentAllocations(days,part='both') {
  if(!Object.hasOwn(PAY_PARTS,part))throw Error('Choose hours, commissions, or all remaining pay.');
  return days.map(day=>({dayId:day.id,hours:part!=='commission'&&!paymentId(day,'hours'),commission:part!=='hours'&&!paymentId(day,'commission')}))
    .filter(a=>a.hours||a.commission);
}
export function reportDayTotals(report,day) {
  const a=report.allocations?.find(a=>a.dayId===day.id);
  return report.allocations ? componentTotals(day,a||{hours:false,commission:false}) : totals(day);
}
export function reportTotals(report) {
  return report.days.reduce((sum,day)=>{const t=reportDayTotals(report,day);for(const key of Object.keys(t))sum[key]+=t[key];return sum;},sumDays([]));
}
function setPayment(day,part,id) {
  if(!day.payments)day.payments={hours:day.paidId,commission:day.paidId};
  day.payments[part]=id;
  day.paidId=day.payments.hours===day.payments.commission?day.payments.hours:null;
}
function integer(n,max=100000000) { return Number.isSafeInteger(n) && n>=0 && n<=max; }
function validId(id) {return typeof id==='string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id);}
function validRates(r) { return r && ['hour',...TYPES.map(([k])=>k)].every(k=>integer(r[k],1000000)); }
export const COMPANY_METHODS = {cash:'Cash',card:'My credit card',transfer:'Bank transfer',other:'Other'};
function checkCompanyEntry(entry) {
  if(!entry || !validId(entry.id) || typeof entry.date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) ||
     !Number.isFinite(Date.parse(entry.date+'T12:00:00Z')) ||
     new Date(entry.date+'T12:00:00Z').toISOString().slice(0,10)!==entry.date ||
     !['advance','repayment'].includes(entry.type) || typeof entry.method!=='string' || !Object.hasOwn(COMPANY_METHODS,entry.method) ||
     !integer(entry.amount) || entry.amount===0 || typeof entry.note!=='string' || entry.note.length>1000)
    throw Error('Check the company entry: choose a date, payment method, and amount greater than zero.');
}
// Company borrowing is independent of workdays and payment reports. Missing
// companyLedger is an older vault with no borrowing records; no migration needed.
export function companyBalance(data) {
  let advanced=0,repaid=0;
  for(const entry of data.companyLedger??[]) {
    if(entry.type==='advance')advanced+=entry.amount;else repaid+=entry.amount;
  }
  return {advanced,repaid,balance:advanced-repaid};
}
export function upsertCompanyEntry(data,entry) {
  checkCompanyEntry(entry);
  const entries=data.companyLedger??[],index=entries.findIndex(e=>e.id===entry.id);
  if(index<0 && entries.length>=10000)throw Error('The company notebook has reached its entry limit.');
  const copy=structuredClone(entry);
  if(index<0)entries.push(copy);else entries[index]=copy;
  data.companyLedger=entries;
}
export function deleteCompanyEntry(data,id) {
  if(!(data.companyLedger??[]).some(e=>e.id===id))throw Error('This company entry could not be found.');
  data.companyLedger=data.companyLedger.filter(e=>e.id!==id);
}
export function companyReportText(data) {
  const t=companyBalance(data);
  return ['COMPANY MONEY NOTE',data.settings.name,'Separate from wages and commissions.','',
    'Paid for the company: '+money(t.advanced),'Paid back to me: '+money(t.repaid),
    (t.balance<0?'Company credit: ':'Company owes me: ')+money(Math.abs(t.balance)),'',
    ...[...(data.companyLedger??[])].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>
      e.date+' | '+(e.type==='advance'?'Paid for company +':'Paid back −')+money(e.amount)+' | '+
      COMPANY_METHODS[e.method]+(e.note?' | '+e.note:''))].join('\n');
}
function checkDay(d) {
  if (!d || !validId(d.id) || !/^\d{4}-\d{2}-\d{2}$/.test(d.date) ||
      !Number.isFinite(Date.parse(d.date+'T12:00:00Z')) ||
      new Date(d.date+'T12:00:00Z').toISOString().slice(0,10)!==d.date ||
      !integer(d.sales) || !validRates(d.rates) || !d.counts ||
      !TYPES.every(([k])=>integer(d.counts[k],100000)) ||
      typeof d.note!=='string' || d.note.length>4000 || !Array.isArray(d.shifts) ||
      d.shifts.length>100 || !(d.paidId===null || validId(d.paidId))) throw Error('Invalid daily record.');
  if (d.labTrips !== undefined && (!d.labTrips || typeof d.labTrips!=='object' || Array.isArray(d.labTrips) ||
      !LAB_TYPES.every(([k])=>integer(d.labTrips[k],100000)))) throw Error('Lab trips must be whole, non-negative counts.');
  if(d.bonusPolicy!==undefined&&(typeof d.bonusPolicy!=='string'||!Object.hasOwn(BONUS_POLICIES,d.bonusPolicy)))throw Error('Invalid sales bonus rule.');
  if(d.bonusPolicyAutomatic!==undefined&&typeof d.bonusPolicyAutomatic!=='boolean')throw Error('Invalid sales bonus rule source.');
  const ids=new Set();
  for (const s of d.shifts) {
    const start=Date.parse(s.start),end=s.end===null?null:Date.parse(s.end);
    if (!validId(s.id) || ids.has(s.id) || !Number.isFinite(start) ||
        (end!==null && (!Number.isFinite(end) || end<start)) || !integer(s.breakMinutes,14400) ||
        (end!==null && s.breakMinutes>Math.floor((end-start)/60000))) throw Error('Check shift times and unpaid breaks.');
    ids.add(s.id);
  }
  if(d.payments!==undefined && (!d.payments || typeof d.payments!=='object' || Array.isArray(d.payments) ||
      !['hours','commission'].every(k=>d.payments[k]===null||validId(d.payments[k]))))throw Error('Invalid component payment records.');
  if(hasPayment(d) && running(d)) throw Error('A paid day cannot have a running shift.');
}
export function validateLedger(data) {
  if (!data || data.schema!==1 || !data.settings || typeof data.settings.name!=='string' ||
      typeof data.settings.shop!=='string' || data.settings.name.length>120 || data.settings.shop.length>120 ||
      !validRates(data.settings.rates) || !Array.isArray(data.days) || !Array.isArray(data.reports) ||
      data.days.length>20000 || data.reports.length>10000) throw Error('This is not a supported work ledger.');
  if(data.settings.bonusPolicy!==undefined&&(typeof data.settings.bonusPolicy!=='string'||!Object.hasOwn(BONUS_POLICIES,data.settings.bonusPolicy)))throw Error('Invalid default sales bonus rule.');
  if(data.companyLedger!==undefined) {
    if(!Array.isArray(data.companyLedger)||data.companyLedger.length>10000)throw Error('Invalid company notebook.');
    const companyIds=new Set();
    for(const entry of data.companyLedger) {
      checkCompanyEntry(entry);
      if(companyIds.has(entry.id))throw Error('Duplicate company notebook entry.');
      companyIds.add(entry.id);
    }
  }
  const ids=new Set(),dates=new Set(),spans=[];let open=0;
  for(const d of data.days) {
    checkDay(d);
    if(ids.has(d.id)||dates.has(d.date)) throw Error('Only one work record is allowed per date.');
    ids.add(d.id);dates.add(d.date);
    for(const s of d.shifts) {if(s.end===null) open++;spans.push([Date.parse(s.start),s.end===null?Infinity:Date.parse(s.end)]);}
  }
  if(open>1) throw Error('Close the running shift before starting another.');
  spans.sort((a,b)=>a[0]-b[0]);
  for(let i=1;i<spans.length;i++) if(spans[i][0]<spans[i-1][1]) throw Error('Shift times overlap. Please correct them.');
  const reports=new Map();
  for(const r of data.reports) {
    if(!r || !validId(r.id)||reports.has(r.id)||!['paid','reopened'].includes(r.status)||
       typeof r.label!=='string'||r.label.length>120||!Number.isFinite(Date.parse(r.paidAt))||
       typeof r.name!=='string'||typeof r.shop!=='string'||!Array.isArray(r.days)||!r.days.length) throw Error('Invalid saved report.');
    r.days.forEach(checkDay);
    if(r.part!==undefined&&!Object.hasOwn(PAY_PARTS,r.part))throw Error('Invalid payment type.');
    if(r.allocations!==undefined) {
      const allocated=new Set();
      if(!Array.isArray(r.allocations)||r.allocations.length!==r.days.length)throw Error('Invalid payment allocation.');
      for(const a of r.allocations) {
        if(!a||!r.days.some(d=>d.id===a.dayId)||allocated.has(a.dayId)||typeof a.hours!=='boolean'||typeof a.commission!=='boolean'||!a.hours&&!a.commission)throw Error('Invalid payment allocation.');
        allocated.add(a.dayId);
      }
    }
    if(r.total!==reportTotals(r).total || r.days.some(running)) throw Error('A report has invalid totals or unfinished shifts.');
    reports.set(r.id,r);
  }
  for(const d of data.days)for(const part of ['hours','commission']) {
    const id=paymentId(d,part);if(!id)continue;
    const report=reports.get(id),snapshot=report?.days.find(x=>x.id===d.id);
    if(report?.status!=='paid'||!snapshot||report.allocations&&!report.allocations.some(a=>a.dayId===d.id&&a[part]))throw Error('A paid component must belong to its paid report.');
    const before=totals(snapshot),after=totals(d),keys=part==='hours'?['wages','labPay','minutes','labMinutes']:['items','bonus','sales'];
    if(keys.some(k=>before[k]!==after[k]))throw Error('Reopen the payment before changing paid work.');
  }
  return data;
}
export function markPaid(data, selected, label, now=new Date().toISOString(),part='both') {
  const ids=new Set(selected),days=data.days.filter(d=>ids.has(d.id));
  if(!days.length || days.length!==ids.size || days.some(d=>isFullyPaid(d)||running(d))) throw Error('Select unpaid days with completed shifts.');
  const allocations=paymentAllocations(days,part),included=days.filter(d=>allocations.some(a=>a.dayId===d.id));
  const report={id:uid(),paidAt:now,label:label.trim()||'Payment',status:'paid',part,name:data.settings.name,shop:data.settings.shop,days:structuredClone(included),allocations};
  report.total=reportTotals(report).total;
  if(report.total<=0)throw Error('There is no unpaid amount for this payment type.');
  data.reports.push(report);
  for(const a of allocations)for(const key of ['hours','commission'])if(a[key])setPayment(days.find(d=>d.id===a.dayId),key,report.id);
  return report;
}
export function reopenReport(data,id) {
  const r=data.reports.find(x=>x.id===id);
  if(!r || r.status!=='paid') throw Error('This report has already been reopened.');
  const selected=[];
  for(const d of data.days) {
    let changed=false;
    for(const part of ['hours','commission'])if(paymentId(d,part)===id){setPayment(d,part,null);changed=true;}
    if(changed)selected.push(d.id);
  }
  r.status='reopened';
  return selected;
}
export function reportText(report) {
  const t=reportTotals(report);
  return [
    'WORK & COMMISSION REPORT',
    report.name+(report.shop?' • '+report.shop:''),
    report.label,
    PAY_PARTS[report.part||'both'],
    report.status==='paid'?'PAID • '+new Date(report.paidAt).toLocaleDateString():report.status==='reopened'?'REOPENED • Original payment snapshot':'UNPAID • Amount requested',
    '',
    ...report.days.map(d=>{
      const v=reportDayTotals(report,d);
      return d.date+' | '+duration(v.minutes)+' | Sales '+money(d.sales)+' | Pay '+money(v.total)+'\n'+
        '  Wages '+money(v.wages)+'; items '+money(v.items)+'; bonus '+money(v.bonus)+'\n'+
        '  '+TYPES.map(([k,label])=>label+': '+d.counts[k]).join(', ')+
        (v.labMinutes?'\n  Soldering lab: drop-offs '+v.labDropoffs+', pickups '+v.labPickups+' | Extra paid time '+duration(v.labMinutes)+' | Lab pay '+money(v.labPay):'')+
        (d.note?'\n  Note: '+d.note:'');
    }),
    '',
    (t.labMinutes?'Shift hours: ':'Hours: ')+duration(t.minutes),
    'Hourly pay: '+money(t.wages),
    ...(t.labMinutes?['Lab drop-offs: '+t.labDropoffs+'; pickups: '+t.labPickups,'Lab extra paid time: '+duration(t.labMinutes),'Lab extra pay: '+money(t.labPay),'Total paid time: '+duration(t.paidMinutes)]:[]),
    'Item commissions: '+money(t.items),
    'Daily sales bonuses: '+money(t.bonus),
    'TOTAL: '+money(t.total),
    '',
    ...[...new Set(report.days.map(dayBonusPolicy))].map(bonusRuleText),
    'Laptop / console repairs use their own rate; they are not also counted as phone repairs.',
    ...(t.labMinutes?['Each soldering lab drop-off or pickup adds 30 paid minutes at that workday’s hourly rate.']:[])
  ].join('\n');
}
function csvCell(value) {
  let s=String(value??''); if(/^[\s]*[=+\-@]/.test(s)) s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
}
export function reportCSV(r) {
  const rows=[
    ['Worker',r.name,'Shop',r.shop],
    ['Report',r.label,'Status',r.status,'Payment date',r.paidAt||''],
    ['Date','Shift minutes','Shift hours','Sales $','Hourly rate $','Hourly pay $',...TYPES.map(([,l])=>l),...TYPES.map(([,l])=>l+' rate $'),'Item commission $','Sales bonus $','Total pay $','Notes','Lab drop-offs','Lab pickups','Lab extra minutes','Lab extra pay $','Total paid minutes','Total paid hours','Sales bonus rule'],
    ...r.days.map(d=>{const t=reportDayTotals(r,d);return [d.date,t.minutes,(t.minutes/60).toFixed(2),(d.sales/100).toFixed(2),(d.rates.hour/100).toFixed(2),(t.wages/100).toFixed(2),...TYPES.map(([k])=>d.counts[k]),...TYPES.map(([k])=>(d.rates[k]/100).toFixed(2)),(t.items/100).toFixed(2),(t.bonus/100).toFixed(2),(t.total/100).toFixed(2),d.note,t.labDropoffs,t.labPickups,t.labMinutes,(t.labPay/100).toFixed(2),t.paidMinutes,(t.paidMinutes/60).toFixed(2),bonusRuleText(dayBonusPolicy(d))];}),
    [],
    ['Total pay $',(reportTotals(r).total/100).toFixed(2)],
    [],
    ['Shift date','Start (ISO)','End (ISO)','Unpaid break minutes'],
    ...r.days.flatMap(d=>d.shifts.map(s=>[d.date,s.start,s.end,s.breakMinutes]))
  ];
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
