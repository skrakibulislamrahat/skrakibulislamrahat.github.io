// Cursor light and device weather. No account, network, or work-record access.
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const canvas = document.querySelector('#device-weather');
const ctx = canvas.getContext('2d');
let enabled = root.dataset.motion !== 'off' && !reduced.matches;
let glowFrame = 0, glowTimer, pointer = null, lastCard = null;
let devices = [], rainFrame = 0, lastTime = 0, rainStarted = 0, lastRain = -5000;
let width = 0, height = 0, hintTimer;

function hideGlow() {
  cancelAnimationFrame(glowFrame); glowFrame = 0;
  clearTimeout(glowTimer); root.dataset.pointer = 'idle';
  if (lastCard) { lastCard.style.removeProperty('--spot-x'); lastCard.style.removeProperty('--spot-y'); lastCard = null; }
}
function moveGlow() {
  glowFrame = 0;
  if (!enabled || document.hidden || !pointer) return;
  root.style.setProperty('--cursor-x', pointer.x + 'px');
  root.style.setProperty('--cursor-y', pointer.y + 'px');
  root.dataset.pointer = 'active';
  if (lastCard && lastCard !== pointer.card) {
    lastCard.style.removeProperty('--spot-x'); lastCard.style.removeProperty('--spot-y');
  }
  lastCard = pointer.card;
  if (lastCard?.isConnected) {
    const rect = lastCard.getBoundingClientRect();
    lastCard.style.setProperty('--spot-x', pointer.x - rect.left + 'px');
    lastCard.style.setProperty('--spot-y', pointer.y - rect.top + 'px');
  }
}
function followPointer(event) {
  if (!enabled || !event.isPrimary) return;
  clearTimeout(glowTimer);
  pointer = {x: event.clientX, y: event.clientY, card: event.target.closest('.counter-tile,.panel,.gate-card')};
  if (!glowFrame) glowFrame = requestAnimationFrame(moveGlow);
}
document.addEventListener('pointermove', followPointer, {passive:true});
document.addEventListener('pointerdown', followPointer, {passive:true});
document.addEventListener('pointerup', event => {
  if (event.pointerType !== 'mouse') glowTimer = setTimeout(hideGlow, 1100);
}, {passive:true});
document.addEventListener('pointercancel', hideGlow, {passive:true});
document.documentElement.addEventListener('pointerleave', hideGlow, {passive:true});

function resize() {
  width = innerWidth; height = innerHeight;
  const ratio = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
}
function clearRain() {
  cancelAnimationFrame(rainFrame); rainFrame = 0; devices = [];
  ctx?.clearRect(0, 0, width, height);
}
function hint(text) {
  const box = document.querySelector('#secret-hint');
  clearTimeout(hintTimer); box.textContent = text; box.hidden = false;
  hintTimer = setTimeout(() => { box.hidden = true; }, 3800);
}
function rect(x,y,w,h,r) {
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.stroke();
}
function drawDevice(device) {
  ctx.save();
  ctx.translate(device.x,device.y);ctx.rotate(device.angle);ctx.scale(device.size,device.size);
  ctx.globalAlpha = Math.min(1, Math.max(0, (height + 70 - device.y) / 100));
  ctx.strokeStyle = device.color;ctx.fillStyle = '#10252deb';ctx.lineWidth = 1.7;
  ctx.shadowColor = device.color;ctx.shadowBlur = 7;
  if (device.type === 2) {
    rect(-20,-15,40,27,3);ctx.shadowBlur=0;
    ctx.beginPath();ctx.moveTo(-20,12);ctx.lineTo(-25,18);ctx.lineTo(25,18);ctx.lineTo(20,12);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-5,15);ctx.lineTo(5,15);ctx.stroke();
    ctx.strokeStyle='#ffffff26';ctx.beginPath();ctx.moveTo(-13,4);ctx.lineTo(6,-9);ctx.stroke();
  } else {
    const w = device.type === 1 ? 30 : 20, h = device.type === 1 ? 39 : 36;
    rect(-w/2,-h/2,w,h,4);ctx.shadowBlur=0;
    ctx.beginPath();ctx.moveTo(-3,-h/2+4);ctx.lineTo(3,-h/2+4);ctx.moveTo(-3,h/2-4);ctx.lineTo(3,h/2-4);ctx.stroke();
    ctx.strokeStyle='#ffffff26';ctx.beginPath();ctx.moveTo(-w/2+5,4);ctx.lineTo(w/2-5,-5);ctx.stroke();
  }
  ctx.restore();
}
function drawRain(now) {
  rainFrame = 0;
  if (!enabled || document.hidden || now-rainStarted > 8500) return clearRain();
  const dt = Math.min((now-lastTime)/1000,.04);lastTime = now;
  ctx.clearRect(0,0,width,height);
  devices = devices.filter(d => d.y < height + 90 && d.x > -100 && d.x < width + 100);
  for (const d of devices) {
    d.y += d.vy*dt;d.x += (d.vx + Math.sin(now/700+d.phase)*16)*dt;
    d.vy += 65*dt;d.angle += d.spin*dt;drawDevice(d);
  }
  if (devices.length) rainFrame = requestAnimationFrame(drawRain);
  else clearRain();
}
function makeItRain() {
  if (!enabled) { hint('Motion is off. The gadgets are staying on the bench.'); return; }
  if (!ctx || document.hidden || document.querySelector('dialog[open]')) return;
  const now = performance.now();
  if (now-lastRain < 1300) return;
  lastRain = now;rainStarted = now;
  const colors=['#c4f877','#78dcdf','#c3adff','#ffcc85'];
  const count=width<700?30:48;
  for (let i=0;i<count;i++) devices.push({
    type:i%3,color:colors[i%colors.length],size:.7+Math.random()*.8,
    x:25+Math.random()*Math.max(0,width-50),y:i<12?40+Math.random()*100:-30-Math.random()*400,
    vx:(Math.random()-.5)*45,vy:110+Math.random()*130,
    angle:(Math.random()-.5)*1.4,spin:(Math.random()-.5)*1.5,phase:Math.random()*6.28
  });
  devices=devices.slice(-72);
  hint('Forecast: 100% gadgets. No screens were harmed.');
  // Paint the first cluster immediately, then let the rest fall into view.
  if (!rainFrame) { lastTime=now;drawRain(now); }
}
document.addEventListener('click', event => {
  const button=event.target.closest('[data-device-rain]');
  if (!button || button.disabled || document.body.classList.contains('busy')) return;
  makeItRain();
});
document.addEventListener('desk:motion', event => {
  enabled=event.detail.enabled && !reduced.matches;
  if (!enabled) { hideGlow();clearRain(); }
});
reduced.addEventListener('change', () => {
  enabled=root.dataset.motion!=='off' && !reduced.matches;
  if (!enabled) { hideGlow();clearRain(); }
});
document.addEventListener('desk:lock', () => { hideGlow();clearRain(); });
document.addEventListener('visibilitychange', () => { if(document.hidden){hideGlow();clearRain();} });
addEventListener('resize', resize, {passive:true});
resize();
