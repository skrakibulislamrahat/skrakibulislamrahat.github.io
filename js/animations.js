function initRevealAnimations() {
  const revealItems = document.querySelectorAll(".reveal, .reveal-soft");

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealItems.forEach(item => observer.observe(item));
}

function initNavActiveState() {
  const sections = [...document.querySelectorAll("section[id]")];
  const links = [...document.querySelectorAll(".nav-links a")];

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => {
        link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: "-35% 0px -55% 0px", threshold: 0.01 });

  sections.forEach(section => observer.observe(section));
}

function initCounterAnimation() {
  const counters = document.querySelectorAll("[data-count]");

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const element = entry.target;
      const raw = element.dataset.count || "0";
      const target = parseInt(raw.replace(/[^0-9]/g, ""), 10);

      if (Number.isNaN(target)) {
        element.textContent = raw;
        observer.unobserve(element);
        return;
      }

      const start = performance.now();
      const duration = 900;

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(target * eased);
        element.textContent = raw.replace(String(target), String(value));
        if (progress < 1) requestAnimationFrame(tick);
        else element.textContent = raw;
      }

      requestAnimationFrame(tick);
      observer.unobserve(element);
    });
  }, { threshold: 0.4 });

  counters.forEach(counter => observer.observe(counter));
}

document.addEventListener("DOMContentLoaded", () => {
  initRevealAnimations();
  initNavActiveState();
  initCounterAnimation();
});
