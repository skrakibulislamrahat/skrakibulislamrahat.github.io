(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initCursorField() {
    if (reducedMotion || !window.matchMedia('(pointer:fine)').matches) return;
    document.addEventListener('pointermove', (event) => {
      document.documentElement.style.setProperty('--cursor-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--cursor-y', `${event.clientY}px`);
    }, { passive: true });
  }

  function initLabParallax() {
    const lab = document.getElementById('heroLab');
    const viewport = document.getElementById('labViewport');
    if (!lab || !viewport || reducedMotion || !window.matchMedia('(pointer:fine)').matches) return;

    lab.addEventListener('pointermove', (event) => {
      const rect = lab.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      lab.style.setProperty('--mx', `${x * 100}%`);
      lab.style.setProperty('--my', `${y * 100}%`);
      const rx = (0.5 - y) * 2.2;
      const ry = (x - 0.5) * 2.8;
      lab.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    lab.addEventListener('pointerleave', () => {
      lab.style.transform = '';
      lab.style.setProperty('--mx', '75%');
      lab.style.setProperty('--my', '20%');
    });
  }

  function animateBars(panel) {
    panel.querySelectorAll('.metric-bar-row b[data-width]').forEach((bar) => {
      bar.style.width = '0';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        bar.style.width = `${Math.min(Number(bar.dataset.width) || 0, 100)}%`;
      }));
    });

    panel.querySelectorAll('.model-row[data-value]').forEach((row) => {
      const bar = row.querySelector('i b');
      if (!bar) return;
      const value = Number(row.dataset.value) || 0;
      const visual = Math.max(0, Math.min(100, (value - 90) * 10));
      bar.style.width = '0';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        bar.style.width = `${visual}%`;
      }));
    });
  }

  function initObservatory() {
    const index = document.getElementById('observatoryIndex');
    const stage = document.getElementById('observatoryStage');
    if (!index || !stage) return;

    const tabs = [...index.querySelectorAll('.obs-tab')];
    const panels = [...stage.querySelectorAll('.obs-panel')];

    const activate = (id, focus = false) => {
      tabs.forEach((tab) => {
        const active = tab.dataset.panel === id;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.setAttribute('tabindex', active ? '0' : '-1');
        if (active && focus) tab.focus();
      });

      panels.forEach((panel) => {
        const active = panel.dataset.obsPanel === id;
        panel.hidden = !active;
        panel.classList.toggle('active', active);

        // artifact-refresh.css intentionally uses display: ... !important for its
        // custom layout. Force hidden panels off with equal priority so the
        // visual panel always matches the selected tab.
        if (active) {
          panel.style.removeProperty('display');
          animateBars(panel);
        } else {
          panel.style.setProperty('display', 'none', 'important');
        }
      });
    };

    index.addEventListener('click', (event) => {
      const tab = event.target.closest('.obs-tab');
      if (tab) activate(tab.dataset.panel);
    });

    index.addEventListener('keydown', (event) => {
      const current = tabs.indexOf(document.activeElement);
      if (current < 0 || !['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(event.key)) return;
      event.preventDefault();
      const direction = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
      const next = (current + direction + tabs.length) % tabs.length;
      activate(tabs[next].dataset.panel, true);
    });

    activate('artifact');
  }

  function initLightbox() {
    const lightbox = document.getElementById('figureLightbox');
    const image = document.getElementById('lightboxImage');
    const caption = document.getElementById('lightboxCaption');
    if (!lightbox || !image || !caption) return;

    const close = () => {
      lightbox.hidden = true;
      document.body.style.overflow = '';
      image.removeAttribute('src');
    };

    document.querySelectorAll('.lightbox-trigger').forEach((figure) => {
      const open = () => {
        image.src = figure.dataset.full || figure.querySelector('img')?.src || '';
        caption.textContent = figure.dataset.caption || figure.querySelector('figcaption')?.textContent || '';
        lightbox.hidden = false;
        document.body.style.overflow = 'hidden';
        lightbox.querySelector('.lightbox-close')?.focus();
      };
      figure.addEventListener('click', (event) => {
        if (event.target.closest('a')) return;
        open();
      });
      figure.querySelector('button')?.addEventListener('click', (event) => {
        event.stopPropagation();
        open();
      });
    });

    lightbox.querySelector('.lightbox-close')?.addEventListener('click', close);
    lightbox.addEventListener('click', (event) => { if (event.target === lightbox) close(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !lightbox.hidden) close(); });
  }

  function initSpotlightCards() {
    if (reducedMotion || !window.matchMedia('(pointer:fine)').matches) return;
    document.querySelectorAll('.obs-panel, .project-card, .atlas-shell').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
        card.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
      });
    });
  }

  function initInstrumentObserver() {
    const targets = document.querySelectorAll('.observatory, .atlas-shell');
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('instrument-live');
        const panel = entry.target.querySelector('.obs-panel:not([hidden])');
        if (panel) animateBars(panel);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.18 });
    targets.forEach((target) => observer.observe(target));
  }

  function installV6Styles() {
    if (document.querySelector('link[data-research-v6]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/research-lab-v6.css?v=6.0';
    link.dataset.researchV6 = 'true';
    document.head.appendChild(link);
  }

  function patchV6Figures() {
    const artifact = document.querySelector('[data-obs-panel="artifact"] .scientific-frame');
    if (artifact) {
      artifact.dataset.full = 'assets/fig_gradcam_audit.png';
      const img = artifact.querySelector('img');
      if (img) {
        img.src = 'assets/fig_gradcam_audit.png';
        img.loading = 'lazy';
        img.decoding = 'async';
      }
      document.querySelectorAll('[data-obs-panel="artifact"] .obs-metrics span').forEach((el) => {
        if (el.textContent.includes('AUM')) el.textContent = el.textContent.replace('AUM', 'AUC');
      });
    }

    const calibration = document.querySelector('[data-obs-panel="calibration"] .scientific-frame');
    if (calibration) {
      calibration.dataset.full = 'assets/fig_reliability_shift.png';
      const img = calibration.querySelector('img');
      if (img) {
        img.src = 'assets/fig_reliability_shift.png';
        img.loading = 'lazy';
        img.decoding = 'async';
      }
    }

    const semantic = document.querySelector('[data-obs-panel="semantic"] .scientific-frame');
    if (semantic) {
      semantic.classList.remove('lightbox-trigger');
      semantic.classList.add('semantic-matrix-frame');
      semantic.removeAttribute('data-full');
      semantic.removeAttribute('data-caption');
      semantic.setAttribute('aria-label', 'High-confidence error transfer matrix');
      semantic.innerHTML = `
        <div class="figure-toolbar"><span>FIG / 02</span><span>HCER@0.90 TRANSFER MATRIX</span><span class="figure-status">LIVE MATRIX</span></div>
        <div class="heatmap-scroll" tabindex="0" aria-label="Scrollable high-confidence error matrix">
          <div class="heatmap-grid">
            <div class="hm-corner">SOURCE ↓ / TARGET →</div>
            <div class="hm-col">Kaggle<br>Pneumonia</div><div class="hm-col">RSNA<br>Opacity</div><div class="hm-col">CheXpert<br>Pneumonia</div><div class="hm-col">CheXpert<br>Opacity</div><div class="hm-col">CheXpert<br>Consolid.</div><div class="hm-col">CheXpert<br>Composite</div>
            <div class="hm-row">Kaggle<br>Pneumonia</div><div class="hm-cell hm2">.072</div><div class="hm-cell hm5">.337</div><div class="hm-cell hm4">.199</div><div class="hm-cell hm1">.048</div><div class="hm-cell hm5">.325</div><div class="hm-cell hm0">.016</div>
            <div class="hm-row">RSNA<br>Opacity</div><div class="hm-cell hm0">.015</div><div class="hm-cell hm1">.022</div><div class="hm-cell hm2">.094</div><div class="hm-cell hm3">.104</div><div class="hm-cell hm1">.026</div><div class="hm-cell hm3">.104</div>
            <div class="hm-row">CheXpert<br>Pneumonia</div><div class="hm-cell hm1">.038</div><div class="hm-cell hm2">.050</div><div class="hm-cell hm1">.038</div><div class="hm-cell hm0">.013</div><div class="hm-cell hm0">.011</div><div class="hm-cell hm0">.012</div>
            <div class="hm-row">CheXpert<br>Opacity</div><div class="hm-cell hm1">.036</div><div class="hm-cell hm1">.020</div><div class="hm-cell hm2">.055</div><div class="hm-cell hm1">.032</div><div class="hm-cell hm0">.009</div><div class="hm-cell hm1">.031</div>
          </div>
        </div>
        <div class="heatmap-legend"><span>lower error</span><i></i><span>higher error</span></div>
        <figcaption>High-confidence error rate at confidence ≥ 0.90. The matrix keeps the source/target structure visible instead of collapsing transfer into one score.</figcaption>`;
    }
  }

  function patchPortfolioConsistency() {
    const reviewCount = String(window.SITE_DATA?.service?.reviews?.count || '').match(/\d+/)?.[0];
    if (reviewCount) {
      document.querySelectorAll('.signal-stat').forEach((stat) => {
        const label = stat.querySelector('span');
        const value = stat.querySelector('strong');
        if (label && value && /verified peer reviews/i.test(label.textContent || '')) {
          value.textContent = reviewCount;
        }
      });
    }

    const calibrationCopy = document.querySelector('[data-obs-panel="calibration"] .obs-copy > p');
    if (calibrationCopy) {
      calibrationCopy.textContent = 'Temperature scaling changes APTOS ECE only marginally because the source model is already well calibrated; the large Messidor-2 calibration gap also remains almost unchanged after source-fitted scaling.';
    }
  }

  function finalizeArtifactPresentation() {
    const clean = () => {
      const panel = document.querySelector('[data-obs-panel="artifact"]');
      const figure = panel?.querySelector('.scientific-frame');
      if (!panel || !figure) return;

      // The SVG contains its own FIG / 01 title strip. Remove the page-level
      // duplicate so the visual has one clean hierarchy.
      figure.querySelector(':scope > .figure-toolbar')?.remove();
      figure.setAttribute('aria-label', 'Artifact robustness study figure. Click to expand.');

      // Preserve the current observatory state after artifact-refresh.css loads.
      if (panel.hidden) panel.style.setProperty('display', 'none', 'important');
    };

    clean();
    // portfolio.js rebuilds the artifact figure in a zero-delay task; run once
    // after that rebuild as well.
    setTimeout(clean, 0);
  }

  function initFigureFallbacks() {
    document.querySelectorAll('.scientific-frame img').forEach((img) => {
      img.addEventListener('error', () => {
        const frame = img.closest('.scientific-frame');
        if (!frame || frame.classList.contains('image-error')) return;
        frame.classList.add('image-error');
        const fallback = document.createElement('div');
        fallback.className = 'figure-fallback';
        fallback.innerHTML = '<div><strong>Figure unavailable</strong><br><span>The research links and metrics remain available.</span></div>';
        img.after(fallback);
      }, { once: true });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    installV6Styles();
    patchV6Figures();
    patchPortfolioConsistency();
    initCursorField();
    initLabParallax();
    initObservatory();
    initLightbox();
    finalizeArtifactPresentation();
    initSpotlightCards();
    initInstrumentObserver();
    initFigureFallbacks();
  });
})();
