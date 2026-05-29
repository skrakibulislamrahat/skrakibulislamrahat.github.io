const DATA = window.SITE_DATA;

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
  if (!url) {
    return `<span class="mini-btn mini-btn-disabled ${extraClass}">${escapeHTML(label)}</span>`;
  }
  return `<a class="mini-btn ${extraClass}" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)}</a>`;
}

function chip(label, cls = "") {
  return `<span class="chip ${cls}">${escapeHTML(label)}</span>`;
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

  el("quickLinks").innerHTML = [
    linkButton("Website", profile.website),
    linkButton("ORCID", profile.orcid),
    linkButton("Email", `mailto:${profile.email}`)
  ].join("");

  el("contactGrid").innerHTML = [
    contactCard("Email", `<a href="mailto:${escapeHTML(profile.email)}">${escapeHTML(profile.email)}</a>`),
    contactCard("Google Scholar", `<a href="${escapeHTML(profile.scholar)}" target="_blank" rel="noopener noreferrer">View citation profile</a>`),
    contactCard("ORCID", `<a href="${escapeHTML(profile.orcid)}" target="_blank" rel="noopener noreferrer">${escapeHTML(profile.orcidId)}</a>`)
  ].join("");
}

function initStats() {
  el("statsGrid").innerHTML = DATA.stats.map(item => `
    <div class="stat">
      <strong>${escapeHTML(item.value)}</strong>
      <span>${escapeHTML(item.label)}</span>
    </div>
  `).join("");
}

function initLists() {
  el("strengthsList").innerHTML = DATA.strengths.map(item => `<li>${escapeHTML(item)}</li>`).join("");
  el("aboutSubtitle").textContent = DATA.about.subtitle;
  el("aboutBody").innerHTML = DATA.about.paragraphs.map(p => `<p>${escapeHTML(p)}</p>`).join("");
  el("coreAreasList").innerHTML = DATA.about.coreAreas.map(item => `<li>${escapeHTML(item)}</li>`).join("");
}

function initFeatured() {
  el("featuredGrid").innerHTML = DATA.featured.map(item => `
    <article class="feature-card">
      <div class="chip-row">
        ${chip(item.status, item.status === "Published" ? "chip-journal" : "chip-review")}
        ${chip(item.venue)}
        ${item.highlight ? chip(item.highlight, "chip-gradient") : ""}
      </div>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.description)}</p>
    </article>
  `).join("");
}

function initVisuals() {
  el("visualGrid").innerHTML = DATA.visuals.map(item => `
    <article class="feature-card visual-card">
      <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.alt)}" />
      <div class="visual-body">
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description)}</p>
      </div>
    </article>
  `).join("");
}

function publicationCard(item) {
  const chipClass =
    item.type === "Journal" ? "chip-journal" :
    item.type === "Conference" ? "chip-conf" :
    "chip-review";

  const links = (item.links || []).map(link => linkButton(link.label, link.url)).join("");

  return `
    <article class="pub-card">
      <div class="pub-top">
        <div>
          <div class="chip-row">
            ${chip(item.type, chipClass)}
            ${chip(item.year)}
          </div>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.venue)}</p>
        </div>
        <div class="pub-year">${escapeHTML(item.year)}</div>
      </div>
      ${item.description ? `<p>${escapeHTML(item.description)}</p>` : ""}
      ${links ? `<div class="link-row">${links}</div>` : ""}
    </article>
  `;
}

function initPublications() {
  const groups = Object.entries(DATA.publications).map(([groupName, items]) => `
    <div class="pub-group">
      <div class="group-label">${escapeHTML(groupName)}</div>
      ${items.map(publicationCard).join("")}
    </div>
  `).join("");

  el("publicationsList").innerHTML = groups;
}

function timelineCard(item) {
  return `
    <article class="timeline-card">
      <h3>${escapeHTML(item.title)}</h3>
      <div class="meta">${escapeHTML(item.meta)}</div>
      <p>${escapeHTML(item.description)}</p>
    </article>
  `;
}

function initTimeline() {
  el("educationList").innerHTML = DATA.education.map(timelineCard).join("");
  el("experienceList").innerHTML = DATA.experience.map(timelineCard).join("");
}

function contactCard(title, bodyHTML) {
  return `
    <article class="contact-card">
      <h3>${escapeHTML(title)}</h3>
      <p>${bodyHTML}</p>
    </article>
  `;
}

function initService() {
  const reviews = DATA.service.reviews;
  const reviewCard = `
    <article class="service-card">
      <h3>${escapeHTML(reviews.title)}</h3>
      <div class="chip-row">${chip(reviews.count)}</div>
      ${reviews.items.map(item => `<p>${escapeHTML(item)}</p>`).join("")}
    </article>
  `;

  const certCard = `
    <article class="service-card">
      <h3>Certifications</h3>
      <div class="link-row">
        ${DATA.service.certifications.map(item => linkButton(item.label, item.url)).join("")}
      </div>
    </article>
  `;

  el("serviceGrid").innerHTML = reviewCard + certCard;
}

function initNav() {
  const button = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");

  button.addEventListener("click", () => {
    const isOpen = links.classList.toggle("nav-links-open");
    button.setAttribute("aria-expanded", String(isOpen));
  });

  links.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      links.classList.remove("nav-links-open");
      button.setAttribute("aria-expanded", "false");
    });
  });
}

function init() {
  initProfile();
  initStats();
  initLists();
  initFeatured();
  initVisuals();
  initPublications();
  initTimeline();
  initService();
  initNav();
}

document.addEventListener("DOMContentLoaded", init);
