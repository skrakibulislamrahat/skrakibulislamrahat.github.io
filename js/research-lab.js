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
      // Expand the visual range (90-100) so very close AUROCs remain legible.
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
        if (active && focus) tab.focus();
      });
      panels.forEach((panel) => {
        const active = panel.dataset.obsPanel === id;
        panel.hidden = !active;
        panel.classList.toggle('active', active);
        if (active) animateBars(panel);
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

  document.addEventListener('DOMContentLoaded', () => {
    initCursorField();
    initLabParallax();
    initObservatory();
    initLightbox();
    initSpotlightCards();
    initInstrumentObserver();
  });
})();
