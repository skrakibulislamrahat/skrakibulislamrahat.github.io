/* One renderer and one stylesheet own the portfolio. */
(() => {
  'use strict';
  const data = window.SITE_DATA;
  if (!data) return;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const esc = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const link = (href, label, cls = '') => `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motionEase = 'cubic-bezier(.22,1,.36,1)';
  let motionPreference = null;
  try {motionPreference = localStorage.getItem('rahat-motion');} catch (_) {}
  let motionEnabled = motionPreference ? motionPreference === 'on' : !reducedMotion.matches;
  document.documentElement.dataset.motion = motionEnabled ? 'on' : 'off';
  const entrances = new WeakMap();
  function enter(element, distance = 18, delay = 0) {
    if (!element || !motionEnabled || !element.animate) return;
    entrances.get(element)?.cancel();
    const animation = element.animate([{opacity:0,transform:`translateY(${distance}px)`},{opacity:1,transform:'translateY(0)'}],{duration:600,delay,easing:motionEase,fill:'backwards'});
    entrances.set(element,animation);
    return animation;
  }
  const swaps = new Map();
  function stopSwap(container) {
    const state = swaps.get(container);
    if (!state) return;
    state.animations.forEach(animation => animation.cancel());
    state.ghost?.remove();
    container.style.height = '';container.style.overflow = '';
    swaps.delete(container);
  }
  // Keep the old content long enough to fade out, while the new content takes its place.
  // A new selection cancels the previous transition; the latest selection always wins.
  function transitionContent(container, render) {
    const from = container.getBoundingClientRect().height;
    stopSwap(container);
    if (!motionEnabled || !container.animate || !container.childElementCount) {render();return;}
    const ghost = container.cloneNode(true);
    ghost.removeAttribute('id');
    ghost.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    ghost.setAttribute('aria-hidden','true');ghost.inert = true;
    ghost.classList.add('transition-ghost');
    render();
    const to = container.getBoundingClientRect().height;
    const children = [...container.children].filter(element => !element.hidden);
    container.append(ghost);
    container.style.height = `${from}px`;container.style.overflow = 'hidden';
    const height = container.animate([{height:`${from}px`},{height:`${to}px`}],{duration:560,easing:motionEase,fill:'both'});
    const fade = ghost.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-10px)'}],{duration:200,easing:'ease-out',fill:'forwards'});
    const state = {ghost,animations:[height,fade]};swaps.set(container,state);
    children.forEach((element,index) => {const animation = enter(element,20,100 + Math.min(index * 30,180));if(animation)state.animations.push(animation);});
    fade.finished.then(() => ghost.remove(), () => {});
    height.finished.then(() => {if(swaps.get(container) === state){container.style.height='';container.style.overflow='';height.cancel();}}, () => {});
    // Entry animations may outlast the height change. Release references after they settle.
    Promise.allSettled(state.animations.map(animation => animation.finished)).then(() => {if(swaps.get(container)===state)stopSwap(container);});
  }
  window.addEventListener('resize', () => [...swaps.keys()].forEach(stopSwap), {passive:true});
  function setupMotion() {
    function sync() {
      document.documentElement.dataset.motion = motionEnabled ? 'on' : 'off';
      $$('[data-motion-toggle]').forEach(button => {
        button.setAttribute('aria-pressed',String(motionEnabled));
        button.querySelector('.motion-label').textContent = motionEnabled ? 'Motion on' : 'Motion off';
        button.querySelector('span').textContent = motionEnabled ? 'Ⅱ' : '▷';
      });
      if (!motionEnabled) {
        [...swaps.keys()].forEach(stopSwap);
        document.getAnimations().forEach(animation => {if (!(animation instanceof CSSAnimation)) {try {animation.finish();} catch (_) {animation.cancel();}}});
      }
      document.dispatchEvent(new CustomEvent('motionchange'));
    }
    $$('[data-motion-toggle]').forEach(button => button.addEventListener('click', () => {
      motionEnabled = !motionEnabled;motionPreference = motionEnabled ? 'on' : 'off';
      try {localStorage.setItem('rahat-motion',motionPreference);} catch (_) {}
      sync();
    }));
    reducedMotion.addEventListener('change', () => {if(!motionPreference){motionEnabled=!reducedMotion.matches;sync();}});
    sync();
  }
  const themes = [
    ['What did the model actually learn?', 'Testing sensitivity to cues outside the retinal field.', '#c4f877'],
    ['Does the evidence travel?', 'Evaluating the same model beyond its development dataset.', '#67d8db'],
    ['Is its confidence warranted?', 'Checking whether predicted probabilities match observed outcomes.', '#ad9aff'],
    ['Can knowledge make reasoning more reliable?', 'Exploring explicit semantics and knowledge-guided methods.', '#f0bc81']
  ];
  function drawOrb() {
    let lines = '';
    for (let n = -8; n <= 8; n++) {
      const y = n * 13.7;
      const r = Math.sqrt(1 - (n / 9) ** 2);
      lines += `<ellipse cx="240" cy="${175 + y}" rx="${128*r}" ry="${26*r}" fill="none" stroke="currentColor" stroke-width=".65" opacity=".28"/>`;
    }
    for (let n = 0; n < 12; n++) lines += `<ellipse cx="240" cy="175" rx="${12+n*10.6}" ry="128" fill="none" stroke="currentColor" stroke-width=".65" opacity=".23" transform="rotate(-24 240 175)"/>`;
    let dots = '';
    for (let n=0;n<55;n++) {const a=n*2.399963;const r=144+((n*29)%43);dots+=`<circle cx="${240+Math.cos(a)*r*1.1}" cy="${175+Math.sin(a)*r*.79}" r="${n%7===0?2:1}" fill="currentColor" opacity="${.2+(n%5)/10}"/>`;}
    $('#researchOrb').innerHTML = `<defs><radialGradient id="orbGlow"><stop stop-color="currentColor" stop-opacity=".17"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs><circle cx="240" cy="175" r="171" fill="url(#orbGlow)"/><g class="orb-field"><g class="orb-mesh">${lines}</g><g class="orb-orbits"><ellipse cx="240" cy="175" rx="198" ry="57" fill="none" stroke="currentColor" stroke-width=".7" opacity=".35" transform="rotate(-24 240 175)"/><ellipse cx="240" cy="175" rx="183" ry="108" fill="none" stroke="currentColor" stroke-width=".6" opacity=".24" transform="rotate(29 240 175)"/><circle cx="56" cy="226" r="4" fill="currentColor"/><circle cx="398" cy="122" r="3" fill="currentColor"/></g><g class="orb-stars">${dots}</g><g class="orb-satellites"><circle cx="240" cy="45" r="4" fill="currentColor"/><circle cx="240" cy="305" r="2.5" fill="currentColor"/><circle cx="108" cy="175" r="2" fill="currentColor"/></g></g><circle cx="240" cy="175" r="71" fill="#0c1822" opacity=".85"/>`;
    const card = $('.constellation'), control = $('#orbControl');
    const destinations = [
      ['artifacts', 'Explore the artifact study'],
      ['semantic', 'Explore dataset shift'],
      ['calibration', 'Explore the calibration audit'],
      [null, 'Explore my doctoral direction']
    ];
    let current = 0, angle = 0, gesture = null, ignoreClickUntil = 0;
    function setTheme(index) {
      current = (index + themes.length) % themes.length;
      const theme = themes[current];
      $$('.theme-switch button').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.theme) === current)));
      card.style.setProperty('--accent', theme[2]);
      angle = current * 38;
      card.style.setProperty('--field-rotation', `${angle}deg`);
      $('#themeQuestion').textContent = theme[0];
      $('#themeDescription').textContent = theme[1];
      $('#themeIndex').textContent = `0${current + 1} / 04`;
      $('#themeExplore span').textContent = destinations[current][1];
      $('#themeExplore').href = destinations[current][0] ? '#evidence' : '#about';
      enter($('.theme-caption'), 7);
    }
    $$('.theme-switch button').forEach(button => button.addEventListener('click', () => setTheme(Number(button.dataset.theme))));
    control.addEventListener('click', event => {
      if (event.detail && performance.now() < ignoreClickUntil) return;
      setTheme(current + 1);
    });
    control.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      setTheme(current + (event.key === 'ArrowRight' ? 1 : -1));
    });
    control.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      gesture = {id:event.pointerId, x:event.clientX, y:event.clientY, dx:0, horizontal:false};
    });
    control.addEventListener('pointermove', event => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
      if (!gesture.horizontal && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        gesture.horizontal = true;
        control.setPointerCapture(event.pointerId);
        card.classList.add('is-dragging');
      }
      if (!gesture.horizontal) return;
      gesture.dx = dx;
      if (motionEnabled) card.style.setProperty('--field-rotation', `${angle + Math.max(-65,Math.min(65,dx * .3))}deg`);
    });
    function finishGesture(event) {
      if (!gesture || gesture.id !== event.pointerId) return;
      const completed = event.type === 'pointerup' && gesture.horizontal;
      const dx = gesture.dx;
      gesture = null;
      card.classList.remove('is-dragging');
      if (control.hasPointerCapture(event.pointerId)) control.releasePointerCapture(event.pointerId);
      if (completed) {
        ignoreClickUntil = performance.now() + 500;
        setTheme(current + (Math.abs(dx) > 30 ? (dx < 0 ? 1 : -1) : 0));
      } else card.style.setProperty('--field-rotation', `${angle}deg`);
    }
    control.addEventListener('pointerup', finishGesture);
    control.addEventListener('pointercancel', finishGesture);
    // Pointer capture is acquired only for a horizontal gesture: vertical scrolling remains native.
    control.addEventListener('pointerleave', event => {if (gesture && !gesture.horizontal) finishGesture(event);});
    $('#themeExplore').addEventListener('click', event => {
      const study = destinations[current][0];
      if (!study) return;
      event.preventDefault();
      selectStudy(study);
      $('#evidence').scrollIntoView({behavior:!motionEnabled ? 'instant' : 'smooth'});
      $(`#tab-${study}`).focus({preventScroll:true});
    });
    card.style.setProperty('--accent', themes[0][2]);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => card.classList.toggle('orb-offscreen', !entries[0].isIntersecting),{threshold:0,rootMargin:'100px'}).observe(control);
    }
  }

  const graphics = [
    `<rect x="107" y="15" width="85" height="85" rx="10" fill="none" stroke="currentColor" stroke-dasharray="4 5" opacity=".65"/><circle cx="150" cy="57" r="29" fill="currentColor" opacity=".09"/><circle cx="150" cy="57" r="25" fill="none" stroke="currentColor"/><path d="M143 40l12 19 14 6M155 59l-14 17M153 57l-19-4" stroke="currentColor" fill="none"/><path d="M220 57h50m-6-5 6 5-6 5" stroke="currentColor"/><rect x="298" y="15" width="85" height="85" rx="10" fill="none" stroke="currentColor" opacity=".18"/><circle cx="340" cy="57" r="35" stroke="currentColor" fill="currentColor" fill-opacity=".06"/><path d="M330 34l14 25 18 8M344 59l-17 22M342 55l-23-3" stroke="currentColor" fill="none"/>`,
    `<path d="M90 56h100M300 56h100M190 56l36-22 42 44 32-22" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="90" cy="56" r="28" fill="currentColor" fill-opacity=".07" stroke="currentColor"/><circle cx="400" cy="56" r="28" fill="currentColor" fill-opacity=".07" stroke="currentColor"/><rect x="220" y="28" width="50" height="56" rx="9" fill="#101822" stroke="currentColor" stroke-dasharray="3 4"/><path d="M80 56h20m-10-10v20M390 56h20" stroke="currentColor"/><path d="M240 48c0-7 12-7 12 0 0 5-6 4-6 10m0 7v1" stroke="currentColor" fill="none"/>`,
    `<path d="M85 89h320M85 89V15" stroke="currentColor" opacity=".24"/><path d="M105 83l290-67" stroke="currentColor" stroke-dasharray="4 5" opacity=".5"/><path d="M105 84C175 85 220 71 252 64S330 27 395 15" stroke="currentColor" stroke-width="2" fill="none"/><path d="M105 84C150 83 215 85 258 77S349 68 395 52" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".4"/><circle cx="252" cy="64" r="4" fill="currentColor"/><circle cx="347" cy="28" r="3" fill="currentColor"/>`,
    `<g fill="currentColor" opacity=".22"><rect x="80" y="39" width="11" height="44" rx="2"/><rect x="98" y="32" width="11" height="51" rx="2"/><rect x="116" y="27" width="11" height="56" rx="2"/><rect x="134" y="34" width="11" height="49" rx="2"/><rect x="152" y="30" width="11" height="53" rx="2"/></g><g fill="currentColor" opacity=".65"><rect x="210" y="31" width="11" height="52" rx="2"/><rect x="228" y="26" width="11" height="57" rx="2"/><rect x="246" y="33" width="11" height="50" rx="2"/><rect x="264" y="29" width="11" height="54" rx="2"/><rect x="282" y="33" width="11" height="50" rx="2"/></g><g fill="currentColor" opacity=".35"><rect x="340" y="36" width="11" height="47" rx="2"/><rect x="358" y="30" width="11" height="53" rx="2"/><rect x="376" y="40" width="11" height="43" rx="2"/><rect x="394" y="33" width="11" height="50" rx="2"/><rect x="412" y="35" width="11" height="48" rx="2"/></g><path d="M65 89h375" stroke="currentColor" opacity=".2"/>`
  ];
  function renderProjects() {
    $('#projects').innerHTML=data.projects.map((p,i)=>`<article class="project glow-card" id="project-${p.id}"><div class="project-top"><span class="project-number">STUDY / ${p.number}</span><span class="project-status">${esc(p.status)}</span></div><div class="project-graphic" aria-hidden="true"><svg viewBox="0 0 490 115">${graphics[i]}</svg></div><div class="project-category">${esc(p.category)}</div><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p><div class="topic-tags">${p.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="project-footer">${link(p.repo,'Code')}${link(p.details,'Study details')}<button type="button" data-open-study="${p.id}">Explore evidence <span aria-hidden="true">↗</span></button></div></article>`).join('');
    $$('[data-open-study]').forEach(b=>b.addEventListener('click',()=>{selectStudy(b.dataset.openStudy);$('#evidence').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$(`#tab-${b.dataset.openStudy}`).focus({preventScroll:true});}));
  }
  function bar(label,value,clean=false){return `<div class="chart-row ${clean?'clean':''}"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="--value:${value*100}%"></div></div><b>${value.toFixed(4)}</b></div>`;}
  const panels = [
    {id:'artifacts',kicker:'APTOS → PROCESSED MESSIDOR-2',title:'Less background sensitivity. Still no external gain.',body:'CLEAN training reduced EfficientNet-B0’s measured background sensitivity, but its mean external ROC-AUC decreased. Robustness to a nuisance and cross-dataset discrimination are different properties.',stat:'12 models',statLabel:'2 architectures × 2 training regimes × 3 seeds',visual:`<div class="chart-box"><div class="chart-top"><strong>EXTERNAL ROC-AUC</strong><span>3-SEED MEANS</span></div><div class="bar-legend"><span>RAW training</span><span>CLEAN training</span></div><div class="bar-group"><span>ResNet-18</span>${bar('RAW',.6347)}${bar('CLEAN',.6305,true)}</div><div class="bar-group"><span>EfficientNet-B0</span>${bar('RAW',.6118)}${bar('CLEAN',.5722,true)}</div><div class="chart-axis"><span>0</span><span>0.5</span><span>1.0</span></div><p class="chart-caption">ROC-AUC scale: 0–1. All models evaluated on the same processed Messidor-2 representation. CLEAN − RAW: −0.0042 (ResNet-18), −0.0396 (EfficientNet-B0).</p></div><div class="range-chips"><div><strong>0.9963–0.9992</strong><span>Internal AUC · 12 variants</span></div><div><strong>0.5643–0.6642</strong><span>External AUC · 12 variants</span></div></div>`},
    {id:'semantic',kicker:'KAGGLE · RSNA · CHEXPERT',title:'Similar labels can hide very different tasks.',body:'Cross-dataset transport changes both calibration and high-confidence error. The source and target prediction tasks need to be examined explicitly.',stat:'5 seeds',statLabel:'DenseNet-121 · multiple source–target tasks',visual:`<div class="transfer-cases"><div class="transfer-case"><p>Kaggle Pneumonia → RSNA Lung Opacity</p><div><div><strong>0.476</strong><span>Calibration error (ECE)</span></div><div><strong>0.337</strong><span>HCER at 0.90</span></div></div></div><div class="transfer-case good"><p>CheXpert Lung Opacity → Consolidation</p><div><div><strong>0.927</strong><span>AUROC</span></div><div><strong>0.009</strong><span>HCER at 0.90</span></div></div></div></div><p class="chart-caption">Selected task pairs, not an overall study average. HCER describes the reported high-confidence error rate at the 0.90 threshold.</p><button type="button" class="figure-expand" data-figure="semantic">Compare reported high-confidence errors <span aria-hidden="true">↗</span></button>`},
    {id:'calibration',kicker:'FINALIZED CALIBRATION AUDIT · SEED 0',title:'Every probability needs a reliability check.',body:'The saved evaluation record reports calibration error alongside discrimination. These source and external snapshots have different calibration states; they are not a matched before-and-after comparison.',stat:'15 bins',statLabel:'Expected calibration error · lower is better',visual:`<div class="calibration-pair"><div class="calibration-row"><p>APTOS TEST / CALIBRATED · N = 733</p><div class="calibration-values snapshot-values"><div><strong>0.0266</strong><span>ECE-15</span></div><div><strong>0.0565</strong><span>Brier score</span></div></div></div><div class="calibration-row"><p>MESSIDOR-2 / UNCALIBRATED · N = 1,058</p><div class="calibration-values snapshot-values"><div><strong>0.2683</strong><span>ECE-15</span></div><div><strong>0.2902</strong><span>Brier score</span></div></div></div></div><p class="chart-caption">ResNet-18 CCR, seed 0. Values from the repository’s finalized metric files. The external reliability diagram uses predicted-class confidence.</p><button type="button" class="figure-expand" data-figure="calibration">Inspect the external reliability diagram <span aria-hidden="true">↗</span></button>`},
    {id:'lightweight',kicker:'APTOS 2019 · FIVE-FOLD EVALUATION',title:'A small ranking difference needs a statistical check.',body:'Compact CNNs are compared using out-of-fold predictions and paired McNemar tests. Close AUROC values alone do not establish a meaningful winner.',stat:'5 folds',statLabel:'Stratified evaluation · out-of-fold predictions',visual:`<div class="chart-box"><div class="chart-top"><strong>MODEL COMPARISON</strong><span>AUROC · MEAN ± SD</span></div>${[['EfficientNet-B0','0.9839','0.0054'],['MobileNetV2','0.9847','0.0048'],['SqueezeNet 1.0','0.9813','0.0069']].map(m=>`<div class="model-result"><div><p>${m[0]}</p><span>SD ± ${m[2]}</span></div><strong>${m[1]}</strong></div>`).join('')}<p class="chart-caption">No significant pairwise difference at α = 0.05 in the reported McNemar tests (p = 0.298, 0.164, 0.706).</p></div>`}
  ];
  function renderEvidence(){
    $('#evidencePanels').innerHTML=panels.map((p,i)=>`<article class="evidence-panel" id="panel-${p.id}" role="tabpanel" aria-labelledby="tab-${p.id}" tabindex="0" ${i?'hidden':''}><div class="evidence-copy"><span class="eyebrow">${p.kicker}</span><h3>${p.title}</h3><p>${p.body}</p><div class="study-stat"><strong>${p.stat}</strong><span>${p.statLabel}</span></div><div class="study-links">${link(data.projects[i].repo,'Repository')}${link(data.projects[i].details,'Methods & results')}</div></div><div class="evidence-visual">${p.visual}</div></article>`).join('');
    const tabs=$$('[data-study]');
    tabs.forEach((tab,index)=>{
      tab.addEventListener('click',()=>selectStudy(tab.dataset.study));
      tab.addEventListener('keydown',event=>{let n=index;if(event.key==='ArrowRight')n=(index+1)%tabs.length;else if(event.key==='ArrowLeft')n=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')n=0;else if(event.key==='End')n=tabs.length-1;else return;event.preventDefault();selectStudy(tabs[n].dataset.study);tabs[n].focus();});
    });
  }
  function selectStudy(id) {
    const next = $(`#panel-${id}`);
    if (!next || !next.hidden) return;
    $$('[data-study]').forEach(tab => {const selected=tab.dataset.study===id;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    transitionContent($('#evidencePanels'), () => $$('.evidence-panel').forEach(panel => panel.hidden=panel!==next));
    animateEvidence(next);
  }
  function animateEvidence(panel) {
    if (!motionEnabled) return;
    panel.querySelectorAll('.bar-fill').forEach((bar,index) => bar.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:850,delay:180+index*65,easing:motionEase,fill:'backwards'}));
  }
  function renderPublications(){
    const filters=[['All','All'],['Journal Articles','Journals'],['Conference Papers','Conferences'],['Manuscripts','Manuscripts']];
    const pubs=Object.entries(data.publications).flatMap(([group,items])=>items.map(p=>({...p,group})));
    let current='All',expanded=false;
    $('#publicationFilters').innerHTML=filters.map(([key,label])=>`<button type="button" data-filter="${key}" aria-pressed="${key===current}">${label}</button>`).join('');
    const draw=(animated=false)=>{
      const filtered=pubs.filter(p=>current==='All'||p.group===current),visible=expanded?filtered:filtered.slice(0,5);
      const render=()=>{$('#publicationList').innerHTML=visible.map(p=>{const url=p.links?.[0]?.url;return `<article class="publication-row"><span class="publication-year">${esc(p.year)}</span><div>${p.group==='Manuscripts'?`<span class="pub-status">${esc(p.type)}</span>`:''}<h3>${url?link(url,p.title):esc(p.title)}</h3><p>${esc(p.venue)}${p.group==='Manuscripts'?' · '+esc(p.description):''}</p></div>${url?`<a class="publication-arrow" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Read ${esc(p.title)}">↗</a>`:'<span aria-hidden="true"></span>'}</article>`;}).join('');};
      if(animated)transitionContent($('#publicationList'),render);else render();
      $('#publicationCount').textContent=`${visible.length} of ${filtered.length} entries`;
      $('#showPublications').hidden=filtered.length<=5;
      $('#showPublications').setAttribute('aria-expanded',String(expanded));
      $('#showPublications').textContent=expanded?'Show fewer ↑':`View all ${filtered.length} entries ↓`;
      $$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===current)));
    };
    $$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{if(current===button.dataset.filter)return;current=button.dataset.filter;expanded=false;draw(true);}));
    $('#showPublications').addEventListener('click',()=>{expanded=!expanded;draw(true);});
    draw();
  }
  function renderProfile(){
    const stats=data.stats.map(s=>({...s}));
    stats[1].value=String((data.publications['Journal Articles']||[]).length+(data.publications['Conference Papers']||[]).length);
    stats[2].value=String(data.service.reviews.total);
    $('#metrics').innerHTML=stats.map(s=>`<div><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></div>`).join('')+'<p>Medical imaging.<br>Reliable ML.<br><span>Knowledge engineering.</span></p>';
    $('#education').innerHTML=data.education.map((e,i)=>{const [school,date]=e.meta.split(' · ');return `<article class="education-item"><span>${esc(date)}</span><h3>${esc(e.title)}</h3><p>${esc(school)}</p>${i===0?`<small>Advisor: ${esc(data.profile.advisor)}</small>`:''}</article>`;}).join('');
    $('#reviewTotal').textContent=data.service.reviews.total;
    $('#reviewJournals').innerHTML=data.service.reviews.items.map(j=>`<li>${esc(j)}</li>`).join('');
    $('#certifications').innerHTML=data.service.certifications.map(c=>c.url?link(c.url,c.label):`<span>${esc(c.label)}</span>`).join('');
  }
  function setupNavigation() {
    const toggle=$('.menu-toggle'),nav=$('#navigation'),desktop=matchMedia('(min-width:681px)');
    let animation;
    function setMenu(open, instant=false) {
      if(animation){animation.cancel();animation=null;}
      toggle.setAttribute('aria-expanded',String(open));toggle.querySelector('span').textContent=open?'−':'+';
      if(instant || !motionEnabled || desktop.matches){nav.classList.toggle('open',open);return;}
      if(open)nav.classList.add('open');
      const frames=open?[{opacity:0,transform:'translateY(-12px)'},{opacity:1,transform:'translateY(0)'}]:[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-12px)'}];
      animation=nav.animate(frames,{duration:230,easing:motionEase});
      animation.onfinish=()=>{nav.classList.toggle('open',open);animation=null;};
    }
    toggle.addEventListener('click',()=>setMenu(toggle.getAttribute('aria-expanded')!=='true'));
    $$('#navigation a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
    $('.brand').addEventListener('click',()=>setMenu(false));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){setMenu(false);toggle.focus();}});
    document.addEventListener('click',e=>{if(!e.target.closest('.site-header')&&toggle.getAttribute('aria-expanded')==='true')setMenu(false);});
    desktop.addEventListener('change',()=>setMenu(false,true));
    if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){$$('#navigation a').forEach(a=>{if(a.hash===`#${e.target.id}`)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}});},{rootMargin:'-15% 0px -60% 0px',threshold:0});$$('main section[id]').forEach(section=>observer.observe(section));}
  }
  function setupFigures(){
    const figures={semantic:['assets/research/semantic_hcer_verified.svg','High-confidence errors after task transfer','Five reported source–target pairs, reproduced from semantic-shift-chest-xray/RESULTS.md. Lower HCER is better.'],calibration:['assets/research/calibration_seed0_verified.png','External reliability · Messidor-2 · seed 0','Original finalized figure: metrics_fixed/seed_0_messidor2_reliability_predconf_fixed.png. ResNet-18 CCR, uncalibrated, N = 1,058.']};
    const dialog=$('#figureDialog');let opener,closing=false;
    function closeFigure() {
      if(closing || !dialog.open)return;
      if(!motionEnabled){dialog.close();return;}
      closing=true;dialog.getAnimations().forEach(animation=>animation.cancel());
      const animation=dialog.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.96)'}],{duration:200,easing:'ease-in',fill:'forwards'});
      animation.onfinish=()=>{dialog.close();animation.cancel();closing=false;};
    }
    $$('[data-figure]').forEach(button=>button.addEventListener('click',()=>{
      opener=button;const [src,title,caption]=figures[button.dataset.figure];
      $('#dialogImage').src=src;$('#dialogImage').alt=title;$('#figureTitle').textContent=title;$('#dialogCaption').textContent=caption;
      dialog.showModal();if(motionEnabled)dialog.animate([{opacity:0,transform:'translateY(16px) scale(.95)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:360,easing:motionEase});
    }));
    $('#closeFigure').addEventListener('click',closeFigure);
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeFigure();});
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeFigure();}});
    dialog.addEventListener('close',()=>{closing=false;if(opener)opener.focus({preventScroll:true});});
  }
  function setupJournals() {
    const details = $('.journal-details'), summary = details.querySelector('summary'), content = $('#journalContent');
    let animation = null, expanded = details.open;
    summary.setAttribute('aria-expanded', String(expanded));
    function settle() {
      if (animation) {animation.cancel();animation = null;}
      details.open = expanded;
      content.style.height = '';
    }
    summary.addEventListener('click', event => {
      if (!content.animate || !motionEnabled) return;
      event.preventDefault();
      const from = details.open ? content.getBoundingClientRect().height : 0;
      expanded = !expanded;
      summary.setAttribute('aria-expanded', String(expanded));
      details.classList.toggle('is-expanded', expanded);
      if (animation) animation.cancel();
      details.open = true;
      content.style.height = 'auto';
      const to = expanded ? content.scrollHeight : 0;
      content.style.height = `${from}px`;
      animation = content.animate([{height:`${from}px`,opacity:from ? 1 : 0},{height:`${to}px`,opacity:expanded ? 1 : 0}],{duration:420,easing:motionEase,fill:'both'});
      animation.onfinish = settle;
    });
    details.addEventListener('toggle', () => {
      if (animation) return;
      expanded = details.open;
      summary.setAttribute('aria-expanded', String(expanded));
      details.classList.toggle('is-expanded', expanded);
    });
    document.addEventListener('motionchange', () => {if (!motionEnabled) settle();});
    window.addEventListener('resize', () => {if (animation) settle();}, {passive:true});
  }
  function setupScrollMotion() {
    if (!('IntersectionObserver' in window)) return;
    const visibleProjects = new Set();
    const projectObserver = new IntersectionObserver(entries=>entries.forEach(entry=>{
      entry.target.classList.toggle('in-view',entry.isIntersecting);
      if(entry.isIntersecting)visibleProjects.add(entry.target);else visibleProjects.delete(entry.target);
    }),{threshold:.12});
    $$('.project').forEach(project=>projectObserver.observe(project));
    const observer = new IntersectionObserver(entries => {
      entries.filter(entry=>entry.isIntersecting).forEach((entry,index)=>{
        observer.unobserve(entry.target);enter(entry.target,28,Math.min(index*80,240));
        if(entry.target.id==='evidencePanels')animateEvidence(entry.target);
      });
    }, {threshold:.08});
    $$('.section-heading,.project,.education-item,.service-card,.contact-panel,#evidencePanels,.metrics-strip').forEach(element=>observer.observe(element));
    const progress=document.createElement('div');progress.className='reading-progress';progress.setAttribute('aria-hidden','true');$('.site-header').append(progress);
    let scheduled=false;
    function update() {
      scheduled=false;
      const distance=document.documentElement.scrollHeight-document.documentElement.clientHeight;
      progress.style.transform=`scaleX(${distance>0?Math.max(0,Math.min(1,window.scrollY/distance)):0})`;
      visibleProjects.forEach(project=>{
        const rect=project.getBoundingClientRect();
        const travel=Math.max(-1,Math.min(1,(window.innerHeight*.5-rect.top-rect.height*.5)/window.innerHeight));
        project.style.setProperty('--graphic-drift',motionEnabled?`${travel*26}px`:'0px');
        project.style.setProperty('--scan-position',`${Math.round(50+travel*70)}%`);
      });
    }
    function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
    window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});
    document.addEventListener('motionchange',schedule);
    if('ResizeObserver'in window)new ResizeObserver(schedule).observe(document.body);
    update();
  }
  function setupGlow() {
    const aura=$('.pointer-aura'),canvas=$('#touchLight'),context=canvas.getContext('2d');
    let pointer={x:-1000,y:-1000},queued=false,litCard=null,cardTimer;
    let particles=[],finger={x:0,y:0},lastPoint=null,active=false,lastTouch=0,frame=0;
    function resize(){const dpr=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.round(window.innerWidth*dpr);canvas.height=Math.round(window.innerHeight*dpr);context?.setTransform(dpr,0,0,dpr,0,0);}
    resize();window.addEventListener('resize',resize,{passive:true});
    function lightCard(x,y) {
      const card=document.elementFromPoint(x,y)?.closest('.glow-card');
      if(litCard && litCard!==card)litCard.classList.remove('is-touched');
      litCard=card;
      if(!card)return;
      const rect=card.getBoundingClientRect();card.style.setProperty('--mx',`${x-rect.left}px`);card.style.setProperty('--my',`${y-rect.top}px`);card.classList.add('is-touched');
      clearTimeout(cardTimer);cardTimer=setTimeout(()=>{litCard?.classList.remove('is-touched');litCard=null;},700);
    }
    function paint(now) {
      frame=0;if(!context)return;
      context.clearRect(0,0,window.innerWidth,window.innerHeight);
      if(!motionEnabled || document.hidden){particles=[];return;}
      particles=particles.filter(p=>now-p.born<650);
      const alpha=active?1:Math.max(0,1-(now-lastTouch)/420);
      if(alpha>0){
        const glow=context.createRadialGradient(finger.x,finger.y,0,finger.x,finger.y,155);
        glow.addColorStop(0,`rgba(174,250,165,${.18*alpha})`);glow.addColorStop(.35,`rgba(103,216,219,${.07*alpha})`);glow.addColorStop(1,'rgba(103,216,219,0)');
        context.fillStyle=glow;context.fillRect(0,0,window.innerWidth,window.innerHeight);
      }
      particles.forEach(p=>{const age=(now-p.born)/650;context.beginPath();context.arc(p.x,p.y-age*8,1.5+(1-age)*2,0,Math.PI*2);context.fillStyle=`rgba(196,248,119,${(1-age)*.6})`;context.fill();});
      if(active||particles.length||alpha>0)frame=requestAnimationFrame(paint);
    }
    function touch(x,y){
      finger={x,y};active=true;lastTouch=performance.now();lightCard(x,y);
      if(!motionEnabled)return;
      if(!lastPoint||Math.hypot(x-lastPoint.x,y-lastPoint.y)>12){particles.push({x,y,born:lastTouch});particles=particles.slice(-24);lastPoint={x,y};}
      if(!frame)frame=requestAnimationFrame(paint);
    }
    // Passive Touch Events continue during native phone scrolling, after pointercancel.
    document.addEventListener('touchstart',event=>{const point=event.touches[0];if(point)touch(point.clientX,point.clientY);},{passive:true});
    document.addEventListener('touchmove',event=>{const point=event.touches[0];if(point)touch(point.clientX,point.clientY);},{passive:true});
    function release(){active=false;lastPoint=null;lastTouch=performance.now();}
    document.addEventListener('touchend',release,{passive:true});document.addEventListener('touchcancel',release,{passive:true});
    document.addEventListener('pointermove',event=>{
      if(event.pointerType==='touch')return;
      pointer={x:event.clientX,y:event.clientY};
      if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;aura.style.setProperty('--pointer-x',`${pointer.x}px`);aura.style.setProperty('--pointer-y',`${pointer.y}px`);lightCard(pointer.x,pointer.y);});}
    },{passive:true});
    document.addEventListener('pointerdown',event=>lightCard(event.clientX,event.clientY),{passive:true});
    window.addEventListener('scroll',()=>{if(active)lightCard(finger.x,finger.y);},{passive:true});
    document.addEventListener('motionchange',()=>{if(!motionEnabled){particles=[];active=false;if(frame)cancelAnimationFrame(frame);frame=0;context?.clearRect(0,0,canvas.width,canvas.height);}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){release();particles=[];}});
  }
  function setupPressFeedback() {
    function pulse(target,x,y) {
      if(!motionEnabled||!target.animate)return;
      const rect=target.getBoundingClientRect(),ring=document.createElement('span');
      ring.className='tap-ring';ring.setAttribute('aria-hidden','true');
      ring.style.left=`${x-rect.left}px`;ring.style.top=`${y-rect.top}px`;target.classList.add('pressable');target.append(ring);
      const scale=Math.max(rect.width,rect.height)/10;
      const animation=ring.animate([{opacity:.3,transform:'translate(-50%,-50%) scale(0)'},{opacity:0,transform:`translate(-50%,-50%) scale(${scale})`}],{duration:650,easing:'ease-out'});
      animation.onfinish=()=>ring.remove();animation.oncancel=()=>ring.remove();
    }
    const selector='button:not(.orb-stage):not([data-hello]),.button,.theme-explore,.publication-arrow,.nav-cv';
    document.addEventListener('pointerdown',event=>{const target=event.target.closest(selector);if(target)pulse(target,event.clientX,event.clientY);},{passive:true});
    document.addEventListener('click',event=>{if(event.detail!==0)return;const target=event.target.closest(selector);if(target){const rect=target.getBoundingClientRect();pulse(target,rect.left+rect.width/2,rect.top+rect.height/2);}});
  }
  function setupPlay() {
    const toast=$('#playfulToast'),shower=$('#retinaShower');let toastTimer,lastRain=-5000,taps=0;
    function say(message) {
      clearTimeout(toastTimer);toast.textContent=message;toast.classList.add('visible');
      toastTimer=setTimeout(()=>toast.classList.remove('visible'),3400);
    }
    function rain() {
      if(!motionEnabled){say('The retinas are resting. Switch Motion on to wake them up.');return;}
      const now=performance.now();if(now-lastRain<2400)return;lastRain=now;
      say('A 100% chance of retinas. No patient data involved.');
      for(let i=0;i<9;i++){
        const retina=document.createElement('img');retina.src='assets/retina-doodle.svg';retina.alt='';retina.width=36;retina.height=36;shower.append(retina);
        const size=26+Math.random()*20,x=18+Math.random()*Math.max(0,window.innerWidth-72),drift=(Math.random()-.5)*60;
        retina.style.width=`${size}px`;retina.style.height=`${size}px`;
        const animation=retina.animate([
          {transform:`translate3d(${x}px,-60px,0) rotate(-25deg)`,opacity:0},
          {opacity:.88,offset:.12},
          {opacity:.88,offset:.78},
          {transform:`translate3d(${x+drift}px,${window.innerHeight+60}px,0) rotate(${160+Math.random()*120}deg)`,opacity:0}
        ],{duration:1900+Math.random()*650,delay:i*75,easing:'cubic-bezier(.32,.02,.74,.63)',fill:'backwards'});
        animation.onfinish=()=>retina.remove();animation.oncancel=()=>retina.remove();
      }
    }
    $$('[data-hello]').forEach(button=>button.addEventListener('click',()=>{
      const messages=['Ouch. That’s a researcher, not a button.','My confidence is uncalibrated before coffee.','Fine. A tiny retinal shower. For science.'];
      const n=taps++%3;say(messages[n]);
      if(motionEnabled)$('.portrait-button').animate([{transform:'rotate(0)'},{transform:'rotate(-9deg) scale(.96)'},{transform:'rotate(7deg)'},{transform:'rotate(0)'}],{duration:450,easing:'ease-out'});
      if(n===2)rain();
    }));
    $('#retinaRain').addEventListener('click',rain);
    document.addEventListener('motionchange',()=>{if(!motionEnabled){shower.getAnimations({subtree:true}).forEach(animation=>animation.cancel());shower.replaceChildren();}});
  }
  drawOrb();renderProjects();renderEvidence();renderPublications();renderProfile();setupNavigation();setupFigures();setupGlow();setupJournals();setupScrollMotion();setupPlay();setupPressFeedback();setupMotion();
  // Keep previous public deep links useful after the redesign.
  const aliases={'#thesis':'#research','#trajectory':'#about','#project-semantic-shift':'#project-semantic'};
  const target=aliases[location.hash]||location.hash;
  if(target){const el=document.getElementById(target.slice(1));if(el)requestAnimationFrame(()=>el.scrollIntoView());}
})();
