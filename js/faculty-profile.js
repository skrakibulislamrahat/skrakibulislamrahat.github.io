(() => {
  const data = window.SITE_DATA || {};
  const profile = data.profile || {};

  document.title = `${profile.name || "SK Rakib Ul Islam Rahat"} | PhD Computer Science · Trustworthy AI`;

  const github = profile.github || "https://github.com/skrakibulislamrahat";
  const heroActions = document.getElementById("heroActions");
  if (heroActions && github && !heroActions.querySelector('[data-profile-github]')) {
    const link = document.createElement("a");
    link.className = "btn btn-ghost";
    link.href = github;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "GitHub";
    link.dataset.profileGithub = "true";
    heroActions.appendChild(link);
  }

  const contactGrid = document.getElementById("contactGrid");
  if (contactGrid && github && !contactGrid.querySelector('[data-profile-github]')) {
    const card = document.createElement("article");
    card.className = "contact-card glass-card";
    card.dataset.profileGithub = "true";
    card.innerHTML = `<h3>GitHub</h3><p><a href="${github}" target="_blank" rel="noopener noreferrer">View research repositories</a></p>`;
    contactGrid.appendChild(card);
  }

  const repoByTitle = new Map([
    ["Systematic Evidence of Artifact-Driven Shortcut Learning in Fundus Image Models", "https://github.com/skrakibulislamrahat/Exposing_Dataset_Artifacts"],
    ["Calibration Under Domain Shift in Diabetic Retinopathy Screening", "https://github.com/skrakibulislamrahat/calibration-aware-dr-reliability"],
    ["Same Label, Different Disease: Semantic Transport Failure Across Chest X-ray Benchmarks", "https://github.com/skrakibulislamrahat/semantic-shift-chest-xray"],
    ["Multimodal Deep Learning for Classifying Diabetic Retinopathy Severity", "https://github.com/skrakibulislamrahat/Multimodal_Framework_Research"]
  ]);

  document.querySelectorAll("#featuredGrid .feature-card").forEach(card => {
    const title = card.querySelector("h3")?.textContent?.trim();
    const repo = repoByTitle.get(title);
    if (!repo || card.querySelector('[data-feature-repo]')) return;

    const link = document.createElement("a");
    link.className = "mini-btn";
    link.href = repo;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View repository";
    link.dataset.featureRepo = "true";
    card.appendChild(link);
  });
})();
