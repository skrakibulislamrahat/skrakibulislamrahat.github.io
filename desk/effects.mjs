// Presentation only. This module never reads the ledger, credentials, or GitHub.
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const preferenceKey = 'private-desk.motion.v1';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const animations = new Set();
let preference = 'on';
try { preference = localStorage.getItem(preferenceKey) || 'on'; } catch {}
let motion = false;

function animate(element, frames, options) {
  if (!motion || !element?.animate) return;
  const animation = element.animate(frames, options);
  animations.add(animation);
  animation.finished.catch(() => {}).finally(() => animations.delete(animation));
}

function applyMotion() {
  motion = preference !== 'off' && !reducedMotion.matches;
  document.documentElement.dataset.motion = motion ? 'on' : 'off';
  for (const button of $$('[data-motion-toggle]')) {
    button.textContent = motion ? 'Motion on' : 'Motion off';
    button.setAttribute('aria-pressed', String(motion));
    button.title = reducedMotion.matches ? 'Your device’s reduced-motion setting is respected.' : 'Turn decorative animation on or off';
  }
  if (!motion) {
    for (const animation of animations) animation.cancel();
    clearSparks();
  }
  document.dispatchEvent(new CustomEvent('desk:motion', {detail: {enabled: motion}}));
}

const canvas = $('#desk-sparks');
const ctx = canvas.getContext('2d');
let particles = [], frame = 0, lastFrame = 0, width = 0, height = 0;
function resizeCanvas() {
  width = innerWidth; height = innerHeight;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
}
function clearSparks() {
  cancelAnimationFrame(frame); frame = 0; lastFrame = 0; particles = [];
  ctx?.clearRect(0, 0, width, height);
}
function addSparks(x, y, count = 1) {
  if (!motion || !ctx || document.hidden || $('#play-dialog').open || $('#modal').open) return;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = count > 1 ? 25 + Math.random() * 45 : 8;
    particles.push({x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, cyan: Math.random() > .5});
  }
  particles = particles.slice(-36);
  if (!frame) { lastFrame = performance.now(); frame = requestAnimationFrame(drawSparks); }
}
function drawSparks(now) {
  frame = 0;
  if (!motion || document.hidden) return clearSparks();
  const dt = Math.min((now - lastFrame) / 1000, .05); lastFrame = now;
  ctx.clearRect(0, 0, width, height);
  particles = particles.filter(p => p.life > 0);
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]; p.life -= dt * 1.5; p.x += p.vx * dt; p.y += p.vy * dt;
    ctx.globalAlpha = Math.max(0, p.life) * .55;
    ctx.fillStyle = p.cyan ? '#78dcdf' : '#c4f877';
    ctx.beginPath(); ctx.arc(p.x, p.y, 1.7, 0, Math.PI * 2); ctx.fill();
    const next = particles[i + 1];
    if (next && Math.hypot(next.x - p.x, next.y - p.y) < 55) {
      ctx.strokeStyle = '#b7e69a'; ctx.lineWidth = .5; ctx.globalAlpha *= .35;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(next.x, next.y); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  if (particles.length) frame = requestAnimationFrame(drawSparks);
}
resizeCanvas();
addEventListener('resize', resizeCanvas, {passive: true});
let lastPointer = 0;
document.addEventListener('pointermove', event => {
  if (!event.isPrimary || performance.now() - lastPointer < 35) return;
  lastPointer = performance.now(); addSparks(event.clientX, event.clientY);
}, {passive: true});
document.addEventListener('pointerdown', event => {
  if (event.target.closest('button:not(:disabled),.portfolio-link')) addSparks(event.clientX, event.clientY, 9);
}, {passive: true});

let previousView = null;
document.addEventListener('desk:unlock', () => { previousView = null; });
document.addEventListener('desk:render', event => {
  if (previousView === event.detail.view) return;
  previousView = event.detail.view;
  const sections = $$('#main > .page-head, #main > .panel, .overview-grid > .panel, #main > .activity-strip, #main > .mini-stats, #main > .row-list, #main > .selection-bar, #day-form .panel, #main > .settings-panel');
  sections.forEach((element, i) => animate(element, [
    {opacity: 0, transform: 'translateY(14px)'},
    {opacity: 1, transform: 'translateY(0)'}
  ], {duration: 500, delay: Math.min(i * 55, 220), easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards'}));
});
document.addEventListener('desk:paid', () => $('.report-total')?.classList.add('payment-celebration'));
document.addEventListener('input', event => {
  if (!event.target.closest('#day-form')) return;
  animate($('#day-total'), [{color: '#ffffff'}, {color: '#d1f6ab'}], {duration: 400});
});

const play = $('#play-dialog');
const grid = $('#phone-grid');
const phoneDrawing = '<svg viewBox="0 0 40 56" aria-hidden="true"><rect x="6" y="2" width="28" height="52" rx="6"/><path d="M16 7h8M18 49h4"/><path class="phone-crack" d="M23 14l-8 11 11 3-9 13M15 25l-5-4M26 28l4 6"/><path class="phone-check" d="M13 28l5 5 10-12"/></svg>';
for (let i = 0; i < 6; i++) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'game-phone'; button.dataset.phone = String(i);
  button.disabled = true; button.setAttribute('aria-label', `Phone ${i + 1}, ready`);
  button.innerHTML = phoneDrawing + '<span>Ready</span>'; grid.append(button);
}
const phones = $$('.game-phone');
let taps = 0, lastTap = 0, hintTimer, playing = false, untimed = false, score = 0, target = -1, deadline = 0, timer;

function secretHint(message) {
  clearTimeout(hintTimer); $('#secret-hint').textContent = message; $('#secret-hint').hidden = false;
  hintTimer = setTimeout(() => { $('#secret-hint').hidden = true; }, 3500);
}
function revealLab() {
  if (document.body.classList.contains('busy') || $('#modal').open) return;
  taps = 0; $('#secret-hint').hidden = true; clearSparks();
  if (!play.open) play.showModal();
}
function updatePhones() {
  phones.forEach((button, i) => {
    const active = playing && i === target;
    button.disabled = !playing; button.classList.toggle('is-target', active);
    button.setAttribute('aria-label', active ? `Repair phone ${i + 1}, cracked` : `Phone ${i + 1}, ready`);
    button.querySelector('span').textContent = active ? 'Repair me' : 'Ready';
  });
}
function nextPhone() {
  const choices = phones.map((_, i) => i).filter(i => i !== target);
  target = choices[Math.floor(Math.random() * choices.length)]; updatePhones();
}
function endGame(message) {
  clearInterval(timer); timer = null; playing = false; updatePhones();
  $('#game-mode').disabled = false; $('#game-start').textContent = 'Play again →';
  $('#game-message').textContent = message || `${score} ${score === 1 ? 'phone' : 'phones'} rescued. ${score >= 20 ? 'Peer review: excellent hands.' : score >= 10 ? 'Diagnostic complete. Snack recommended.' : 'Even engineers need a little play.'}`;
}
function tick() {
  const seconds = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
  $('#game-time').textContent = String(seconds);
  if (!seconds) endGame();
}
function startGame() {
  if (playing) { endGame(); return; }
  score = 0; target = -1; playing = true;
  $('#game-score').textContent = '0'; $('#game-time').textContent = untimed ? '∞' : '20';
  $('#game-message').textContent = untimed ? 'Take your time. Tap the glowing phone.' : 'Go! Tap the glowing phone.';
  $('#game-mode').disabled = true; $('#game-start').textContent = 'Finish break';
  nextPhone(); phones[target].focus();
  if (!untimed) { deadline = performance.now() + 20000; timer = setInterval(tick, 100); }
}
function repair(index) {
  if (!playing) return;
  if (!untimed && performance.now() >= deadline) { tick(); return; }
  if (index !== target) { $('#game-message').textContent = 'That one is ready. Find the glowing, cracked phone.'; return; }
  score++; $('#game-score').textContent = String(score);
  animate(phones[index], [{transform: 'scale(.94)', background: '#c4f877'}, {transform: 'scale(1)', background: '#11232a'}], {duration: 350, easing: 'ease-out'});
  animate($('#game-score'), [{transform: 'translateY(-3px)'}, {transform: 'translateY(0)'}], {duration: 200});
  if (score % 5 === 0) $('#game-message').textContent = `${score} rescued. ${score % 10 === 0 ? 'Precision looks good on you.' : 'A very good day at the tiny repair shop.'}`;
  nextPhone();
}
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled || document.body.classList.contains('busy')) return;
  if (button.hasAttribute('data-motion-toggle')) {
    if (reducedMotion.matches) { secretHint('Animation is off to respect your device’s reduced-motion setting.'); return; }
    preference = motion ? 'off' : 'on';
    try { localStorage.setItem(preferenceKey, preference); } catch {}
    applyMotion();
  }
  if (button.hasAttribute('data-secret-key')) {
    // Keyboard / assistive activation opens directly; pointer users discover three taps.
    if (event.detail === 0) { revealLab(); return; }
    const now = performance.now(); taps = now - lastTap < 3000 ? taps + 1 : 1; lastTap = now;
    animate(button, [{transform: 'rotate(0deg)'}, {transform: 'rotate(90deg)'}], {duration: 300});
    if (taps >= 3) revealLab();
    else secretHint(taps === 1 ? 'Curious? Tap the ◈ two more times.' : 'One more tap. Something small is waiting.');
  }
  if (button.hasAttribute('data-play-close')) play.close();
  if (button.id === 'game-start') startGame();
  if (button.id === 'game-mode' && !playing) {
    untimed = !untimed; button.setAttribute('aria-pressed', String(untimed));
    $('#game-time').textContent = untimed ? '∞' : '20';
    $('#game-time-label').textContent = untimed ? 'NO RUSH' : 'SECONDS';
  }
  if (button.hasAttribute('data-phone')) repair(Number(button.dataset.phone));
});
play.addEventListener('close', () => { if (playing) endGame(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { clearSparks(); if (playing) endGame(`Break paused. ${score} rescued. Ready for another round whenever you are.`); }
});
document.addEventListener('desk:lock', () => {
  if (play.open) play.close();
  if (playing) endGame();
  $('#secret-hint').hidden = true; previousView = null; clearSparks();
});
reducedMotion.addEventListener('change', applyMotion);
applyMotion();
