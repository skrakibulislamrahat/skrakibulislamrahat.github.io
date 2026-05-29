const RAW_DATA = window.SITE_DATA || window.siteData || {};
let activePublicationFilter = "All";
let publicationGroupsCache = [];

function $(id) {
  return document.getElementById(id);
}

function safe(value, fallback = "") {
  return value === undefined || value === null || value === "" ? fallback : value;
}

function esc(value) {
  return String(safe(value))
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function titleCaseKey(key) {
  return String(key)
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function getProfile() {
  const profile = RAW_DATA.profile || {};
  return {
    name: safe(profile.name, "SK Rakib Ul Islam Rahat"),
    brandName: safe(profile.brandName, "SK RAKIB UL ISLAM RAHAT"),
    title: safe(profile.title, "Medical AI Researcher"),
    affiliation: safe(profile.affiliation, "International American University"),
    location: safe(profile.location, "Los Angeles, USA"),
    email: safe(profile.email, "skrakibulislamrahat@gmail.com"),
    scholar: safe(profile.scholar, "https://scholar.google.com/citations?user=0X1eRi8AAAAJ"),
    orcid: safe(profile.orcid, "https://orcid.org/0009-0005-0744-8398"),
    orcidId: safe(profile.orcidId, "0009-0005-0744-8398"),
    website: safe(profile.website, "https://skrakibulislamrahat.github.io/"),
    headshot: safe(profile.headshot, "assets/headshot.png")
  };
}

function getHero() {
  const hero = RAW_DATA.hero || {};
  return {
    pill: safe(hero.pill, "Medical AI · Reliability · Calibration · Dataset Shift"),
    title: safe(hero.title, "Building medical AI that survives contact with real-world data."),
    description: safe(
      hero.description,
      "I work on medical imaging and clinical AI systems, with emphasis on shortcut learning, artifact-driven bias, calibration under domain shift, multimodal diagnostic systems, and deployment-facing model evaluation."
    ),
    note: safe(
      hero.note,
      "Current work includes calibration under domain shift and artifact-driven shortcut auditing."
    )
  };
}

function getStats() {
  const stats = arr(RAW_DATA.stats);
  if (stats.length) return stats;

  return [
    { value: "101", label: "Citations" },
    { value: "6", label: "h-index" },
    { value: "5", label: "Verified peer reviews" }
  ];
}

function getAbout() {
  const about = RAW_DATA.about || {};

  return {
    subtitle: safe(
      about.subtitle,
      "My work focuses on the gap between benchmark performance and real-world reliability in medical AI."
    ),
    paragraphs: arr(about.paragraphs).length
      ? about.paragraphs
      : [
          "I investigate artifact-driven shortcut learning, fundus image bias, calibration under domain shift, multimodal retinal AI, and evaluation strategies that reflect actual clinical use rather than inflated in-dataset performance.",
          "The goal is not just better scores, but models that remain interpretable, reliable, and defensible when conditions change."
        ],
    coreAreas: arr(about.coreAreas).length
      ? about.coreAreas
      : [
          "Medical image analysis and fundus imaging",
          "Probabilistic calibration and reliability",
          "Shortcut learning and dataset artifact auditing",
          "External validation and cross-dataset evaluation",
          "Explainable AI with Grad-CAM and SHAP",
          "Multimodal learning with clinical metadata"
        ]
  };
}

function getFeatured() {
  const featured = arr(RAW_DATA.featured || RAW_DATA.featuredWork);
  if (featured.length) return featured;

  return [
    {
      status: "Under Review",
      venue: "CMPB",
      title: "Systematic Evidence of Artifact-Driven Shortcut Learning in Fundus Image Models",
      description: "Evaluation study showing how fundus models exploit non-pathological borders, padding, and overlays, with external validation and attribution-based auditing."
    },
    {
      status: "Under Review",
      venue: "CMIG",
      title: "Calibration Under Domain Shift in Diabetic Retinopathy Screening",
      description: "Controlled study of temperature scaling transfer from APTOS to Messidor-2, showing that source-fitted calibration does not reliably survive dataset shift."
    },
    {
      status: "Published",
      venue: "KMMS",
      highlight: "Key Work",
      title: "Multimodal Deep Learning for Classifying Diabetic Retinopathy Severity",
      description: "Explainable multimodal framework combining fundus images and structured clinical variables for diabetic retinopathy severity classification."
    }
  ];
}

function getVisuals() {
  const visuals = arr(RAW_DATA.visuals || RAW_DATA.visualResults);
  if (visuals.length) return visuals;

  return [
    {
      image: "assets/fig_reliability_shift.png",
      alt: "Reliability diagrams showing calibration behavior under domain shift",
      title: "Reliability under domain shift",
      description: "Calibration behavior changes sharply from in-domain APTOS to shifted Messidor-2."
    },
    {
      image: "assets/fig_gradcam_audit.png",
      alt: "Grad-CAM comparison showing shortcut learning audit",
      title: "Shortcut learning audit with Grad-CAM",
      description: "Artifact mitigation reduces border-focused attention and shifts model evidence toward retinal regions."
    }
  ];
}

function normalizePublications() {
  const pubs = RAW_DATA.publications || {};

  if (Array.isArray(pubs)) {
    const grouped = {};
    pubs.forEach(item => {
      const group = safe(item.group || item.category || item.type, "Publications");
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(item);
    });
    return Object.entries(grouped).map(([group, items]) => ({ group, items }));
  }

  return Object.entries(pubs)
    .filter(([, items]) => Array.isArray(items))
    .map(([group, items]) => ({
      group: titleCaseKey(group),
      items
    }));
}

function linkButton(label, url, extraClass = "") {
  if (!url) {
    return `<span class="mini-btn mini-btn-disabled ${extraClass}">${esc(label)}</span>`;
  }

  return `
    <a class="mini-btn ${extraClass}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
      ${esc(label)}
    </a>
  `;
}

function actionButton(label, url, className) {
  return `
    <a class="btn ${className}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
      ${esc(label)}
    </a>
  `;
}

function chip(label, className = "") {
  if (!label) return "";
  return `<span class="chip ${className}">${esc(label)}</span>`;
}

function pubTypeClass(type = "") {
  const lower = String(type).toLowerCase();

  if (lower.includes("journal")) return "chip-journal";
  if (lower.includes("conference")) return "chip-conf";
  if (lower.includes("review")) return "chip-review";
  if (lower.includes("under")) return "chip-review";

  return "";
}

function initProfile() {
  const profile = getProfile();
  const hero = getHero();

  document.title = `${profile.name} | Medical AI`;

  if ($("brandName")) $("brandName").textContent = profile.brandName;
  if ($("heroPill")) $("heroPill").textContent = hero.pill;
  if ($("heroTitle")) $("heroTitle").textContent = hero.title;
  if ($("heroDescription")) $("heroDescription").textContent = hero.description;
  if ($("heroNote")) $("heroNote").textContent = hero.note;

  if ($("profilePhoto")) {
    $("profilePhoto").src = profile.headshot;
    $("profilePhoto").alt = `${profile.name} headshot`;
  }

  if ($("profileName")) $("profileName").textContent = profile.name;
  if ($("profileMeta")) {
    $("profileMeta").textContent = `${profile.title} · ${profile.affiliation} · ${profile.location}`;
  }

  if ($("researchDirection")) {
    $("researchDirection").textContent = safe(
      RAW_DATA.researchDirection,
      "Medical AI reliability, fundus imaging, calibration, shortcut learning, domain shift, multimodal diagnostic systems, and healthcare-facing model evaluation."
    );
  }

  if ($("heroActions")) {
    $("heroActions").innerHTML = [
      actionButton("Google Scholar", profile.scholar, "btn-primary"),
      actionButton("Download / Print Resume", "resume.html", "btn-secondary"),
      actionButton("Email", `mailto:${profile.email}`, "btn-ghost")
    ].join("");
  }

  if ($("footerText")) {
    $("footerText").textContent = `© ${new Date().getFullYear()} ${profile.name}`;
  }

  if ($("contactGrid")) {
    $("contactGrid").innerHTML = `
      <article class="contact-card glass-card">
        <h3>Email</h3>
        <p><a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a></p>
      </article>
      <article class="contact-card glass-card">
        <h3>Google Scholar</h3>
        <p><a href="${esc(profile.scholar)}" target="_blank" rel="noopener noreferrer">View citation profile</a></p>
      </article>
      <article class="contact-card glass-card">
        <h3>ORCID</h3>
        <p><a href="${esc(profile.orcid)}" target="_blank" rel="noopener noreferrer">${esc(profile.orcidId)}</a></p>
      </article>
    `;
  }
}

function initStats() {
  const stats = getStats();

  if (!$("statsGrid")) return;

  $("statsGrid").innerHTML = stats.map((item, index) => `
    <article class="stat glass-card reveal-soft" style="--delay:${index * 80}ms">
      <strong data-count="${esc(item.value)}">${esc(item.value)}</strong>
      <span>${esc(item.label)}</span>
    </article>
  `).join("");
}

function initBento() {
  if (!$("bentoGrid")) return;

  const stats = getStats();
  const about = getAbout();
  const groups = normalizePublications();
  const allItems = groups.flatMap(group => group.items);
  const reviewCount = allItems.filter(item => {
    const text = `${item.type || ""} ${item.status || ""} ${item.group || ""}`.toLowerCase();
    return text.includes("review") || text.includes("under");
  }).length;

  $("bentoGrid").innerHTML = `
    <article class="bento-card bento-wide glass-card">
      <span class="dash-label">Research focus</span>
      <h3>Medical AI reliability under real-world shift</h3>
      <p>${esc(about.paragraphs[0])}</p>
    </article>

    <article class="bento-card glass-card">
      <span class="bento-number">${esc(stats[0]?.value || "—")}</span>
      <p>${esc(stats[0]?.label || "Citation metric")}</p>
    </article>

    <article class="bento-card glass-card">
      <span class="bento-number">${allItems.length || "—"}</span>
      <p>Research outputs listed</p>
    </article>

    <article class="bento-card glass-card">
      <span class="bento-number">${reviewCount || "—"}</span>
      <p>Manuscripts under review</p>
    </article>

    <article class="bento-card bento-tall glass-card">
      <span class="dash-label">Core methods</span>
      <ul class="compact-list">
        ${about.coreAreas.slice(0, 4).map(item => `<li>${esc(item)}</li>`).join("")}
      </ul>
    </article>
  `;
}

function initAbout() {
  const about = getAbout();

  if ($("aboutSubtitle")) $("aboutSubtitle").textContent = about.subtitle;

  if ($("aboutBody")) {
    $("aboutBody").innerHTML = about.paragraphs.map(p => `<p>${esc(p)}</p>`).join("");
  }

  if ($("coreAreasList")) {
    $("coreAreasList").innerHTML = about.coreAreas.map(item => `<li>${esc(item)}</li>`).join("");
  }
}

function initFeatured() {
  if (!$("featuredGrid")) return;

  $("featuredGrid").innerHTML = getFeatured().map((item, index) => `
    <article class="feature-card glass-card reveal-soft" style="--delay:${index * 90}ms">
      <div class="chip-row">
        ${chip(item.status, String(item.status).toLowerCase().includes("published") ? "chip-journal" : "chip-review")}
        ${chip(item.venue)}
        ${chip(item.highlight, "chip-accent")}
      </div>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.description)}</p>
      <div class="card-line"></div>
    </article>
  `).join("");
}

function initVisuals() {
  if (!$("visualGrid")) return;

  $("visualGrid").innerHTML = getVisuals().map((item, index) => `
    <article class="visual-card glass-card reveal-soft" style="--delay:${index * 100}ms">
      <div class="visual-image-wrap">
        <img src="${esc(item.image)}" alt="${esc(item.alt || item.title)}" />
      </div>
      <div class="visual-body">
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.description)}</p>
      </div>
    </article>
  `).join("");
}

function publicationCard(item, group, index) {
  const year = safe(item.year, "");
  const type = safe(item.type || item.status, group);
  const venue = safe(item.venue || item.journal || item.conference, "");
  const links = arr(item.links);

  return `
    <article class="pub-card glass-card reveal-soft visible" style="--delay:${Math.min(index, 6) * 50}ms">
      <div class="pub-top">
        <div>
          <div class="chip-row">
            ${chip(type, pubTypeClass(type))}
            ${chip(year)}
            ${chip(group)}
          </div>
          <h3>${esc(item.title)}</h3>
          ${venue ? `<p>${esc(venue)}</p>` : ""}
          ${item.description ? `<p>${esc(item.description)}</p>` : ""}
        </div>
        ${year ? `<div class="pub-year">${esc(year)}</div>` : ""}
      </div>

      ${
        links.length
          ? `<div class="link-row">${links.map(link => linkButton(link.label, link.url)).join("")}</div>`
          : ""
      }
    </article>
  `;
}

function initPublicationFilters() {
  if (!$("publicationFilters")) return;

  const filters = ["All", ...publicationGroupsCache.map(group => group.group)];

  $("publicationFilters").innerHTML = filters.map(filter => `
    <button class="filter-btn ${filter === activePublicationFilter ? "active" : ""}" type="button" data-filter="${esc(filter)}">
      ${esc(filter)}
    </button>
  `).join("");

  document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
      activePublicationFilter = button.dataset.filter;
      initPublicationFilters();
      initPublications();
    });
  });
}

function initPublications() {
  if (!$("publicationsList")) return;

  const visibleGroups = publicationGroupsCache.filter(group =>
    activePublicationFilter === "All" || group.group === activePublicationFilter
  );

  const total = visibleGroups.reduce((sum, group) => sum + group.items.length, 0);

  if ($("publicationCount")) {
    $("publicationCount").textContent = `${total} item${total === 1 ? "" : "s"} shown`;
  }

  $("publicationsList").innerHTML = visibleGroups.map(group => `
    <div class="pub-group">
      <div class="group-label">${esc(group.group)}</div>
      <div class="pub-list">
        ${group.items.map((item, index) => publicationCard(item, group.group, index)).join("")}
      </div>
    </div>
  `).join("");
}

function initTimeline() {
  const education = arr(RAW_DATA.education);
  const experience = arr(RAW_DATA.experience);

  if ($("educationList")) {
    $("educationList").innerHTML = education.map((item, index) => timelineCard(item, index)).join("");
  }

  if ($("experienceList")) {
    $("experienceList").innerHTML = experience.map((item, index) => timelineCard(item, index)).join("");
  }
}

function timelineCard(item, index) {
  return `
    <article class="timeline-card glass-card reveal-soft" style="--delay:${index * 70}ms">
      <span class="timeline-dot"></span>
      <h3>${esc(item.title)}</h3>
      <div class="meta">${esc(item.meta)}</div>
      <p>${esc(item.description)}</p>
    </article>
  `;
}

function initService() {
  if (!$("serviceGrid")) return;

  const service = RAW_DATA.service || {};
  const reviews = service.reviews || {};
  const certifications = arr(service.certifications || RAW_DATA.certifications);

  $("serviceGrid").innerHTML = `
    <article class="service-card glass-card">
      <h3>${esc(safe(reviews.title, "Verified peer reviews"))}</h3>
      <div class="chip-row">${chip(safe(reviews.count, "5 verified"), "chip-accent")}</div>
      <ul class="list">
        ${arr(reviews.items).map(item => `<li>${esc(item)}</li>`).join("")}
      </ul>
    </article>

    <article class="service-card glass-card">
      <h3>Certifications</h3>
      <div class="link-row">
        ${certifications.map(item => linkButton(item.label, item.url)).join("")}
      </div>
    </article>
  `;
}

function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = $("navLinks");

  if (!toggle || !links) return;

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

function forceGeneratedItemsVisible() {
  requestAnimationFrame(() => {
    document.querySelectorAll(".reveal-soft").forEach(item => {
      item.classList.add("visible");
    });
  });
}

function init() {
  publicationGroupsCache = normalizePublications();

  initProfile();
  initStats();
  initBento();
  initAbout();
  initFeatured();
  initVisuals();
  initPublicationFilters();
  initPublications();
  initTimeline();
  initService();
  initMobileNav();
  forceGeneratedItemsVisible();
}

document.addEventListener("DOMContentLoaded", init);
