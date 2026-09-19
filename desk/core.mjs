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
export const bonus = sales => sales > 150000 ? 2000 : sales > 100000 ? 1000 : sales > 50000 ? 500 : 0;
export const duration = minutes => Math.floor(minutes/60) + 'h ' + (minutes%60) + 'm';
export function emptyLedger() {
  return {schema:1, settings:{name:'Rahat',shop:'',rates:{...DEFAULT_RATES}},days:[],reports:[]};
}
export function newDay(date, rates) {
  return {id:uid(),date,sales:0,counts:Object.fromEntries(TYPES.map(([k])=>[k,0])),labTrips:{dropoff:0,pickup:0},rates:{...rates},note:'',shifts:[],paidId:null};
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
  const salesBonus = bonus(day.sales);
  return {minutes,wages,labDropoffs,labPickups,labMinutes,labPay,paidMinutes,items,bonus:salesBonus,total:wages+labPay+items+salesBonus,sales:day.sales};
}
export function sumDays(days, now=null) {
  return days.reduce((sum,d) => {
    const t=totals(d,now); for(const k of Object.keys(t)) sum[k]+=t[k]; return sum;
  }, {minutes:0,wages:0,labDropoffs:0,labPickups:0,labMinutes:0,labPay:0,paidMinutes:0,items:0,bonus:0,total:0,sales:0});
}
function integer(n,max=100000000) { return Number.isSafeInteger(n) && n>=0 && n<=max; }
function validId(id) {return typeof id==='string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id);}
function validRates(r) { return r && ['hour',...TYPES.map(([k])=>k)].every(k=>integer(r[k],1000000)); }
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
  const ids=new Set();
  for (const s of d.shifts) {
    const start=Date.parse(s.start),end=s.end===null?null:Date.parse(s.end);
    if (!validId(s.id) || ids.has(s.id) || !Number.isFinite(start) ||
        (end!==null && (!Number.isFinite(end) || end<start)) || !integer(s.breakMinutes,14400) ||
        (end!==null && s.breakMinutes>Math.floor((end-start)/60000))) throw Error('Check shift times and unpaid breaks.');
    ids.add(s.id);
  }
  if(d.paidId && running(d)) throw Error('A paid day cannot have a running shift.');
}
export function validateLedger(data) {
  if (!data || data.schema!==1 || !data.settings || typeof data.settings.name!=='string' ||
      typeof data.settings.shop!=='string' || data.settings.name.length>120 || data.settings.shop.length>120 ||
      !validRates(data.settings.rates) || !Array.isArray(data.days) || !Array.isArray(data.reports) ||
      data.days.length>20000 || data.reports.length>10000) throw Error('This is not a supported work ledger.');
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
    if(r.total!==sumDays(r.days).total || r.days.some(running)) throw Error('A report has invalid totals or unfinished shifts.');
    reports.set(r.id,r);
  }
  for(const d of data.days) if(d.paidId && (reports.get(d.paidId)?.status!=='paid' || !reports.get(d.paidId).days.some(x=>x.id===d.id))) throw Error('A paid day must belong to a paid report.');
  return data;
}
export function markPaid(data, selected, label, now=new Date().toISOString()) {
  const ids=new Set(selected),days=data.days.filter(d=>ids.has(d.id));
  if(!days.length || days.length!==ids.size || days.some(d=>d.paidId||running(d))) throw Error('Select unpaid days with completed shifts.');
  const report={id:uid(),paidAt:now,label:label.trim()||'Payment',status:'paid',name:data.settings.name,shop:data.settings.shop,days:structuredClone(days),total:sumDays(days).total};
  data.reports.push(report);
  days.forEach(d=>d.paidId=report.id);
  return report;
}
export function reopenReport(data,id) {
  const r=data.reports.find(x=>x.id===id);
  if(!r || r.status!=='paid') throw Error('This report has already been reopened.');
  const selected=[];
  for(const d of data.days) if(d.paidId===id) { d.paidId=null; selected.push(d.id); }
  r.status='reopened';
  return selected;
}
export function reportText(report) {
  const t=sumDays(report.days);
  return [
    'WORK & COMMISSION REPORT',
    report.name+(report.shop?' • '+report.shop:''),
    report.label,
    report.status==='paid'?'PAID • '+new Date(report.paidAt).toLocaleDateString():report.status==='reopened'?'REOPENED • Original payment snapshot':'UNPAID • Amount requested',
    '',
    ...report.days.map(d=>{
      const v=totals(d);
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
    'Daily bonus: over $500 = $5; over $1,000 = $10; over $1,500 = $20. Highest tier only.',
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
    ['Date','Shift minutes','Shift hours','Sales $','Hourly rate $','Hourly pay $',...TYPES.map(([,l])=>l),...TYPES.map(([,l])=>l+' rate $'),'Item commission $','Sales bonus $','Total pay $','Notes','Lab drop-offs','Lab pickups','Lab extra minutes','Lab extra pay $','Total paid minutes','Total paid hours'],
    ...r.days.map(d=>{const t=totals(d);return [d.date,t.minutes,(t.minutes/60).toFixed(2),(d.sales/100).toFixed(2),(d.rates.hour/100).toFixed(2),(t.wages/100).toFixed(2),...TYPES.map(([k])=>d.counts[k]),...TYPES.map(([k])=>(d.rates[k]/100).toFixed(2)),(t.items/100).toFixed(2),(t.bonus/100).toFixed(2),(t.total/100).toFixed(2),d.note,t.labDropoffs,t.labPickups,t.labMinutes,(t.labPay/100).toFixed(2),t.paidMinutes,(t.paidMinutes/60).toFixed(2)];}),
    [],
    ['Total pay $',(sumDays(r.days).total/100).toFixed(2)],
    [],
    ['Shift date','Start (ISO)','End (ISO)','Unpaid break minutes'],
    ...r.days.flatMap(d=>d.shifts.map(s=>[d.date,s.start,s.end,s.breakMinutes]))
  ];
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
