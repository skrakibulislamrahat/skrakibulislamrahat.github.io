/** Private Desk → an existing commission tracker. No vault credentials here.
 * In the target spreadsheet: Extensions → Apps Script, paste this file, save,
 * run setupPrivateDesk, add DESK_KEY in Project Settings → Script properties,
 * then deploy as a Web app (Me / Anyone).
 * Keep the connection key in Script Properties and your encrypted desk only.
 */
var DESK_ORIGIN = 'https://skrakibulislamrahat.github.io';
var DESK_TYPES = ['repair','case','other','device','computer'];

function setupPrivateDesk() {
  var properties=PropertiesService.getScriptProperties(),ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss&&properties.getProperty('DESK_SPREADSHEET'))ss=SpreadsheetApp.openById(properties.getProperty('DESK_SPREADSHEET'));
  if(!ss || !ss.getSheetByName('Commission Log') || !ss.getSheetByName('Payments'))throw Error('Open this script from your commission tracker spreadsheet.');
  properties.setProperty('DESK_SPREADSHEET',ss.getId());
  var key=properties.getProperty('DESK_KEY');
  if(!key){
    console.log('Spreadsheet connected. In Project Settings → Script properties, add DESK_KEY with the connection key copied from your desk.');
    return;
  }
  if(!/^[A-Za-z0-9_-]{32,100}$/.test(key))throw Error('DESK_KEY must contain 32–100 letters, digits, underscores or hyphens. Update it in Project Settings → Script properties.');
  console.log('Connection ready. Deploy this project as a Web app, then paste its /exec URL into your desk.');
}

function doPost(e) {
  var nonce=e&&e.parameter&&e.parameter.nonce||'',lock=LockService.getScriptLock(),result={type:'private-desk-sheet-sync',nonce:nonce,ok:false};
  try {
    var properties=PropertiesService.getScriptProperties(),expected=properties.getProperty('DESK_KEY'),provided=e.parameter.key||'';
    if(!expected||!sameDeskKey_(expected,provided))throw Error('Connection key not accepted. Check the saved key in your desk.');
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(nonce))throw Error('Invalid sync request.');
    if(!e.parameter.payload||e.parameter.payload.length>2500000)throw Error('Sync request is empty or too large.');
    var payload=JSON.parse(e.parameter.payload);validateDeskPayload_(payload);
    lock.waitLock(20000);
    var ss=SpreadsheetApp.openById(properties.getProperty('DESK_SPREADSHEET'));
    var commissions=ss.getSheetByName('Commission Log'),payments=ss.getSheetByName('Payments');
    if(!commissions||!payments)throw Error('The Commission Log or Payments tab is missing.');
    var headings=commissions.getRange(4,1,1,13).getValues()[0],payHeadings=payments.getRange(4,1,1,6).getValues()[0];
    if(headings[0]!=='Date'||headings[1]!=='Shop'||headings[12]!=='Notes'||payHeadings[0]!=='Commission month'||payHeadings[2]!=='Amount paid ($)')throw Error('The commission tracker layout changed. Nothing was synced.');
    var timezone=ss.getSpreadsheetTimeZone(),log=commissions.getRange(5,1,1000,13).getValues(),pay=payments.getRange(5,1,1000,6).getValues();
    // Plan and validate both tables before the first write. Only marked rows
    // belong to this sync; manual rows and other tabs remain in place.
    var dayPlan=planDeskRows_(log,payload.days,12,function(entry,row){return deskDateKey_(row[0],timezone)===entry.date&&row[1]===entry.shop;},function(entry,row){return DESK_TYPES.every(function(k,i){return Number(row[i+2]||0)===entry.counts[k];})&&Math.round(Number(row[7]||0)*100)===entry.sales;});
    var paymentPlan=planDeskRows_(pay,payload.payments,4,function(){return false;},function(){return false;});
    applyDeskDays_(commissions,dayPlan);
    applyDeskPayments_(payments,paymentPlan);
    SpreadsheetApp.flush();
    result.ok=true;result.days=payload.days.length;result.payments=payload.payments.length;
  }catch(error){result.message=String(error.message||error);}
  finally{if(lock.hasLock())lock.releaseLock();}
  var json=JSON.stringify(result).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>window.top.postMessage('+json+','+JSON.stringify(DESK_ORIGIN)+');</script>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function sameDeskKey_(a,b) {
  var difference=a.length^b.length;
  for(var i=0;i<a.length;i++)difference|=a.charCodeAt(i)^(b.charCodeAt(i)||0);
  return difference===0;
}
function deskId_(value){return typeof value==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(value);}
function deskAmount_(n,max){return Number.isSafeInteger(n)&&n>=0&&n<=max;}
function deskDate_(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
function validateDeskPayload_(payload) {
  if(!payload||payload.version!==1||!Array.isArray(payload.days)||!Array.isArray(payload.payments)||payload.days.length>1000||payload.payments.length>1000)throw Error('The tracker supports up to 1,000 workdays and 1,000 commission payments.');
  var ids={},dates={};
  payload.days.forEach(function(day){
    if(!day||!deskId_(day.id)||ids[day.id]||!deskDate_(day.date)||!['Dayton Wireless','iFixandRepair'].includes(day.shop)||dates[day.date+'|'+day.shop]||!deskAmount_(day.sales,100000000)||!day.counts||!day.rates||!DESK_TYPES.every(function(k){return deskAmount_(day.counts[k],100000)&&deskAmount_(day.rates[k],1000000);}))throw Error('Invalid or duplicate commission workday.');
    var items=DESK_TYPES.reduce(function(sum,k){return sum+day.counts[k]*day.rates[k];},0),bonus=day.sales>150000?2000:day.sales>100000?1000:day.sales>50000?500:0;
    if(day.items!==items||day.bonus!==bonus)throw Error('Commission totals do not match the workday.');
    ids[day.id]=true;dates[day.date+'|'+day.shop]=true;
  });
  ids={};
  payload.payments.forEach(function(payment){
    if(!payment||!deskId_(payment.id)||ids[payment.id]||!deskDate_(payment.month)||!payment.month.endsWith('-01')||!deskDate_(payment.date)||!deskAmount_(payment.amount,1000000000000)||!payment.amount)throw Error('Invalid or duplicate commission payment.');
    ids[payment.id]=true;
  });
}
function deskDateKey_(value,timezone) {
  if(value instanceof Date)return Utilities.formatDate(value,timezone,'yyyy-MM-dd');
  if(typeof value==='number')return new Date(Date.UTC(1899,11,30)+value*86400000).toISOString().slice(0,10);
  return String(value||'');
}
function deskDateSerial_(value){return Math.round((Date.parse(value+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000);}
function deskMarker_(id){return '[Private Desk:'+id+']';}
function planDeskRows_(rows,entries,noteColumn,match,identical) {
  var taken={},active={},writes=[];
  entries.forEach(function(entry){
    var marked=[],matching=[];
    rows.forEach(function(row,index){
      if(String(row[noteColumn]||'').includes(deskMarker_(entry.id)))marked.push(index);
      else if(match(entry,row))matching.push(index);
    });
    if(marked.length>1||matching.length>1||marked.length&&matching.length)throw Error('Duplicate spreadsheet rows need review before syncing.');
    var index=marked.length?marked[0]:matching.length?matching[0]:-1;
    if(index>=0&&!marked.length&&!identical(entry,rows[index]))throw Error('An existing manual row differs on '+(entry.date||entry.month)+'. Review that row before syncing.');
    if(index<0)index=rows.findIndex(function(row,i){return !taken[i]&&row.slice(0,noteColumn===12?8:5).every(function(value){return value===''||value===null;})&&!String(row[noteColumn]||'').includes('[Private Desk:');});
    if(index<0||taken[index])throw Error('The commission table has no empty row or has conflicting records.');
    taken[index]=true;active[entry.id]=true;writes.push({index:index,entry:entry,note:String(rows[index][noteColumn]||'')});
  });
  var clears=[];
  rows.forEach(function(row,index){var match=String(row[noteColumn]||'').match(/\[Private Desk:([a-zA-Z0-9_-]+)\]/);if(match&&!active[match[1]])clears.push(index);});
  return {writes:writes,clears:clears};
}
function applyDeskDays_(sheet,plan) {
  plan.clears.forEach(function(index){sheet.getRange(index+5,1,1,8).clearContent();sheet.getRange(index+5,13).clearContent();});
  plan.writes.forEach(function(write){
    var d=write.entry,row=write.index+5,note=write.note.replace(/\[Private Desk:[a-zA-Z0-9_-]+\]/g,'').trim();
    var values=[deskDateSerial_(d.date),d.shop].concat(DESK_TYPES.map(function(k){return d.counts[k];}),[d.sales/100]);
    var guard='IF(OR(A'+row+'="",B'+row+'=""),"",';
    var itemFormula='='+guard+'ROUND(SUM('+DESK_TYPES.map(function(k,i){return String.fromCharCode(67+i)+row+'*'+d.rates[k]/100;}).join(',')+'),2))';
    var bonusFormula='='+guard+'IF(H'+row+'>1500,20,IF(H'+row+'>1000,10,IF(H'+row+'>500,5,0))))';
    var checkFormula='='+guard+'IF(COUNTIFS($A$5:$A$1004,A'+row+',$B$5:$B$1004,B'+row+')>1,"Combine duplicate rows","Ready"))';
    var marker=(note?note+' ':'')+deskMarker_(d.id);
    // Escape prior manual notes rather than letting setValues treat them as formulas.
    if(/^\s*[=+\-@]/.test(marker))marker="'"+marker;
    values.push(itemFormula,bonusFormula,'='+guard+'ROUND(SUM(I'+row+':J'+row+'),2))',checkFormula,marker);
    sheet.getRange(row,1,1,13).setValues([values]);
  });
}
function applyDeskPayments_(sheet,plan) {
  plan.clears.forEach(function(index){sheet.getRange(index+5,1,1,5).clearContent();});
  plan.writes.forEach(function(write){var p=write.entry,row=write.index+5;sheet.getRange(row,1,1,5).setValues([[deskDateSerial_(p.month),deskDateSerial_(p.date),p.amount/100,'Other',deskMarker_(p.id)]]);});
}
