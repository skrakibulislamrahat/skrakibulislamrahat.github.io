const DATA = window.SITE_DATA;
let activePublicationFilter = "All";

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function el(id) {
  return document.getElementById(id);
}

function linkButton(label, url, extraClass = "") {
  const safeLabel = escapeHTML(label);
  if (!url) {
    return `<span class="mini-btn mini-btn-disabled ${extraClass}">${safeLabel}</span>`;
  }
  return `<a class="mini-btn ${extraClass}" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
}

function chip(label, cls = "") {
  return `<span class="chip ${cls}">${escapeHTML(label)}</span>`;
}

function contactCard(title, body) {
  return `
    <article class="contact-card glass-card">
      <h3>${escapeHTML(title)}</h3>
      <p>${body}</p>
    </article>
  `;
}

function allPublications() {
  return Object.entries(DATA.publications).flatMap(([group, items]) =>
    items.map(item => ({ ...item, group }))
  );
}

function publicationTypeClass(type = "") {
  const normalized = type.toLowerCase();
  if (normalized.includes("journal")) return "chip-journal";
  if (normalized.includes("conference")) return "chip-conf";
  if (normalized.includes("review")) return "chip-review";
  return "";
}

function initProfile() {
  const { profile, hero } = DATA;

  document.title = `${profile.name} | Medical AI`;
  el("brandName").textContent = profile.brandName;
  el("heroPill").textContent = hero.pill;
  el("heroTitle").textContent = hero.title;
  el("heroDescription").textContent = hero.description;
  el("heroNote").textContent = hero.note;
  el("profilePhoto").src = profile.headshot;
  el("profilePhoto").alt = `${profile.name} headshot`;
  el("profileName").textContent = profile.name;
  el("profileMeta").textContent = `${profile.title} · ${profile.affiliation} · ${profile.location}`;
  el("researchDirection").textContent = DATA.researchDirection;
  el("footerText").textContent = `© ${new Date().getFullYear()} ${profile.name}`;

  el("heroActions").innerHTML = [
    linkButton("Google Scholar", profile.scholar, "btn btn-primary"),
    `<a class="btn btn-secondary" href="resume.html" target="_blank" rel="noopener noreferrer">Download / Print Resume</a>`,
    linkButton("Email", `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(profile.email)}`, "btn btn-ghost")
  ].join("");

  el("contactGrid").innerHTML = [
    contactCard("Email", `<a href="mailto:${escapeHTML(profile.email)}">${escapeHTML(profile.email)}</a>`),
    contactCard("Google Scholar", `<a href="${escapeHTML(profile.scholar)}" target="_blank" rel="noopener noreferrer">View citation profile</a>`),
    contactCard("ORCID", `<a href="${escapeHTML(profile.orcid)}" target="_blank" rel="noopener noreferrer">${escapeHTML(profile.orcidId)}</a>`)
  ].join("");
}

function initStats() {
  el("statsGrid").innerHTML = DATA.stats.map((item, index) => `
    <article class="stat glass-card reveal-soft" style="--delay:${index * 80}ms">
      <strong data-count="${escapeHTML(item.value)}">0</strong>
      <span>${escapeHTML(item.label)}</span>
    </article>
  `).join("");
}

function initBento() {
  const stats = DATA.stats || [];
  const pubs = allPublications();
  const publishedCount = pubs.filter(p => !String(p.type).toLowerCase().includes("review")).length;
  const reviewCount = pubs.filter(p => String(p.type).toLowerCase().includes("review")).length;
  const coreAreas = DATA.about.coreAreas.slice(0, 4);

  el("bentoGrid").innerHTML = `
    <article class="bento-card bento-wide glass-card">
      <span class="dash-label">Research focus</span>
      <h3>Medical AI reliability under real-world shift</h3>
      <p>${escapeHTML(DATA.about.paragraphs[0])}</p>
    </article>
    <article class="bento-card glass-card">
      <span class="bento-number">${escapeHTML(stats[0]?.value || "—")}</span>
      <p>${escapeHTML(stats[0]?.label || "Citation metric")}</p>
    </article>
    <article class="bento-card glass-card">
      <span class="bento-number">${publishedCount}</span>
      <p>Published / indexed outputs listed</p>
    </article>
    <article class="bento-card glass-card">
      <span class="bento-number">${reviewCount}</span>
      <p>Current manuscripts under review</p>
    </article>
    <article class="bento-card bento-tall glass-card">
      <span class="dash-label">Core methods</span>
      <ul class="compact-list">
        ${coreAreas.map(area => `<li>${escapeHTML(area)}</li>`).join("")}
      </ul>
    </article>
  `;
}

function initLists() {
  el("aboutSubtitle").textContent = DATA.about.subtitle;
  el("aboutBody").innerHTML = DATA.about.paragraphs.map(p => `<p>${escapeHTML(p)}</p>`).join("");
  el("coreAreasList").innerHTML = DATA.about.coreAreas.map(item => `<li>${escapeHTML(item)}</li>`).join("");
}

function initFeatured() {
  el("featuredGrid").innerHTML = DATA.featured.map((item, index) => `
    <article class="feature-card glass-card reveal-soft" style="--delay:${index * 90}ms">
      <div class="chip-row">
        ${chip(item.status, item.status === "Published" ? "chip-journal" : "chip-review")}
        ${chip(item.venue)}
        ${item.highlight ? chip(item.highlight, "chip-accent") : ""}
      </div>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.description)}</p>
      <div class="card-line"></div>
    </article>
  `).join("");
}

function initVisuals() {
  el("visualGrid").innerHTML = DATA.visuals.map((item, index) => `
    <article class="visual-card glass-card reveal-soft" style="--delay:${index * 100}ms">
      <div class="visual-image-wrap">
        <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.alt)}" />
      </div>
      <div class="visual-body">
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description)}</p>
      </div>
    </article>
  `).join("");
}

function initPublicationFilters() {
  const groups = Object.keys(DATA.publications);
  const filters = ["All", ...groups];

  el("publicationFilters").innerHTML = filters.map(filter => `
    <button class="filter-btn ${filter === activePublicationFilter ? "active" : ""}" type="button" data-filter="${escapeHTML(filter)}">
      ${escapeHTML(filter)}
    </button>
  `).join("");

  el("publicationFilters").addEventListener("click", event => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    activePublicationFilter = button.dataset.filter;
    initPublicationFilters();
    initPublications();
  }, { once: true });
}

function publicationCard(item, index) {
  const links = (item.links || []).map(link => linkButton(link.label, link.url)).join("");
  return `
    <article class="pub-card glass-card reveal-soft" data-group="${escapeHTML(item.group)}" style="--delay:${Math.min(index, 6) * 50}ms">
      <div class="pub-top">
        <div>
          <div class="chip-row">
            ${chip(item.type, publicationTypeClass(item.type))}
            ${chip(item.year)}
            ${chip(item.group)}
          </div>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.venue)}</p>
          ${item.description ? `<p>${escapeHTML(item.description)}</p>` : ""}
        </div>
        <div class="pub-year">${escapeHTML(item.year)}</div>
      </div>
      ${links ? `<div class="link-row">${links}</div>` : ""}
    </article>
  `;
}

function initPublications() {
  const entries = Object.entries(DATA.publications).filter(([group]) =>
    activePublicationFilter === "All" || group === activePublicationFilter
  );

  const total = entries.reduce((sum, [, items]) => sum + items.length, 0);
  el("publicationCount").textContent = `${total} item${total === 1 ? "" : "s"} shown`;

  el("publicationsList").innerHTML = entries.map(([group, items]) => `
    <div class="pub-group">
      <div class="group-label">${escapeHTML(group)}</div>
      <div class="pub-list">
        ${items.map((item, index) => publicationCard({ ...item, group }, index)).join("")}
      </div>
    </div>
  `).join("");

  requestAnimationFrame(() => {
    document.querySelectorAll("#publicationsList .reveal-soft").forEach(card => card.classList.add("visible"));
  });
}

function timelineCard(item, index) {
  return `
    <article class="timeline-card glass-card reveal-soft" style="--delay:${index * 70}ms">
      <span class="timeline-dot"></span>
      <h3>${escapeHTML(item.title)}</h3>
      <div class="meta">${escapeHTML(item.meta)}</div>
      <p>${escapeHTML(item.description)}</p>
    </article>
  `;
}

function initEducationExperience() {
  el("educationList").innerHTML = DATA.education.map(timelineCard).join("");
  el("experienceList").innerHTML = DATA.experience.map(timelineCard).join("");
}

function initService() {
  const review = DATA.service.reviews;
  const certs = DATA.service.certifications;

  el("serviceGrid").innerHTML = `
    <article class="service-card glass-card">
      <h3>${escapeHTML(review.title)}</h3>
      <div class="chip-row">${chip(review.count, "chip-accent")}</div>
      <ul class="list">
        ${review.items.map(item => `<li>${escapeHTML(item)}</li>`).join("")}
      </ul>
    </article>
    <article class="service-card glass-card">
      <h3>Certifications</h3>
      <div class="link-row">
        ${certs.map(item => linkButton(item.label, item.url)).join("")}
      </div>
    </article>
  `;
}

function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = el("navLinks");

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  links.addEventListener("click", event => {
    if (event.target.tagName === "A") {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function init() {
  if (!DATA) return;
  initProfile();
  initStats();
  initBento();
  initLists();
  initFeatured();
  initVisuals();
  initPublicationFilters();
  initPublications();
  initEducationExperience();
  initService();
  initMobileNav();
}

document.addEventListener("DOMContentLoaded", init);
