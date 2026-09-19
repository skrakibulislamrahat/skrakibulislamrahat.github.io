import {TYPES,LAB_TYPES,LAB_MINUTES,DEFAULT_RATES,money,uid,localDate,duration,emptyLedger,newDay,totals,sumDays,running,validateLedger,markPaid,reopenReport,reportText,reportCSV,COMPANY_METHODS,companyBalance,upsertCompanyEntry,deleteCompanyEntry,companyReportText} from './core.mjs?v=6';
import {open,seal,wrap,newCipher} from './crypto.mjs';
import {GitHubVault,OWNER} from './github.mjs?v=2';

const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORE='private-desk.connection.v1';
let data=null,api=null,cipher=null,sha=null,busy=false,dirty=false,view='today',date=localDate(),selected=new Set(),displayedDay=null,editingDay=null,currentReport=null,lastActivity=Date.now();
let noticeTimer;

function notice(message,error=false) {
  clearTimeout(noticeTimer);$('#notice-text').textContent=message;$('#notice').classList.toggle('error',error);$('#notice').hidden=false;
  if(!error) noticeTimer=setTimeout(()=>$('#notice').hidden=true,6500);
}
function setBusy(value,label='Saving to private GitHub…') {
  busy=value;document.body.classList.toggle('busy',value);
  for(const el of $$('button,input,textarea,select')) {
    if(value) {el.dataset.previousDisabled=String(el.disabled);el.disabled=true;}
    else if('previousDisabled' in el.dataset) {el.disabled=el.dataset.previousDisabled==='true';delete el.dataset.previousDisabled;}
  }
  if($('#sync-status')) $('#sync-status').textContent=value?label:'Saved to private GitHub';
}
function storedConnection() {try{return localStorage.getItem(STORE);}catch{return null;}}
function showGate(connection=false) {
  $('#workspace').hidden=true;$('#gate').hidden=false;
  const saved=storedConnection();
  $('#unlock-form').hidden=connection||!saved;$('#connect-form').hidden=!connection&&!!saved;
  if(connection||!saved) $('#password').focus();else $('#unlock-password').focus();
}
function lock() {
  if(busy) return;
  api?.clear();api=null;data=null;cipher=null;sha=null;selected.clear();dirty=false;editingDay=null;displayedDay=null;currentReport=null;
  $('#modal').close();$('#modal-content').replaceChildren();$('#main').replaceChildren();$('#print-report').replaceChildren();
  $('#unlock-form').reset();$('#connect-form').reset();$('#confirm-wrap').hidden=true;$('#confirm-password').required=false;
  $('#token').value='';$('#password').value='';$('#unlock-password').value='';$('#notice').hidden=true;
  document.title='Private desk';document.dispatchEvent(new Event('desk:lock'));showGate();
}
function showWorkspace() {
  $('#gate').hidden=true;$('#workspace').hidden=false;$('#token').value='';$('#password').value='';$('#confirm-password').value='';$('#unlock-password').value='';
  $('#connection-label').textContent=OWNER+'/'+api.repo;lastActivity=Date.now();view='today';date=localDate();selected.clear();document.dispatchEvent(new Event('desk:unlock'));render();
}
async function connect(form,saved=false) {
  if(busy)return;const fields=new FormData(form);setBusy(true,'Opening your encrypted desk…');
  let candidate;
  try {
    const password=fields.get('password');
    let repo,token,remember,create=false;
    if(saved) {
      const result=await open(JSON.parse(storedConnection()),password,'connection');
      ({repo,token}=result.value);remember=true;
    } else {
      repo=String(fields.get('repo')).trim();token=String(fields.get('token')).trim();remember=fields.has('remember');create=fields.has('create');
      if(create && (password.length<12||password!==fields.get('confirm'))) throw Error('Use at least 12 characters and make sure both passwords match.');
    }
    candidate=new GitHubVault(repo,token);
    const remote=await candidate.read();
    let unlocked,nextSha;
    if(remote) {
      if(create) throw Error('This repository already has a vault. Uncheck “Create a new vault” and enter its existing password.');
      unlocked=await open(remote.envelope,password);validateLedger(unlocked.value);nextSha=remote.sha;
    } else {
      if(!create) throw Error('No vault exists in this repository yet. Check “Create a new vault” to start.');
      unlocked={value:emptyLedger(),cipher:await newCipher(password)};
      nextSha=await candidate.write(await seal(unlocked.value,unlocked.cipher),null);
    }
    let remembered=true;
    try {
      if(remember) localStorage.setItem(STORE,JSON.stringify(await wrap({repo,token},password,'connection')));
      else localStorage.removeItem(STORE);
    } catch {remembered=false;}
    api=candidate;data=unlocked.value;cipher=unlocked.cipher;sha=nextSha;
    setBusy(false);showWorkspace();
    if(!remembered) notice('Desk opened. Your browser could not remember the connection; keep your token to reconnect.',true);
  } catch(error) {candidate?.clear();setBusy(false);notice(error.message,true);}
}
async function commit(change,{close=false,message='Saved to your private GitHub.'}={}) {
  if(busy||!data)return false;setBusy(true);
  try {
    const next=structuredClone(data);change(next);validateLedger(next);
    const nextSha=await api.write(await seal(next,cipher),sha);
    data=next;sha=nextSha;dirty=false;
    if(close){$('#modal').close();editingDay=null;}
    setBusy(false);render();notice(message);return true;
  } catch(error){setBusy(false);$('#sync-status').textContent='Save not confirmed • refresh to check';notice(error.message,true);return false;}
}
async function refresh() {
  if(busy||!data)return;
  if(dirty&&!confirm('Discard unsaved form changes and load the latest saved records?'))return;
  setBusy(true,'Checking private GitHub…');
  try {
    const remote=await api.read();if(!remote)throw Error('The vault is missing from GitHub. Current records remain open; download a backup.');
    // The salt is fixed for this vault. A different salt means it was replaced.
    if(remote.envelope.salt!==cipher.salt)throw Error('This vault was replaced or its password changed. Lock and unlock again.');
    const raw=await decryptCurrent(remote.envelope);
    data=validateLedger(raw);sha=remote.sha;dirty=false;$('#modal').close();editingDay=null;
    setBusy(false);render();notice('Latest records loaded.');
  } catch(e){setBusy(false);$('#sync-status').textContent='Could not refresh';notice(e.message,true);}
}
async function decryptCurrent(envelope) {
  const {unbase64}=await import('./crypto.mjs');
  if(envelope.format!=='private-desk'||envelope.version!==1||envelope.purpose!=='ledger'||envelope.salt!==cipher.salt)throw Error('Unsupported vault. Lock and reopen to check it.');
  try {
    const value=await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(envelope.iv),additionalData:new TextEncoder().encode('rahat-private-desk:ledger')},cipher.key,unbase64(envelope.ciphertext));
    return JSON.parse(new TextDecoder().decode(value));
  } catch {throw Error('Could not decrypt the current GitHub file. Lock and reopen to check it.');}
}
function abandon() {return !dirty || confirm('Discard your unsaved form changes?');}
function go(next) {if(busy||!abandon())return;dirty=false;view=next;render();$('#main').focus();}
function dayTitle(d) {return new Date(d+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});}
function rateFields(rates) {
  return '<div class="rate-grid">'+[['hour','Hourly pay'],...TYPES.map(([k,l])=>[k,l])].map(([k,l])=>'<div><label for="rate-'+k+'">'+esc(l)+' ($)</label><input id="rate-'+k+'" name="rate_'+k+'" type="number" min="0" max="10000" step="0.01" required value="'+(rates[k]/100).toFixed(2)+'"></div>').join('')+'</div>';
}
function deviceIcon(type='repair') {
  const shapes={
    repair:'<rect x="9" y="3" width="14" height="26" rx="3"/><path d="M14 6h4M15 25h2M18 10l-5 7h6l-3 5"/>',
    case:'<rect x="7" y="2" width="18" height="28" rx="5"/><rect x="10" y="5" width="5" height="7" rx="2"/><path d="M11 26h10"/>',
    other:'<path d="M6 18v-3a10 10 0 0 1 20 0v3"/><rect x="4" y="16" width="6" height="11" rx="3"/><rect x="22" y="16" width="6" height="11" rx="3"/>',
    device:'<rect x="9" y="3" width="14" height="26" rx="3"/><path d="M14 6h4M15 25h2M12 16l3 3 6-7"/>',
    computer:'<rect x="5" y="5" width="22" height="17" rx="2"/><path d="M5 22l-3 5h28l-3-5M13 24h6"/>',
    tablet:'<rect x="5" y="2" width="22" height="28" rx="3"/><path d="M14 26h4"/>'
  };
  return '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true">'+(shapes[type]||shapes.repair)+'</svg>';
}
function counters(day,prefix,tiles=false) {
  const rows=TYPES.map(([k,l])=>'<div class="'+(tiles?'counter-tile':'counter-row')+'">'+(tiles?'<span class="item-icon">'+deviceIcon(k)+'</span>':'')+'<label class="counter-title" for="'+prefix+k+'">'+l+'<small>'+money(day.rates[k])+' each</small></label><div class="stepper"><button type="button" data-step="-1" data-target="'+prefix+k+'" aria-label="Remove one '+l.toLowerCase()+'">−</button><input id="'+prefix+k+'" name="count_'+k+'" type="number" min="0" max="100000" step="1" inputmode="numeric" value="'+day.counts[k]+'" required aria-label="'+l+' count"><button type="button" data-step="1" data-target="'+prefix+k+'" aria-label="Add one '+l.toLowerCase()+'">+</button></div></div>').join('');
  return tiles?'<div class="counter-grid">'+rows+'</div>':rows;
}
function labCounters(day,prefix) {
  return '<section class="lab-trips"><hr class="rule"><div class="section-row"><h3>Soldering lab trips</h3><span class="pill">Extra paid time</span></div><p class="hint">Each drop-off or pickup adds 30 minutes of salary at this workday’s hourly rate. Count each trip once.</p>'+LAB_TYPES.map(([key,label])=>{
    const id=prefix+'lab-'+key;
    return '<div class="counter-row"><label class="counter-title" for="'+id+'">'+label+'<small>+ '+LAB_MINUTES+' paid minutes each</small></label><div class="stepper"><button type="button" data-step="-1" data-target="'+id+'" aria-label="Remove one '+label.toLowerCase()+'">−</button><input id="'+id+'" name="lab_'+key+'" type="number" min="0" max="100000" step="1" inputmode="numeric" value="'+(day.labTrips?.[key]??0)+'" required aria-label="'+label+' count"><button type="button" data-step="1" data-target="'+id+'" aria-label="Add one '+label.toLowerCase()+'">+</button></div></div>';
  }).join('')+'</section>';
}
function breakdown(t) {
  return '<div class="breakdown"><div><span>Hourly pay · '+duration(t.minutes)+'</span><strong>'+money(t.wages)+'</strong></div><div><span>Lab trips · '+duration(t.labMinutes)+' extra</span><strong>'+money(t.labPay)+'</strong></div><div><span>Item commissions</span><strong>'+money(t.items)+'</strong></div><div><span>Daily sales bonus</span><strong>'+money(t.bonus)+'</strong></div></div>';
}
function render() {
  if(!data)return;
  $('#unpaid-count').textContent=data.days.filter(d=>!d.paidId).length;
  for(const b of $$('[data-view]')) {if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
  selected=new Set([...selected].filter(id=>data.days.some(d=>d.id===id&&!d.paidId&&!running(d))));
  const renderers={today:renderToday,unpaid:renderUnpaid,history:renderHistory,settings:renderSettings};
  $('#main').innerHTML=renderers[view]();document.title='Private desk';document.dispatchEvent(new CustomEvent('desk:render',{detail:{view}}));
}
function earningsRing(t) {
  const values=[t.wages,t.labPay,t.items,t.bonus],colors=['#c4f877','#78dcdf','#c3adff','#ffcc85'];
  let offset=0;
  return '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="39" fill="none" stroke="#ffffff10" stroke-width="6"/>'+values.map((value,i)=>{
    const length=t.total?value/t.total*245.04:0;
    const circle='<circle cx="50" cy="50" r="39" fill="none" stroke="'+colors[i]+'" stroke-width="6" stroke-dasharray="'+Math.max(0,length-2).toFixed(3)+' 245.04" stroke-dashoffset="'+(-offset).toFixed(3)+'" transform="rotate(-90 50 50)"/>';offset+=length;return circle;
  }).join('')+'<path d="M50 32l5 13 13 5-13 5-5 13-5-13-13-5 13-5z" fill="none" stroke="#d6f4bd" stroke-width="1.2"/></svg>';
}
function salesMilestones(sales) {
  return [[50000,5],[100000,10],[150000,20]].map(([threshold,reward])=>'<div class="sales-tier '+(sales>threshold?'is-earned':'')+'"><span>'+ (sales>threshold?'✓ ':'')+'Over '+money(threshold).replace('.00','')+'</span><strong>+'+money(reward*100).replace('.00','')+'</strong></div>').join('');
}
function activityStrip() {
  const end=new Date(date+'T12:00:00');
  const days=Array.from({length:7},(_,i)=>{
    const at=new Date(end);at.setDate(end.getDate()-6+i);const key=localDate(at),record=data.days.find(d=>d.date===key);
    return {date:key,label:at.toLocaleDateString(undefined,{weekday:'short'}),total:record?totals(record).total:0};
  });
  const max=Math.max(1,...days.map(d=>d.total)),total=days.reduce((n,d)=>n+d.total,0);
  return '<section class="activity-strip"><div class="activity-heading"><p class="eyebrow">YOUR 7-DAY RHYTHM</p><strong>'+money(total)+'</strong><span>Saved earnings · tap a day</span></div><div class="activity-days">'+days.map(d=>'<button type="button" class="activity-day '+(d.date===date?'is-selected':'')+'" data-action="open-day" data-date="'+d.date+'" aria-label="Open '+d.date+', '+money(d.total)+' saved earnings"><span class="activity-amount">'+money(d.total).replace('.00','')+'</span><svg viewBox="0 0 64 34" preserveAspectRatio="none" aria-hidden="true"><rect x="9" y="'+(32-Math.max(2,d.total/max*30)).toFixed(2)+'" width="46" height="'+Math.max(2,d.total/max*30).toFixed(2)+'" rx="3"/></svg><span>'+d.label+'</span></button>').join('')+'</div></section>';
}
function renderCompanyNote() {
  const {balance}=companyBalance(data);
  return '<button type="button" class="company-sticky" data-action="company-notebook" aria-label="Open company money notebook. '+(balance<0?'Company credit':'Company owes me')+' '+money(Math.abs(balance))+'"><span class="sticky-label">'+(balance<0?'Company credit':'Company owes me')+'</span><strong>'+money(Math.abs(balance))+'</strong><span class="sticky-caption">Separate from my pay</span><span class="sticky-open">Open notebook <span aria-hidden="true">↗</span></span></button>';
}
function showCompanyNotebook(message='') {
  const t=companyBalance(data),entries=[...(data.companyLedger??[])].reverse().sort((a,b)=>b.date.localeCompare(a.date));
  const rows=entries.map(e=>'<li class="company-record"><span class="company-record-sign '+(e.type==='repayment'?'is-repayment':'')+'" aria-hidden="true">'+(e.type==='advance'?'+':'−')+'</span><div class="company-record-copy"><strong>'+esc(e.note||(e.type==='advance'?'Paid for company':'Company paid me back'))+'</strong><span>'+esc(dayTitle(e.date))+' · '+esc(COMPANY_METHODS[e.method])+'</span><small>'+(e.type==='advance'?'Paid for company':'Paid back to me')+'</small></div><div class="company-record-end"><strong>'+money(e.amount)+'</strong><button type="button" class="text-button" data-action="company-edit" data-id="'+esc(e.id)+'" aria-label="Edit '+esc(e.note||e.type)+' on '+esc(e.date)+'">Edit ↗</button></div></li>').join('');
  showModal('THE LITTLE MONEY NOTE','<section class="company-notebook"><div class="company-paper"><span class="company-paper-kicker">CASH, CARD & THE IN-BETWEEN</span><h2>'+(t.balance<0?'Company credit.':'Company owes me.')+'</h2><div class="company-paper-total">'+money(Math.abs(t.balance))+'</div><p>'+(t.balance<0?'Repayments are higher than the money recorded as given.':t.balance===0&&entries.length?'All square. Every little dollar accounted for.':'Your money, kept on its own little page.')+'</p><div class="company-paper-sums"><span>Paid for company<strong>'+money(t.advanced)+'</strong></span><span>Paid back to me<strong>'+money(t.repaid)+'</strong></span></div></div><p class="company-separation">Separate from wages, commissions and payday reports. Marking your work paid leaves this note as it is.</p><div class="company-quick-actions"><button type="button" class="primary" data-action="company-add" data-type="advance"><span aria-hidden="true">＋</span> I paid for company</button><button type="button" data-action="company-add" data-type="repayment"><span aria-hidden="true">−</span> They paid me back</button></div><p id="company-status" role="status" class="hint">'+esc(message)+'</p><div class="section-row company-history-heading"><h3>Your paper trail <span class="muted">· '+entries.length+'</span></h3>'+(entries.length?'<button type="button" class="quiet" data-action="company-copy">Copy summary ↗</button>':'')+'</div>'+(entries.length?'<ol class="company-records">'+rows+'</ol>':'<div class="company-empty"><span aria-hidden="true">✎</span><p>Bought parts? Lent some cash?<br>Add the amount and a little reminder.</p><small>Already owed money? Add it with the note “Previous balance”.</small></div>')+'</section>');
}
function editCompanyEntry(id=null,type='advance') {
  if(!abandon())return;
  const entry=id?(data.companyLedger??[]).find(e=>e.id===id):{id:uid(),type,date:localDate(),method:'cash',amount:0,note:''};
  if(!entry)throw Error('This company entry could not be found.');
  dirty=false;
  showModal('A LITTLE NOTE, NOTHING FORGOTTEN','<h2>'+(id?'Edit your money note.':'Add to your money note.')+'</h2><p class="muted company-form-intro">Track money from your own pocket and what comes back.</p><form id="company-form" data-id="'+esc(entry.id)+'"><label for="company-type">What happened?</label><select id="company-type" name="type"><option value="advance"'+(entry.type==='advance'?' selected':'')+'>I paid for the company</option><option value="repayment"'+(entry.type==='repayment'?' selected':'')+'>The company paid me back</option></select><div class="company-form-grid"><div><label for="company-amount">Amount ($)</label><input id="company-amount" name="amount" type="number" inputmode="decimal" min="0.01" max="1000000" step="0.01" required placeholder="0.00" value="'+(entry.amount?(entry.amount/100).toFixed(2):'')+'"></div><div><label for="company-date">Date</label><input id="company-date" name="date" type="date" required value="'+esc(entry.date)+'"></div></div><label for="company-method">How was it paid?</label><select id="company-method" name="method">'+Object.entries(COMPANY_METHODS).map(([value,label])=>'<option value="'+value+'"'+(entry.method===value?' selected':'')+'>'+label+'</option>').join('')+'</select><label for="company-note">A little reminder <span class="muted">(optional)</span></label><textarea id="company-note" name="note" maxlength="1000" placeholder="Parts order, supplier bill, previous balance…">'+esc(entry.note)+'</textarea><p id="company-error" class="company-error" role="alert" tabindex="-1" hidden></p><div class="modal-actions company-form-actions">'+(id?'<button type="button" class="danger" data-action="company-delete" data-id="'+esc(entry.id)+'">Delete</button>':'')+'<button type="button" data-action="company-notebook">Back</button><button type="submit" class="primary">Save note ↗</button></div></form>');
  $('#company-amount').focus();
}
function showCompanyError(message) {
  const error=$('#company-error');error.textContent=message;error.hidden=false;error.focus();
}
async function saveCompanyForm(form) {
  const f=new FormData(form);
  const entry={id:form.dataset.id,type:String(f.get('type')),date:String(f.get('date')),method:String(f.get('method')),amount:Math.round(Number(f.get('amount'))*100),note:String(f.get('note')).trim()};
  const ok=await commit(next=>upsertCompanyEntry(next,entry),{message:'Company money note saved.'});
  if(ok)showCompanyNotebook('Saved. Your company balance is up to date.');
  else showCompanyError($('#notice-text').textContent);
}
function renderToday() {
  displayedDay=data.days.find(d=>d.date===date)||newDay(date,data.settings.rates);
  const day=displayedDay,t=totals(day,Date.now()),active=data.days.find(running),isToday=date===localDate();
  const unpaid=data.days.filter(d=>!d.paidId),owed=sumDays(unpaid),saved=data.days.some(d=>d.id===day.id);
  const clockText=active?'Clock out':isToday?'Clock in':'Add a shift';
  let html='<div class="page-head workbench-heading"><div><p class="eyebrow"><span class="status-dot" aria-hidden="true"></span> A LITTLE FOCUS. A LOT OF POSSIBILITY.</p><h1>'+ (isToday?'Your day, in focus.':'Your workday, in focus.')+'</h1><p class="muted">'+esc(dayTitle(date))+' <span class="heading-divider">/</span> Every hour. Every little win.</p></div><div class="workbench-tools"><div class="date-control"><label for="day-date">Choose your work date</label><input id="day-date" type="date" value="'+date+'" required></div>'+renderCompanyNote()+'</div></div>';
  if(day.paidId) return html+'<div class="panel empty"><span class="empty-icon" aria-hidden="true">✓</span><h2>This day is already paid.</h2><p>It is safely stored in your payment history. Reopen its payment report if a correction is needed.</p><button data-action="report" data-id="'+day.paidId+'">View payment</button></div>'+activityStrip();
  html+='<div class="overview-grid"><section class="panel earnings-panel"><div class="section-row"><p class="eyebrow">'+(isToday?'TODAY’S EARNINGS':'THIS DAY’S EARNINGS')+'</p><span class="pill" id="day-state">'+(running(day)?'Live estimate':saved?'Saved entry':'New day')+'</span></div><div class="earnings-main"><div><div class="amount-big" id="day-total">'+money(t.total)+'</div><p class="earnings-caption"><span id="paid-time">'+duration(t.paidMinutes)+'</span> paid time <span>including lab credit</span></p></div><div id="pay-orbit" class="pay-orbit">'+earningsRing(t)+'</div></div><div id="day-breakdown">'+breakdown(t)+'</div><p class="pay-footnote">Gross pay before deductions'+(running(day)?' · includes your running shift':'')+'</p></section>';
  html+='<section class="panel clock-panel '+(active?'is-running':'')+'"><div class="clock-copy"><p class="eyebrow">'+(active?'SHIFT IN PROGRESS':'YOUR SHIFT')+'</p><div class="clock-amount" id="clock-time">'+duration(t.minutes)+'</div><p class="clock-caption">'+(active?'Active shift: '+esc(dayTitle(active.date)):'Your time on the bench. Breaks deducted.')+'</p></div><button class="device-cluster" type="button" data-device-rain aria-label="Make it rain phones, tablets and laptops" title="Tap for a little tech storm"><span class="cluster-laptop">'+deviceIcon('computer')+'</span><span class="cluster-tablet">'+deviceIcon('tablet')+'</span><span class="cluster-phone">'+deviceIcon('device')+'</span><span class="cluster-orbit"></span></button><div class="clock-actions"><button class="primary" data-action="'+(active?'clock-out':isToday?'clock-in':'edit-day')+'" data-id="'+day.id+'">'+clockText+' '+(active?'■':'→')+'</button>'+(isToday||active?'<button class="quiet manual-hours" data-action="edit-day" data-id="'+day.id+'">Enter hours</button>':'')+'</div><span class="clock-action-hint">Choose a past date above to catch up.</span></section>';
  html+='<section class="panel balance-panel"><p class="eyebrow">READY FOR PAYDAY</p><div class="balance-amount">'+money(owed.total)+'</div><p class="balance-caption">Saved unpaid balance</p><div class="balance-details"><div><span>Recorded workdays</span><strong>'+unpaid.length+'</strong></div><div><span>Commissions + bonuses</span><strong>'+money(owed.items+owed.bonus)+'</strong></div><div><span>Extra lab pay</span><strong>'+money(owed.labPay)+'</strong></div></div><button class="balance-link" data-view="unpaid">Review & report <span aria-hidden="true">↗</span></button><span class="balance-note">Running shift hours are excluded.</span></section></div>';
  html+=activityStrip();
  html+='<form id="day-form"><div class="entry-grid"><section class="panel work-panel"><div class="section-row"><div><p class="eyebrow">LOG THE LITTLE WINS</p><h2>What’s on your bench?</h2></div><span class="section-number" aria-hidden="true">01</span></div>'+counters(day,'today-',true)+'<p class="hint">Count laptop / console repairs separately from phone repairs.</p>'+labCounters(day,'today-')+'</section><section class="panel sales-panel"><div class="section-row"><div><p class="eyebrow">A LITTLE EXTRA, EARNED</p><h2>Your sales bonus.</h2></div><span class="section-number" aria-hidden="true">02</span></div><label for="today-sales">Day’s total sales ($)</label><input id="today-sales" name="sales" type="number" min="0" max="1000000" step="0.01" inputmode="decimal" required value="'+(day.sales/100).toFixed(2)+'"><div class="sales-track" id="sales-track">'+salesMilestones(day.sales)+'</div><p class="bonus-note" id="bonus-note">'+bonusMessage(day.sales)+'</p><div class="sales-rule-note">Only your highest daily tier applies.</div><label for="today-note">A note for later <span class="muted">(optional)</span></label><textarea id="today-note" name="note" maxlength="4000" placeholder="A busy day, a lab run, something to remember…">'+esc(day.note)+'</textarea><button type="button" class="text-button edit-details-link" data-action="edit-day" data-id="'+day.id+'">Edit hours, rates & details ↗</button></section></div><div class="save-dock"><div><span class="save-light" aria-hidden="true"></span><span id="draft-state">Ready when you are.</span><small>Your entry saves to the selected work date.</small></div><button class="primary" type="submit">Save entry <span aria-hidden="true">↗</span></button></div></form>';
  return html;
}
function updateDayOverview(day,t) {
  if($('#day-total'))$('#day-total').textContent=money(t.total);
  if($('#day-breakdown'))$('#day-breakdown').innerHTML=breakdown(t);
  if($('#paid-time'))$('#paid-time').textContent=duration(t.paidMinutes);
  if($('#pay-orbit'))$('#pay-orbit').innerHTML=earningsRing(t);
  if($('#sales-track'))$('#sales-track').innerHTML=salesMilestones(day.sales);
  if($('#bonus-note'))$('#bonus-note').textContent=bonusMessage(day.sales);
}
function bonusMessage(sales) {
  if(sales>150000)return '$20 bonus reached · highest daily tier';
  if(sales>100000)return '$10 bonus reached · over $1,500 earns $20';
  if(sales>50000)return '$5 bonus reached · over $1,000 earns $10';
  return 'Over $500 in daily sales earns your first $5 bonus.';
}
function renderUnpaid() {
  const days=data.days.filter(d=>!d.paidId).sort((a,b)=>b.date.localeCompare(a.date)),t=sumDays(days),chosen=days.filter(d=>selected.has(d.id));
  let html='<div class="page-head"><div><p class="eyebrow">READY WHEN PAYDAY IS</p><h1>Your unpaid work.</h1><p class="muted">Select the days you want to report or mark paid.</p></div><button data-action="new-day">+ Add day</button></div>';
  if(!days.length)return html+'<div class="panel empty"><span class="empty-icon" aria-hidden="true">↗</span><h2>A fresh start.</h2><p>New work appears here. Paid days stay in Payments, so your history is always available.</p><button class="primary" data-view="today">Start today</button></div>';
  html+='<div class="mini-stats"><div class="mini-stat"><span>Unpaid total</span><strong>'+money(t.total)+'</strong></div><div class="mini-stat"><span>Paid time</span><strong>'+duration(t.paidMinutes)+'</strong>'+ (t.labMinutes?'<small>Includes '+duration(t.labMinutes)+' lab credit</small>':'')+'</div><div class="mini-stat"><span>Commissions + bonus</span><strong>'+money(t.items+t.bonus)+'</strong></div></div>';
  if(days.some(running))html+='<p class="hint">A shift is running. Its unfinished hours are excluded above; clock out before selecting that day.</p>';
  html+='<div class="section-row"><label class="check"><input id="select-all" type="checkbox" '+(chosen.length===days.filter(d=>!running(d)).length&&chosen.length?'checked':'')+'> Select all completed days</label><span class="hint">'+chosen.length+' selected</span></div>';
  html+='<div class="row-list">'+days.map(d=>'<article class="day-row"><input type="checkbox" data-select="'+d.id+'" aria-label="Select '+esc(d.date)+'" '+(selected.has(d.id)?'checked ':'')+(running(d)?'disabled ':'')+'><div class="row-copy"><strong>'+esc(dayTitle(d.date))+'</strong><p>'+duration(totals(d).paidMinutes)+' paid · sales '+money(d.sales)+(running(d)?' · shift running':'')+'</p></div><div class="row-amount">'+money(totals(d).total)+'</div><div class="row-actions"><button data-action="edit-day" data-id="'+d.id+'">Edit</button></div></article>').join('')+'</div>';
  html+='<div class="selection-bar"><div><p>'+chosen.length+' selected '+(chosen.length===1?'day':'days')+'</p><strong>'+money(sumDays(chosen).total)+'</strong></div><div class="actions"><button data-action="preview-report" '+(!chosen.length?'disabled':'')+'>Create report</button><button class="primary" data-action="pay" '+(!chosen.length?'disabled':'')+'>Mark paid ✓</button></div></div>';
  return html;
}
function renderHistory() {
  const reports=[...data.reports].reverse(),total=reports.filter(r=>r.status==='paid').reduce((sum,r)=>sum+r.total,0);
  let html='<div class="page-head"><div><p class="eyebrow">EVERY PAYMENT, REMEMBERED</p><h1>Your payment history.</h1><p class="muted">Saved reports keep their original figures.</p></div></div>';
  if(!reports.length)return html+'<div class="panel empty"><span class="empty-icon" aria-hidden="true">▤</span><h2>No payments yet.</h2><p>When you get paid, select your days under Unpaid and mark them paid. The report will live here.</p><button data-view="unpaid">View unpaid work</button></div>';
  html+='<div class="panel"><p class="eyebrow">TOTAL MARKED PAID</p><div class="amount-big">'+money(total)+'</div><p class="hint">Reopened reports are excluded.</p></div><div class="row-list">'+reports.map(r=>'<article class="payment-row '+(r.status==='reopened'?'reopened':'')+'"><div class="row-copy"><strong>'+esc(r.label)+'</strong><p>'+esc(new Date(r.paidAt).toLocaleDateString())+' · '+r.days.length+' days · '+(r.status==='paid'?'Paid':'Reopened')+'</p></div><div class="row-amount">'+money(r.total)+'</div><div class="row-actions"><button data-action="report" data-id="'+r.id+'">View report</button></div></article>').join('')+'</div>';
  return html;
}
function renderSettings() {
  return '<div class="page-head"><div><p class="eyebrow">SET IT ONCE. MAKE IT YOURS.</p><h1>Your settings.</h1><p class="muted">Defaults for new workdays, reports, and backups.</p></div></div><form id="settings-form" class="panel settings-panel"><h2>Report details</h2><label for="worker-name">Your name</label><input id="worker-name" name="name" maxlength="120" value="'+esc(data.settings.name)+'" required><label for="shop-name">Shop name (optional)</label><input id="shop-name" name="shop" maxlength="120" value="'+esc(data.settings.shop)+'"><hr class="rule"><h2>Pay rates</h2><p class="hint">These defaults apply to new days. To correct a past rate, edit that day.</p>'+rateFields(data.settings.rates)+'<div class="actions"><button type="submit" class="primary">Save settings</button></div><details><summary>How totals are calculated</summary><p>Hourly pay is $10/hour by default. Unpaid breaks are deducted; completed minutes are rounded down per shift, and hourly pay is rounded to the nearest cent per day.</p><p>Each soldering lab drop-off or pickup adds 30 paid minutes at that workday’s hourly rate. Lab salary is rounded to cents per day and added to your shift pay. At $10/hour, each trip earns $5 extra.</p><p>Daily sales must be strictly over $500, $1,000, or $1,500 to earn $5, $10, or $20. Only the highest bonus applies. Laptop / console repairs use the $5 rate instead of the $0.50 phone repair rate.</p><p>An overnight shift belongs to its start day. Rates are stored with each workday. A new pay period means new unpaid days; your paid history is retained.</p></details></form><section class="panel settings-panel"><h2>Your records, in your hands.</h2><p class="muted">Download a password-encrypted backup regularly. Keep your password somewhere safe: it cannot be reset.</p><div class="actions"><button data-action="backup">Download encrypted backup</button><button data-action="restore">Restore backup</button></div><p class="hint">Backups contain your ledger, not your GitHub token. Keep the private repository private. Replacing records does not erase earlier encrypted GitHub versions.</p></section><section class="panel settings-panel"><h2>Connection</h2><p class="muted">'+esc(OWNER+'/'+api.repo)+'</p><p class="hint">Saved credentials are encrypted on this device. To renew a token, lock the desk and choose “Change connection”. There is no automatic token renewal.</p><div class="actions"><button data-action="forget">Forget this device & lock</button><a href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens" target="_blank" rel="noopener noreferrer">GitHub token help ↗</a></div></section>';
}

function showModal(title,html) {
  $('#modal').setAttribute('aria-label',title);$('#modal-kicker').textContent=title;$('#modal-content').innerHTML=html;
  if(!$('#modal').open)$('#modal').showModal();
}
function toLocalInput(iso) {
  if(!iso)return '';
  const d=new Date(iso);return localDate(d)+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function shiftRow(s) {
  return '<div class="shift-row" data-shift="'+esc(s.id)+'"><div><label>Start<input type="datetime-local" name="start" required value="'+toLocalInput(s.start)+'"></label></div><div><label>End <span class="muted">(blank = running)</span><input type="datetime-local" name="end" value="'+toLocalInput(s.end)+'"></label></div><div><label>Break (min)<input type="number" name="break" min="0" max="14400" step="1" value="'+s.breakMinutes+'" required></label></div><button type="button" data-action="remove-shift" aria-label="Remove shift">×</button></div>';
}
function editDay(id=null) {
  if(!abandon())return;dirty=false;
  const existing=data.days.find(d=>d.id===id);
  if(existing?.paidId){notice('Reopen this day’s payment report before editing it.',true);return;}
  editingDay=structuredClone(existing||(displayedDay?.id===id?displayedDay:newDay(localDate(),data.settings.rates)));
  const d=editingDay;
  showModal('EDIT WORKDAY','<h2>Make it accurate.</h2><p class="hint">All times use this device’s local time zone: '+esc(Intl.DateTimeFormat().resolvedOptions().timeZone)+'.</p><form id="edit-form"><label for="edit-date">Work date</label><input id="edit-date" name="date" type="date" value="'+d.date+'" required><label for="edit-sales">Daily sales ($)</label><input id="edit-sales" name="sales" type="number" min="0" max="1000000" step="0.01" value="'+(d.sales/100).toFixed(2)+'" required>'+counters(d,'edit-')+labCounters(d,'edit-')+'<section class="edit-shifts"><div class="section-row"><h3>Hours & unpaid breaks</h3><button type="button" data-action="add-shift">+ Add shift</button></div><div id="shift-list">'+d.shifts.map(shiftRow).join('')+'</div><p class="hint shift-help">Leave End blank only for a shift that is still running. Overnight work stays on this work date.</p></section><label for="edit-note">Notes</label><textarea id="edit-note" name="note" maxlength="4000">'+esc(d.note)+'</textarea><details><summary>Pay rates for this day</summary>'+rateFields(d.rates)+'</details><div class="modal-actions">'+(existing?'<button type="button" class="danger" data-action="delete-day" data-id="'+d.id+'">Delete day</button>':'')+'<button type="button" data-action="close-modal">Cancel</button><button type="submit" class="primary">Save workday</button></div></form>');
}
function readMoney(fields,key) {
  const raw=fields.get(key),value=Number(raw);
  if(raw===null||raw===''||!Number.isFinite(value)||value<0)throw Error('Enter a valid amount.');
  return Math.round(value*100);
}
function readCounts(fields) {
  return Object.fromEntries(TYPES.map(([k])=>[k,Number(fields.get('count_'+k))]));
}
function readLabTrips(fields) {
  return Object.fromEntries(LAB_TYPES.map(([key])=>[key,Number(fields.get('lab_'+key))]));
}
function readRates(fields) {
  return Object.fromEntries(['hour',...TYPES.map(([k])=>k)].map(k=>[k,readMoney(fields,'rate_'+k)]));
}
async function saveDay(form,edit=false) {
  const fields=new FormData(form);
  try {
    const changed=structuredClone(edit?editingDay:displayedDay);
    changed.sales=readMoney(fields,'sales');changed.counts=readCounts(fields);changed.labTrips=readLabTrips(fields);changed.note=String(fields.get('note')||'');
    if(edit) {
      changed.date=String(fields.get('date'));changed.rates=readRates(fields);
      changed.shifts=$$('.shift-row',form).map(row=>{
        const start=$('[name=start]',row).value,end=$('[name=end]',row).value;
        return {id:row.dataset.shift,start:new Date(start).toISOString(),end:end?new Date(end).toISOString():null,breakMinutes:Number($('[name=break]',row).value)};
      });
    }
    const ok=await commit(next=>{
      const index=next.days.findIndex(d=>d.id===changed.id);
      if(index<0)next.days.push(changed);else next.days[index]=changed;
    },{close:edit});
    if(ok){date=changed.date;if(view==='today')render();}
  }catch(e){notice(e.message,true);}
}
function reportDraft() {
  const days=data.days.filter(d=>selected.has(d.id)&&!d.paidId&&!running(d)).sort((a,b)=>a.date.localeCompare(b.date));
  if(!days.length)throw Error('Select at least one completed unpaid day.');
  return {id:null,name:data.settings.name,shop:data.settings.shop,label:days[0].date+' to '+days.at(-1).date,status:'unpaid',paidAt:null,days:structuredClone(days),total:sumDays(days).total};
}
function showReport(report) {
  currentReport=structuredClone(report);dirty=false;
  showModal('WORK REPORT','<h2>'+esc(report.label)+'</h2><p class="hint">'+(report.status==='paid'?'Paid report · saved snapshot':report.status==='reopened'?'Reopened · original snapshot retained':'Unpaid report · ready to share')+'</p><div class="report-total">'+money(sumDays(report.days).total)+'</div><div class="actions"><button data-action="copy-report">Copy text</button><button data-action="csv-report">Download CSV</button><button data-action="print-report">Print / PDF</button></div><pre class="report-pre">'+esc(reportText(report))+'</pre><div class="modal-actions">'+(report.status==='paid'?'<button data-action="reopen" data-id="'+report.id+'">Reopen for correction</button>':report.status==='unpaid'?'<button class="primary" data-action="pay">Mark these days paid ✓</button>':'')+'<button data-action="close-modal">Close</button></div>');
}
function askPay() {
  const report=reportDraft();currentReport=report;
  showModal('RECORD A PAYMENT','<h2>Payment received?</h2><p class="confirm-body">Mark these '+report.days.length+' selected days as paid for <strong>'+money(report.total)+'</strong>. Your report will be saved in Payments, and these days will leave the unpaid list.</p><form id="pay-form"><label for="payment-label">Payment label</label><input id="payment-label" name="label" maxlength="120" value="'+esc(report.label)+'" required><div class="modal-actions"><button type="button" data-action="close-modal">Cancel</button><button type="submit" class="primary">Yes, mark paid</button></div></form>');
}
async function pay(form) {
  const label=new FormData(form).get('label'),ids=currentReport.days.map(d=>d.id);
  let reportId;
  const ok=await commit(next=>{reportId=markPaid(next,ids,label).id;},{close:true,message:'Payment recorded. Your next unpaid days start fresh.'});
  if(ok){selected.clear();view='history';render();showReport(data.reports.find(r=>r.id===reportId));document.dispatchEvent(new Event('desk:paid'));}
}
function download(content,name,type='application/json') {
  const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function backup() {
  if(busy)return;setBusy(true,'Encrypting backup…');
  try {download(JSON.stringify(await seal(data,cipher),null,2),'private-desk-backup-'+localDate()+'.json');notice('Encrypted backup downloaded. Keep it with your password stored separately.');}
  catch(e){notice(e.message,true);}finally{setBusy(false);}
}
async function restoreFile(file) {
  if(!file)return;
  if(file.size>5000000){notice('That file is too large for a desk backup.',true);return;}
  const text=await file.text();let envelope;
  try {envelope=JSON.parse(text);}catch{notice('Choose a valid encrypted JSON backup.',true);return;}
  showModal('RESTORE BACKUP','<h2>Restore saved records.</h2><p class="confirm-body">This replaces the current ledger in your private repository. Download a backup of your current records first. The connection and current dashboard password will stay the same.</p><form id="restore-form"><label for="backup-password">Password used for this backup</label><input type="password" id="backup-password" name="password" autocomplete="off" required><label class="check"><input type="checkbox" required> I want to replace my current records with this backup.</label><div class="modal-actions"><button type="button" data-action="close-modal">Cancel</button><button class="primary" type="submit">Restore records</button></div></form>');
  $('#restore-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    const password=new FormData(event.currentTarget).get('password');
    setBusy(true,'Checking encrypted backup…');
    let restored;
    try {restored=validateLedger((await open(envelope,password)).value);}
    catch(e){setBusy(false);notice(e.message,true);return;}
    setBusy(false);
    const ok=await commit(next=>{for(const key of Object.keys(next))delete next[key];Object.assign(next,restored);},{close:true,message:'Backup restored to private GitHub.'});
    if(ok){selected.clear();view='today';date=localDate();render();}
  });
}
function clockOut() {
  if(dirty){notice('Save your entry before clocking out.',true);return;}
  const d=data.days.find(running);if(!d)return;
  const s=d.shifts.find(s=>!s.end);
  showModal('FINISH YOUR SHIFT','<h2>Nice work today.</h2><p class="muted">Started '+esc(new Date(s.start).toLocaleString())+'</p><form id="clock-out-form"><label for="clock-break">Unpaid break minutes</label><input id="clock-break" name="break" type="number" min="0" step="1" required value="'+s.breakMinutes+'"><p class="hint">The shift ends when you press Finish shift. You can edit the time afterward.</p><div class="modal-actions"><button type="button" data-action="close-modal">Cancel</button><button type="submit" class="primary">Finish shift ■</button></div></form>');
}
async function handleAction(action,element) {
  if(busy)return;
  switch(action) {
    case 'dismiss':$('#notice').hidden=true;break;
    case 'connection':showGate(true);break;
    case 'lock':if(abandon())lock();break;
    case 'refresh':await refresh();break;
    case 'close-modal':if(abandon()){dirty=false;$('#modal').close();editingDay=null;if(data)render();}break;
    case 'company-notebook':
      if(dirty&&!$('#company-form')){notice('Save your current entry before opening the company notebook.',true);break;}
      if(!abandon())break;dirty=false;showCompanyNotebook();break;
    case 'company-add':editCompanyEntry(null,element.dataset.type);break;
    case 'company-edit':editCompanyEntry(element.dataset.id);break;
    case 'company-delete':
      if(confirm('Delete this money note? The company balance will be recalculated. Your work and pay records will stay as they are.')) {
        if(await commit(next=>deleteCompanyEntry(next,element.dataset.id),{message:'Company money note deleted.'}))showCompanyNotebook('Entry deleted. Balance updated.');
        else showCompanyError($('#notice-text').textContent);
      }break;
    case 'company-copy':
      try {await navigator.clipboard.writeText(companyReportText(data));$('#company-status').textContent='Summary copied. Paste it into a message whenever you’re ready.';}
      catch {$('#company-status').textContent='Copy is unavailable here. Your summary is shown below for selection.';const text=document.createElement('pre');text.className='report-pre';text.textContent=companyReportText(data);$('#company-status').replaceChildren($('#company-status').textContent,text);}break;
    case 'clock-in':
      if(dirty){notice('Save your entry before clocking in.',true);break;}
      await commit(next=>{
        if(next.days.some(running))throw Error('A shift is already running.');
        let day=next.days.find(d=>d.date===localDate());
        if(!day){day=newDay(localDate(),next.settings.rates);next.days.push(day);}
        if(day.paidId)throw Error('Today has already been paid. Reopen that report to add more work.');
        day.shifts.push({id:uid(),start:new Date().toISOString(),end:null,breakMinutes:0});
      },{message:'Clocked in. You can close the page; your start time is saved.'});
      break;
    case 'clock-out':clockOut();break;
    case 'edit-day':editDay(element.dataset.id);break;
    case 'new-day':editDay();break;
    case 'add-shift':{
      const start=$('#edit-date').value+'T09:00';
      $('#shift-list').insertAdjacentHTML('beforeend',shiftRow({id:uid(),start:new Date(start).toISOString(),end:new Date($('#edit-date').value+'T17:00').toISOString(),breakMinutes:0}));dirty=true;break;
    }
    case 'remove-shift':element.closest('.shift-row').remove();dirty=true;break;
    case 'delete-day':
      if(confirm('Delete this unpaid workday, including its hours and commissions?'))
        await commit(next=>{next.days=next.days.filter(d=>d.id!==element.dataset.id);},{close:true,message:'Workday deleted.'});
      break;
    case 'preview-report':showReport(reportDraft());break;
    case 'report':showReport(data.reports.find(r=>r.id===element.dataset.id));break;
    case 'pay':askPay();break;
    case 'copy-report':
      try {await navigator.clipboard.writeText(reportText(currentReport));notice('Report copied. Paste it into a message to your boss.');}
      catch {notice('Copy is unavailable here. Select the report text or download the CSV.',true);}break;
    case 'csv-report':download(reportCSV(currentReport),'work-report-'+currentReport.days[0].date+'.csv','text/csv;charset=utf-8');break;
    case 'print-report':$('#print-report').textContent=reportText(currentReport);window.print();break;
    case 'reopen':{
      if(!confirm('Reopen this payment for correction? Its days will become unpaid again. The original report will remain in history as reopened.'))break;
      let reopened=[];
      if(await commit(next=>{reopened=reopenReport(next,element.dataset.id);},{close:true,message:'Payment reopened. Only its original days are selected.'})){
        selected=new Set(reopened);view='unpaid';render();
      }break;
    }
    case 'backup':await backup();break;
    case 'restore':if(abandon()){dirty=false;$('#backup-file').value='';$('#backup-file').click();}break;
    case 'forget':
      if(confirm('Remove the remembered connection from this browser and lock? Your private GitHub records will remain saved.')){
        try{localStorage.removeItem(STORE);}catch{notice('Could not remove the remembered connection. Clear site data in your browser.',true);break;}lock();
      }break;
  }
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button||busy)return;
  try {
    if(button.dataset.view){go(button.dataset.view);return;}
    if(button.dataset.step){
      const input=document.getElementById(button.dataset.target);
      input.value=Math.min(100000,Math.max(0,(Number(input.value)||0)+Number(button.dataset.step)));
      input.dispatchEvent(new Event('input',{bubbles:true}));return;
    }
    if(button.dataset.action==='open-day'){if(!abandon())return;date=button.dataset.date;dirty=false;view='today';render();$('#main').focus({preventScroll:true});return;}
    if(button.dataset.action)await handleAction(button.dataset.action,button);
  }catch(e){notice(e.message,true);}
});
document.addEventListener('submit',async event=>{
  const form=event.target;if(form.id==='restore-form')return;
  event.preventDefault();if(busy)return;
  try {
    if(form.id==='unlock-form')return await connect(form,true);
    if(form.id==='connect-form')return await connect(form);
    if(form.id==='day-form')return await saveDay(form);
    if(form.id==='edit-form')return await saveDay(form,true);
    if(form.id==='company-form')return await saveCompanyForm(form);
    if(form.id==='pay-form')return await pay(form);
    if(form.id==='settings-form'){
      const f=new FormData(form),settings={name:String(f.get('name')).trim(),shop:String(f.get('shop')).trim(),rates:readRates(f)};
      return await commit(next=>{next.settings=settings;},{message:'Settings saved. New days will use these rates.'});
    }
    if(form.id==='clock-out-form'){
      const minutes=Number(new FormData(form).get('break'));
      return await commit(next=>{
        const day=next.days.find(running);if(!day)throw Error('There is no running shift.');
        const shift=day.shifts.find(s=>!s.end);shift.end=new Date().toISOString();shift.breakMinutes=minutes;
      },{close:true,message:'Shift finished and saved.'});
    }
  }catch(e){notice(e.message,true);}
});
document.addEventListener('input',event=>{
  if(!data)return;
  const form=event.target.closest('form');
  if(['day-form','edit-form','settings-form','clock-out-form','pay-form','company-form'].includes(form?.id))dirty=true;
  if(form?.id==='day-form'){
    const draft=structuredClone(displayedDay),fields=new FormData(form);
    draft.sales=Math.max(0,Math.round(Number(fields.get('sales'))*100)||0);draft.counts=readCounts(fields);draft.labTrips=readLabTrips(fields);
    const t=totals(draft,Date.now());
    updateDayOverview(draft,t);$('#draft-state').textContent='Unsaved changes';$('#day-state').textContent='Unsaved changes';$('.save-dock').classList.add('has-changes');
  }
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.id==='create-vault'){
    $('#confirm-wrap').hidden=!el.checked;$('#confirm-password').required=el.checked;
    $('#password').autocomplete=el.checked?'new-password':'current-password';return;
  }
  if(el.id==='day-date'){
    if(!el.value||!abandon()){el.value=date;return;}
    date=el.value;dirty=false;render();return;
  }
  if(el.dataset.select){if(el.checked)selected.add(el.dataset.select);else selected.delete(el.dataset.select);render();return;}
  if(el.id==='select-all'){selected=el.checked?new Set(data.days.filter(d=>!d.paidId&&!running(d)).map(d=>d.id)):new Set();render();return;}
  if(el.id==='backup-file')restoreFile(el.files[0]).catch(e=>notice(e.message,true));
});
$('#modal').addEventListener('cancel',event=>{if(busy||!abandon()){event.preventDefault();return;}dirty=false;editingDay=null;if(data)render();});
window.addEventListener('beforeunload',event=>{if(dirty||busy){event.preventDefault();event.returnValue='';}});
window.addEventListener('afterprint',()=>$('#print-report').replaceChildren());
for(const type of ['pointerdown','keydown'])document.addEventListener(type,()=>{lastActivity=Date.now();},{passive:true});
setInterval(()=>{
  if(!data||busy)return;
  if(Date.now()-lastActivity>15*60*1000){lock();notice('Desk locked after 15 minutes of inactivity. Saved work and running shifts are safe.');return;}
  if(view==='today'&&!dirty&&displayedDay&&running(displayedDay)){
    const t=totals(displayedDay,Date.now());
    if($('#clock-time'))$('#clock-time').textContent=duration(t.minutes);
    updateDayOverview(displayedDay,t);
  }
},15000);
if(!crypto.subtle){notice('Open this page over HTTPS in an up-to-date browser to use encrypted storage.',true);}
showGate();
