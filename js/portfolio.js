const SITE = window.SITE_DATA || {};

const PROFILE = SITE.profile || {};
const PUBLICATIONS = SITE.publications || {};

const PROJECTS = [
  {
    id: "artifacts",
    number: "01",
    theme: "Shortcut learning · Fundus AI",
    title: "Exposing Dataset Artifacts",
    question: "Can a diabetic-retinopathy model look right for the wrong reason?",
    summary: "A six-stage reproducibility pipeline that audits border and acquisition artifacts, compares artifact-retaining vs artifact-aware training, and tests external generalization on Messidor-2.",
    signal: "6-stage public pipeline",
    signalLabel: "auditable notebooks",
    status: "Active research",
    links: [
      ["Repository", "https://github.com/skrakibulislamrahat/Exposing_Dataset_Artifacts"],
      ["Reproduce", "https://github.com/skrakibulislamrahat/Exposing_Dataset_Artifacts/blob/main/REPRODUCIBILITY.md"],
      ["Data", "https://github.com/skrakibulislamrahat/Exposing_Dataset_Artifacts/blob/main/DATA_AVAILABILITY.md"],
      ["Cite", "https://github.com/skrakibulislamrahat/Exposing_Dataset_Artifacts/blob/main/CITATION.cff"]
    ]
  },
  {
    id: "semantic-shift",
    number: "02",
    theme: "Semantic shift · Chest X-ray",
    title: "Same Label, Different Disease",
    question: "Do labels that sound clinically similar actually transport as the same prediction task?",
    summary: "Five-seed DenseNet-121 experiments across Kaggle, RSNA, and CheXpert test semantic transport, source-only operating-point transfer, calibration, and high-confidence failure.",
    signal: "0.476 ECE",
    signalLabel: "Kaggle pneumonia → RSNA lung opacity",
    status: "Research project",
    links: [
      ["Repository", "https://github.com/skrakibulislamrahat/semantic-shift-chest-xray"],
      ["Reproduce", "https://github.com/skrakibulislamrahat/semantic-shift-chest-xray/blob/main/REPRODUCIBILITY.md"],
      ["Results", "https://github.com/skrakibulislamrahat/semantic-shift-chest-xray/blob/main/RESULTS.md"],
      ["Cite", "https://github.com/skrakibulislamrahat/semantic-shift-chest-xray/blob/main/CITATION.cff"]
    ]
  },
  {
    id: "calibration",
    number: "03",
    theme: "Calibration · Dataset shift",
    title: "Calibration-Aware DR Reliability",
    question: "When discrimination survives a shift, do the probabilities still deserve trust?",
    summary: "An experiment-audit bundle preserving seeds, split definitions, environment snapshots, finalized metrics, predictions, tables, and figures for traceable reliability analysis.",
    signal: "Audit-ready",
    signalLabel: "configs → splits → predictions → figures",
    status: "Artifact bundle",
    links: [
      ["Repository", "https://github.com/skrakibulislamrahat/calibration-aware-dr-reliability"],
      ["Audit index", "https://github.com/skrakibulislamrahat/calibration-aware-dr-reliability/blob/main/ARTIFACT_INDEX.md"],
      ["Metrics", "https://github.com/skrakibulislamrahat/calibration-aware-dr-reliability/tree/main/metrics_fixed"],
      ["Cite", "https://github.com/skrakibulislamrahat/calibration-aware-dr-reliability/blob/main/CITATION.cff"]
    ]
  },
  {
    id: "lightweight",
    number: "04",
    theme: "Efficient AI · Retinal screening",
    title: "Lightweight DR Detection Models",
    question: "Can compact models stay competitive without hiding instability behind one lucky split?",
    summary: "A five-fold comparison of EfficientNet-B0, MobileNetV2, and SqueezeNet with out-of-fold evaluation, McNemar testing, and reproducible analysis scripts.",
    signal: "0.9847 AUROC",
    signalLabel: "MobileNetV2 · 5-fold mean",
    status: "Active research",
    links: [
      ["Repository", "https://github.com/skrakibulislamrahat/Lightweight_DR_Detection_Models"],
      ["Protocol", "https://github.com/skrakibulislamrahat/Lightweight_DR_Detection_Models/blob/main/EXPERIMENT_PROTOCOL.md"],
      ["Results", "https://github.com/skrakibulislamrahat/Lightweight_DR_Detection_Models/blob/main/RESULTS.md"],
      ["Cite", "https://github.com/skrakibulislamrahat/Lightweight_DR_Detection_Models/blob/main/CITATION.cff"]
    ]
  }
];

const esc = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function allPublications() {
  const output = [];
  Object.entries(PUBLICATIONS).forEach(([group, items]) => {
    (Array.isArray(items) ? items : []).forEach(item => output.push({ ...item, group }));
  });
  return output;
}

function publishedCount() {
  return allPublications().filter(item => !String(item.group).toLowerCase().includes("review")).length;
}

function setupProfile() {
  document.title = `${PROFILE.name || "SK Rakib Ul Islam Rahat"} | Trustworthy AI Research`;

  const name = document.querySelector("[data-profile-name]");
  if (name) name.textContent = PROFILE.name || "SK Rakib Ul Islam Rahat";

  const meta = document.querySelector("[data-profile-meta]");
  if (meta) meta.textContent = `${PROFILE.title || "PhD Student in Computer Science"} · ${PROFILE.affiliation || "Wright State University"}`;

  const photo = document.querySelector("[data-profile-photo]");
  if (photo) {
    photo.src = PROFILE.headshot || "assets/headshot.png";
    photo.alt = `${PROFILE.name || "SK Rakib Ul Islam Rahat"} headshot`;
  }

  const stats = document.getElementById("signalStats");
  if (stats) {
    stats.innerHTML = [
      ["100+", "citations"],
      [String(publishedCount()), "published works"],
      ["5+", "verified peer reviews"]
    ].map(([value, label]) => `<div class="signal-stat"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join("");
  }
}

function renderProjects() {
  const target = document.getElementById("projectStack");
  if (!target) return;

  target.innerHTML = PROJECTS.map(project => `
    <article class="project-card reveal" id="project-${esc(project.id)}">
      <div class="project-index">${esc(project.number)}</div>
      <div class="project-copy">
        <div class="project-topline">
          <span class="project-theme">${esc(project.theme)}</span>
          <span class="project-status">${esc(project.status)}</span>
        </div>
        <h3>${esc(project.title)}</h3>
        <p class="project-question">${esc(project.question)}</p>
        <p class="project-summary">${esc(project.summary)}</p>
        <div class="project-actions">
          ${project.links.map(([label, href], index) => `<a class="project-link ${index === 0 ? "primary" : ""}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span>↗</span></a>`).join("")}
        </div>
      </div>
      <div class="project-signal">
        <span class="signal-kicker">Research signal</span>
        <strong>${esc(project.signal)}</strong>
        <span>${esc(project.signalLabel)}</span>
      </div>
    </article>
  `).join("");

  if (window.location.hash.startsWith("#project-")) {
    requestAnimationFrame(() => {
      const requested = document.querySelector(window.location.hash);
      if (requested) requested.scrollIntoView({ block: "center" });
    });
  }
}

function renderPublications() {
  const target = document.getElementById("publicationRows");
  const filters = document.getElementById("publicationFilters");
  const toggle = document.getElementById("publicationToggle");
  if (!target || !filters || !toggle) return;

  const items = allPublications();
  let active = "All";
  let expanded = false;
  const filterNames = ["All", "Journal Articles", "Conference Papers", "Manuscripts Under Review"];

  const draw = () => {
    const filtered = active === "All" ? items : items.filter(item => item.group === active);
    const visible = expanded ? filtered : filtered.slice(0, 6);

    target.innerHTML = visible.map((item, index) => {
      const primaryLink = Array.isArray(item.links) && item.links.length ? item.links[0].url : "";
      return `
        <article class="publication-row reveal">
          <div class="publication-number">${String(index + 1).padStart(2, "0")}</div>
          <div class="publication-main">
            <div class="publication-meta">${esc(item.year || "")} · ${esc(item.group.replace(" Articles", "").replace(" Papers", ""))}</div>
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.venue || item.description || "")}</p>
          </div>
          ${primaryLink ? `<a class="publication-open" href="${esc(primaryLink)}" target="_blank" rel="noopener noreferrer" aria-label="Open publication">↗</a>` : `<span class="publication-open muted">—</span>`}
        </article>`;
    }).join("");

    toggle.hidden = filtered.length <= 6;
    toggle.textContent = expanded ? "Show less" : `View all ${filtered.length}`;
    [...filters.querySelectorAll("button")].forEach(button => button.classList.toggle("active", button.dataset.filter === active));
    initReveal();
  };

  filters.innerHTML = filterNames.map(name => `<button type="button" data-filter="${esc(name)}">${name === "Manuscripts Under Review" ? "Under review" : name.replace(" Articles", "").replace(" Papers", "")}</button>`).join("");

  filters.addEventListener("click", event => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    active = button.dataset.filter;
    expanded = false;
    draw();
  });

  toggle.addEventListener("click", () => {
    expanded = !expanded;
    draw();
  });

  draw();
}

function renderTimeline() {
  const target = document.getElementById("timelineGrid");
  if (!target) return;

  const education = Array.isArray(SITE.education) ? SITE.education : [];
  const experience = Array.isArray(SITE.experience) ? SITE.experience : [];

  const timeline = [
    education[0],
    experience[1],
    education[1],
    education[2],
    education[3]
  ].filter(Boolean);

  target.innerHTML = timeline.map((item, index) => `
    <article class="timeline-item reveal">
      <div class="timeline-dot"></div>
      <div>
        <span class="timeline-step">${index === 0 ? "Now" : String(index).padStart(2, "0")}</span>
        <h3>${esc(item.title)}</h3>
        <p class="timeline-meta">${esc(item.meta)}</p>
        <p class="timeline-description">${esc(item.description)}</p>
      </div>
    </article>
  `).join("");
}

function renderService() {
  const service = SITE.service || {};
  const target = document.getElementById("serviceCompact");
  if (!target) return;

  const reviewItems = service.reviews?.items || [];
  const certifications = service.certifications || [];

  target.innerHTML = `
    <article class="service-block reveal">
      <span class="section-label">Scholarly service</span>
      <strong>${esc(service.reviews?.count || "5+ verified")}</strong>
      <p>Peer-review activity across robotics, electrical/computer engineering, and power-electronics journals.</p>
      <div class="micro-list">${reviewItems.map(item => `<span>${esc(item)}</span>`).join("")}</div>
    </article>
    <article class="service-block reveal">
      <span class="section-label">Research training</span>
      <strong>${certifications.length}</strong>
      <p>Selected certifications spanning data science, AI in healthcare, and peer-review practice.</p>
      <div class="micro-list">${certifications.map(item => item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.label)} ↗</a>` : `<span>${esc(item.label)}</span>`).join("")}</div>
    </article>`;
}

function initReveal() {
  const items = document.querySelectorAll(".reveal:not(.is-visible)");
  if (!("IntersectionObserver" in window)) {
    items.forEach(item => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach(item => observer.observe(item));
}

function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach(link => link.addEventListener("click", () => links.classList.remove("open")));
  }
}

function initContact() {
  const email = document.getElementById("contactEmail");
  if (email) {
    email.href = `mailto:${PROFILE.email || "skrakibulislamrahat@gmail.com"}`;
    email.textContent = PROFILE.email || "skrakibulislamrahat@gmail.com";
  }
  const footer = document.getElementById("footerText");
  if (footer) footer.textContent = `© ${new Date().getFullYear()} ${PROFILE.name || "SK Rakib Ul Islam Rahat"} · Research portfolio`;
}

function init() {
  setupProfile();
  renderProjects();
  renderPublications();
  renderTimeline();
  renderService();
  initContact();
  initNav();
  initReveal();
}

document.addEventListener("DOMContentLoaded", init);
