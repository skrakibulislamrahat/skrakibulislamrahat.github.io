import {TYPES,LAB_TYPES,LAB_MINUTES,DEFAULT_RATES,money,uid,localDate,duration,emptyLedger,newDay,totals,sumDays,running,validateLedger,markPaid,reopenReport,reportText,reportCSV} from './core.mjs?v=4';
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
function counters(day,prefix) {
  return TYPES.map(([k,l])=>'<div class="counter-row"><label class="counter-title" for="'+prefix+k+'">'+l+'<small>'+money(day.rates[k])+' each</small></label><div class="stepper"><button type="button" data-step="-1" data-target="'+prefix+k+'" aria-label="Remove one '+l.toLowerCase()+'">−</button><input id="'+prefix+k+'" name="count_'+k+'" type="number" min="0" max="100000" step="1" inputmode="numeric" value="'+day.counts[k]+'" required aria-label="'+l+' count"><button type="button" data-step="1" data-target="'+prefix+k+'" aria-label="Add one '+l.toLowerCase()+'">+</button></div></div>').join('');
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
function renderToday() {
  displayedDay=data.days.find(d=>d.date===date)||newDay(date,data.settings.rates);
  const day=displayedDay,t=totals(day,Date.now()),active=data.days.find(running),isToday=date===localDate();
  const clockText=active?'Clock out':isToday?'Clock in':'Add a shift';
  let html='<div class="page-head"><div><p class="eyebrow">MAKE EVERY HOUR COUNT</p><h1>'+ (isToday?'Your day, at a glance.':'Your workday.')+'</h1><p class="muted">'+esc(dayTitle(date))+'</p></div><div class="date-control"><label for="day-date">Work date</label><input id="day-date" type="date" value="'+date+'" required></div></div>';
  if(day.paidId) return html+'<div class="panel empty"><span class="empty-icon" aria-hidden="true">✓</span><h2>This day is already paid.</h2><p>It is safely stored in your payment history. Reopen its payment report if a correction is needed.</p><button data-action="report" data-id="'+day.paidId+'">View payment</button></div>';
  html+='<section class="panel clock-panel '+(active?'is-running':'')+'"><div class="clock-copy"><p class="eyebrow">'+(active?'ON THE CLOCK':'TIME AT WORK')+'</p><div class="clock-amount" id="clock-time">'+duration(t.minutes)+'</div><p class="clock-caption">'+(active?'Started '+esc(new Date(active.shifts.find(s=>!s.end).start).toLocaleString()):'Unpaid breaks are deducted from your hours.')+'</p></div><div class="clock-orbit" aria-hidden="true"><div class="orbit-ring orbit-outer"></div><div class="orbit-ring orbit-inner"></div><div class="orbit-core"><svg viewBox="0 0 48 48" fill="none"><rect x="14" y="6" width="20" height="36" rx="5"/><path d="M21 10h6M22 37h4M19 26l4-8 3 5h4"/></svg></div><span class="orbit-caption">IN YOUR ORBIT</span></div><div class="clock-actions"><button class="primary" data-action="'+(active?'clock-out':isToday?'clock-in':'edit-day')+'" data-id="'+day.id+'">'+clockText+' '+(active?'■':'→')+'</button>'+(isToday||active?'<button class="quiet manual-hours" data-action="edit-day" data-id="'+day.id+'">Enter hours</button>':'')+'<span class="clock-action-hint">'+(isToday?'Or choose a past work date above.':'Enter start, end & break time.')+'</span></div></section>';
  html+='<form id="day-form"><div class="two-cols"><section class="panel"><div class="section-row"><h2>What did you do?</h2><span class="pill">Commissions</span></div>'+counters(day,'today-')+'<p class="hint">Count laptop / console repairs separately from phone repairs.</p>'+labCounters(day,'today-')+'</section><section class="panel"><h2>Daily sales</h2><p class="hint">Enter the day’s total sales for the bonus.</p><label for="today-sales">Sales amount ($)</label><input id="today-sales" name="sales" type="number" min="0" max="1000000" step="0.01" inputmode="decimal" required value="'+(day.sales/100).toFixed(2)+'"><p class="bonus-note" id="bonus-note">'+bonusMessage(day.sales)+'</p><label for="today-note">Notes <span class="muted">(optional)</span></label><textarea id="today-note" name="note" maxlength="4000" placeholder="Anything you want to remember…">'+esc(day.note)+'</textarea><div class="form-footer"><span id="draft-state" class="hint">Changes save when you tap Save.</span><button class="primary" type="submit">Save entry</button></div></section></div></form>';
  html+='<section class="panel"><div class="section-row"><h2>Today’s pay</h2><button data-action="edit-day" data-id="'+day.id+'">Edit hours & details</button></div><div class="amount-big" id="day-total">'+money(t.total)+'</div><div id="day-breakdown">'+breakdown(t)+'</div><p class="hint">'+(running(day)?'Live estimate includes your running shift. Clock out before creating a report.':'All amounts are gross pay before any deductions.')+'</p></section>';
  return html;
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
  if(['day-form','edit-form','settings-form','clock-out-form','pay-form'].includes(form?.id))dirty=true;
  if(form?.id==='day-form'){
    const draft=structuredClone(displayedDay),fields=new FormData(form);
    draft.sales=Math.max(0,Math.round(Number(fields.get('sales'))*100)||0);draft.counts=readCounts(fields);draft.labTrips=readLabTrips(fields);
    const t=totals(draft,Date.now());
    $('#day-total').textContent=money(t.total);$('#day-breakdown').innerHTML=breakdown(t);$('#bonus-note').textContent=bonusMessage(draft.sales);$('#draft-state').textContent='Unsaved changes';
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
    if($('#day-total'))$('#day-total').textContent=money(t.total);
    if($('#day-breakdown'))$('#day-breakdown').innerHTML=breakdown(t);
  }
},15000);
if(!crypto.subtle){notice('Open this page over HTTPS in an up-to-date browser to use encrypted storage.',true);}
showGate();
