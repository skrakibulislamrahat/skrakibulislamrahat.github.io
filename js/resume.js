const DATA = window.SITE_DATA;

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstItems(groupName, count) {
  return (DATA.publications[groupName] || []).slice(0, count);
}

function publicationLine(item) {
  const doi = (item.links || []).find(link => link.label.toLowerCase() === "doi");
  return `<li><strong>${escapeHTML(item.title)}</strong>, ${escapeHTML(item.venue)}, ${escapeHTML(item.year)}.${doi ? `<br><span class="resume-doi">${escapeHTML(doi.url.replace("https://doi.org/", "DOI: "))}</span>` : ""}</li>`;
}

function renderResume() {
  const { profile } = DATA;

  document.getElementById("resume").innerHTML = `
    <header class="resume-header">
      <div>
        <h1 class="resume-name">${escapeHTML(profile.name)}</h1>
        <p class="resume-role">
          Medical AI Researcher focused on reliability, calibration under domain shift,
          shortcut learning, fundus imaging, multimodal diagnostic systems, and deployment-facing model evaluation.
        </p>
      </div>
      <div class="resume-contact">
        <div><strong>Email:</strong> ${escapeHTML(profile.email)}</div>
        <div><strong>ORCID:</strong> ${escapeHTML(profile.orcidId)}</div>
        <div><strong>Website:</strong> skrakibulislamrahat.github.io</div>
        <div><strong>Location:</strong> ${escapeHTML(profile.location)}</div>
      </div>
    </header>

    <section class="resume-summary">
      Researcher working at the intersection of medical imaging, clinical AI, interpretability, and robustness.
      Current work centers on diabetic retinopathy screening, artifact-driven shortcut learning, calibration failure
      under dataset shift, and explainable multimodal learning for real-world deployment.
    </section>

    <div class="resume-grid">
      <div>
        <section class="resume-section">
          <h2>Research Experience</h2>
          ${DATA.experience.slice(0, 2).map(item => `
            <div class="resume-entry">
              <div class="resume-entry-header">
                <div class="resume-entry-title">${escapeHTML(item.title)}</div>
                <div class="resume-entry-date">${escapeHTML(item.meta.split("·")[0].trim())}</div>
              </div>
              <div class="resume-entry-subtitle">${escapeHTML(item.meta.split("·").slice(1).join("·").trim())}</div>
              <p>${escapeHTML(item.description)}</p>
            </div>
          `).join("")}
        </section>

        <section class="resume-section">
          <h2>Selected Publications</h2>
          <ul class="resume-list">
            ${firstItems("Journal Articles", 3).map(publicationLine).join("")}
          </ul>
        </section>

        <section class="resume-section">
          <h2>Manuscripts Under Review</h2>
          <ul class="resume-list">
            ${(DATA.publications["Manuscripts Under Review"] || []).slice(0, 2).map(item => `
              <li><strong>${escapeHTML(item.title)}</strong> — ${escapeHTML(item.venue)}</li>
            `).join("")}
          </ul>
        </section>
      </div>

      <div>
        <section class="resume-section">
          <h2>Education</h2>
          ${DATA.education.map(item => `
            <div class="resume-entry">
              <div class="resume-entry-header">
                <div class="resume-entry-title">${escapeHTML(item.title)}</div>
              </div>
              <div class="resume-entry-subtitle">${escapeHTML(item.meta)}</div>
            </div>
          `).join("")}
        </section>

        <section class="resume-section">
          <h2>Technical Skills</h2>
          <div class="skill-block">
            <div class="skill-line"><strong>Programming:</strong> Python, SQL, Java</div>
            <div class="skill-line"><strong>ML / DL:</strong> PyTorch, TensorFlow, scikit-learn, CNNs, multimodal learning</div>
            <div class="skill-line"><strong>Medical AI:</strong> fundus imaging, interpretability, Grad-CAM, SHAP, calibration, external validation</div>
            <div class="skill-line"><strong>Research Tools:</strong> Google Colab, Jupyter, Overleaf, LaTeX, Microsoft Word</div>
            <div class="skill-line"><strong>Data Work:</strong> preprocessing, evaluation, visualization, reproducible workflows</div>
          </div>
        </section>

        <section class="resume-section">
          <h2>Selected Conference Papers</h2>
          <ul class="resume-list">
            ${firstItems("Conference Papers", 2).map(item => `<li>${escapeHTML(item.title)}, ${escapeHTML(item.venue)}, ${escapeHTML(item.year)}</li>`).join("")}
          </ul>
        </section>

        <section class="resume-section">
          <h2>Service & Certifications</h2>
          <div class="resume-mini">
            Peer reviews: IJRA, IJECE, IJPEDS<br>
            IBM Data Science · Google Cloud AI Healthcare · Elsevier Certified Peer Reviewer
          </div>
        </section>
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", renderResume);
