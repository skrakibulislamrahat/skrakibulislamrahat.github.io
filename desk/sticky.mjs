// Only the note's position is kept on this device. No financial data is stored here.
const positionKey='private-desk.note-position.v1';
const $=selector=>document.querySelector(selector);
let position=null,drag=null,suppressClick=false;
try {
  const saved=JSON.parse(localStorage.getItem(positionKey));
  if(saved && [saved.x,saved.y].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1))position={x:saved.x,y:saved.y};
} catch {}

function bounds(note) {
  const viewport=window.visualViewport;
  const left=(viewport?.offsetLeft??0)+12,top=(viewport?.offsetTop??0)+16;
  return {left,top,width:Math.max(0,(viewport?.width??innerWidth)-note.offsetWidth-24),height:Math.max(0,(viewport?.height??innerHeight)-note.offsetHeight-32)};
}
function move(note,x,y) {
  const b=bounds(note);
  x=Math.max(b.left,Math.min(b.left+b.width,x));y=Math.max(b.top,Math.min(b.top+b.height,y));
  note.style.left=x+'px';note.style.top=y+'px';
  return {x:b.width?(x-b.left)/b.width:0,y:b.height?(y-b.top)/b.height:0};
}
function floatNote(note) {
  const layer=$('#company-note-layer');
  if(note.parentElement!==layer)layer.append(note);
  note.classList.add('is-floating');
}
function placeNote() {
  const note=$('.company-sticky');if(!note)return;
  const slot=$('#company-note-slot');
  if(!position&&slot) {
    slot.append(note);note.classList.remove('is-floating');note.style.removeProperty('left');note.style.removeProperty('top');return;
  }
  floatNote(note);
  const p=position??{x:1,y:.28},b=bounds(note);
  move(note,b.left+p.x*b.width,b.top+p.y*b.height);
}
function remember(next) {
  position=next;
  try {if(position)localStorage.setItem(positionKey,JSON.stringify(position));else localStorage.removeItem(positionKey);} catch {}
}
function release(cancel=false) {
  if(!drag)return;
  const state=drag;drag=null;
  state.note.classList.remove('is-dragging');
  if(state.note.hasPointerCapture(state.id))state.note.releasePointerCapture(state.id);
  if(state.moved) {
    suppressClick=true;
    if(cancel)placeNote();else remember(state.next);
  }
}
document.addEventListener('pointerdown',event=>{
  const note=event.target.closest('.company-sticky');
  if(!note||note.disabled||!event.isPrimary||event.button!==0||drag)return;
  suppressClick=false;
  const rect=note.getBoundingClientRect();
  drag={note,id:event.pointerId,startX:event.clientX,startY:event.clientY,left:rect.left,top:rect.top,moved:false,next:null};
  note.setPointerCapture(event.pointerId);
  note.focus({preventScroll:true});
});
document.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.id)return;
  const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
  if(!drag.moved&&Math.hypot(dx,dy)<6)return;
  if(!drag.moved) {
    // Moving into the overlay avoids transformed cards and prevents page reflow while dragging.
    const state=drag;
    floatNote(state.note);state.note.setPointerCapture(state.id);
    state.note.classList.add('is-dragging');state.moved=true;
  }
  event.preventDefault();
  drag.next=move(drag.note,drag.left+dx,drag.top+dy);
},{passive:false});
document.addEventListener('pointerup',event=>{if(drag?.id===event.pointerId)release();});
document.addEventListener('pointercancel',event=>{if(drag?.id===event.pointerId)release(true);});
document.addEventListener('lostpointercapture',event=>{if(drag?.id===event.pointerId)release(true);});
document.addEventListener('click',event=>{
  if(suppressClick&&event.detail!==0&&event.target.closest('.company-sticky')) {
    event.preventDefault();event.stopImmediatePropagation();suppressClick=false;
  }
},true);
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&drag){event.preventDefault();release(true);return;}
  const note=event.target.closest('.company-sticky');if(!note||note.disabled)return;
  if(event.key==='Home') {event.preventDefault();remember(null);placeNote();note.focus({preventScroll:true});return;}
  const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
  if(!direction)return;
  event.preventDefault();
  const rect=note.getBoundingClientRect(),step=event.shiftKey?40:10;
  floatNote(note);remember(move(note,rect.left+direction[0]*step,rect.top+direction[1]*step));note.focus({preventScroll:true});
});
document.addEventListener('desk:render',()=>{release(true);placeNote();});
document.addEventListener('desk:lock',()=>{release(true);suppressClick=false;});
const reflow=()=>{release(true);placeNote();};
addEventListener('resize',reflow,{passive:true});
window.visualViewport?.addEventListener('resize',reflow,{passive:true});
window.visualViewport?.addEventListener('scroll',reflow,{passive:true});
addEventListener('blur',()=>release(true));
placeNote();
