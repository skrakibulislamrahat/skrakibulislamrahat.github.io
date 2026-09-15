/* Faculty-facing research profile. Keep current affiliation separate from historical publication affiliations. */

window.SITE_DATA = {
  "profile": {
    "name": "SK Rakib Ul Islam Rahat",
    "brandName": "SK RAKIB UL ISLAM RAHAT",
    "title": "PhD Student in Computer Science · Trustworthy AI Researcher",
    "affiliation": "Wright State University",
    "location": "Dayton, Ohio, USA",
    "email": "skrakibulislamrahat@gmail.com",
    "website": "https://skrakibulislamrahat.github.io/",
    "github": "https://github.com/skrakibulislamrahat",
    "scholar": "https://scholar.google.com/citations?user=0X1eRi8AAAAJ",
    "orcid": "https://orcid.org/0009-0005-0744-8398",
    "orcidId": "0009-0005-0744-8398",
    "headshot": "assets/headshot.png"
  },
  "hero": {
    "pill": "PhD Computer Science · Trustworthy AI · Medical Imaging · Knowledge Engineering",
    "title": "Reliable AI beyond benchmark accuracy.",
    "description": "I study trustworthy machine learning for medical imaging, with emphasis on dataset shift, calibration failure, shortcut learning, external validation, high-confidence error, explainability, and knowledge-guided reasoning.",
    "note": "Current doctoral work at Wright State University extends reliability-focused medical AI toward knowledge engineering, semantic representations, and neurosymbolic methods."
  },
  "stats": [
    {"value": "100+", "label": "Citations"},
    {"value": "PhD", "label": "Computer Science · Wright State"},
    {"value": "9", "label": "Verified peer reviews"}
  ],
  "researchDirection": "Trustworthy AI at the intersection of medical imaging, reliability under dataset shift, calibration, semantic transport, knowledge engineering, and knowledge-guided/neurosymbolic reasoning.",
  "strengths": [
    "Medical imaging and clinical AI evaluation",
    "External validation, calibration, and reliability under shift",
    "Shortcut-learning audits with Grad-CAM and model diagnostics",
    "Knowledge engineering, semantic representations, and neurosymbolic AI"
  ],
  "about": {
    "subtitle": "My work focuses on the gap between benchmark performance and real-world reliability. I study how models fail under dataset shift, what non-clinical cues they exploit, how probability estimates become miscalibrated, and how structured knowledge can support more reliable reasoning.",
    "paragraphs": [
      "My current research centers on trustworthy medical AI: artifact-driven shortcut learning, retinal-image bias, calibration under domain shift, semantic transport across chest X-ray benchmarks, cross-dataset evaluation, high-confidence error analysis, and explainable model auditing.",
      "As a Computer Science PhD student at Wright State University, I am expanding this work toward knowledge engineering, knowledge graphs, semantic representations, and knowledge-guided or neurosymbolic approaches to reliability and interpretability."
    ],
    "coreAreas": [
      "Trustworthy machine learning and medical image analysis",
      "Dataset shift, external validation, and cross-dataset transfer",
      "Probability calibration and high-confidence error analysis",
      "Shortcut learning and dataset artifact auditing",
      "Explainable AI with Grad-CAM and related diagnostics",
      "Knowledge engineering, knowledge graphs, and neurosymbolic AI"
    ]
  },
  "featured": [
    {"status": "Under Review", "venue": "CMPB", "title": "Systematic Evidence of Artifact-Driven Shortcut Learning in Fundus Image Models", "description": "Evaluation study of non-pathological shortcuts in fundus models, including image borders, padding, and overlays, with attribution-based auditing and external validation."},
    {"status": "Under Review", "venue": "CMIG", "title": "Calibration Under Domain Shift in Diabetic Retinopathy Screening", "description": "Controlled evaluation of calibration transfer from APTOS to Messidor-2, including source-fitted temperature scaling and limited-label target-side recalibration."},
    {"status": "Research Project", "venue": "Chest X-ray", "highlight": "Cross-Dataset Reliability", "title": "Same Label, Different Disease: Semantic Transport Failure Across Chest X-ray Benchmarks", "description": "Five-seed DenseNet-121 study testing whether superficially similar pneumonia and opacity labels transfer reliably across Kaggle, RSNA, and CheXpert, with calibration and high-confidence-error analysis."},
    {"status": "Published", "venue": "KMMS", "highlight": "Published Work", "title": "Multimodal Deep Learning for Classifying Diabetic Retinopathy Severity", "description": "Explainable multimodal retinal-AI study with five-fold evaluation, external validation on Messidor-2, and interpretability analysis."}
  ],
  "visuals": [
    {"image": "assets/fig_reliability_shift.png", "alt": "Reliability diagrams showing calibration behavior under domain shift from APTOS to Messidor-2", "title": "Reliability under domain shift", "description": "Calibration behavior changes from in-domain APTOS to shifted Messidor-2, motivating explicit reliability evaluation rather than accuracy-only reporting."},
    {"image": "assets/fig_gradcam_audit.png", "alt": "Grad-CAM comparison showing reduced border-focused attention after artifact mitigation", "title": "Shortcut-learning audit with Grad-CAM", "description": "Attribution analysis is used to test whether model evidence concentrates on retinal regions or on peripheral non-pathological cues."}
  ],
  "publications": {
    "Journal Articles": [
      {"year": "2026", "type": "Journal", "title": "TriGWONet: A lightweight multibranch convolutional neural network using gray wolf optimization for accurate oral cancer image classification", "venue": "Discover Artificial Intelligence (Springer Nature)", "links": [{"label": "DOI", "url": "https://doi.org/10.1007/s44163-025-00776-x"}, {"label": "View", "url": "https://link.springer.com/article/10.1007/s44163-025-00776-x"}]},
      {"year": "2026", "type": "Journal", "title": "Multimodal Deep Learning for Classifying Diabetic Retinopathy Severity", "venue": "Journal of Korea Multimedia Society", "links": [{"label": "DOI", "url": "https://doi.org/10.9717/kmms.2026.29.3.524"}]},
      {"year": "2025", "type": "Journal", "title": "Advancing diabetic retinopathy detection with AI and deep learning: Opportunities, limitations, and clinical barriers", "venue": "British Journal of Nursing Studies", "links": [{"label": "DOI", "url": "https://doi.org/10.32996/bjns.2025.5.2.1"}, {"label": "View", "url": "https://al-kindipublishers.org/index.php/bjns/article/view/10314"}]},
      {"year": "2025", "type": "Journal", "title": "Artificial intelligence for chronic kidney disease risk stratification in the USA: Ensemble vs. deep learning methods", "venue": "British Journal of Nursing Studies", "links": [{"label": "DOI", "url": "https://doi.org/10.32996/bjns.2025.5.2.3"}, {"label": "View", "url": "https://al-kindipublishers.org/index.php/bjns/article/view/10498"}]},
      {"year": "2025", "type": "Journal", "title": "A Deep Learning Framework for Early Breast Cancer Detection Among US Women: Integrating Mammography and Clinical EHR Data", "venue": "British Journal of Nursing Studies", "links": [{"label": "DOI", "url": "https://doi.org/10.32996/bjns.2025.5.2.6"}, {"label": "View", "url": "https://al-kindipublishers.org/index.php/bjns/article/view/11667"}]},
      {"year": "2024", "type": "Journal", "title": "Machine Learning-Based Hospital Readmission Prediction and Risk Analysis in the United States Healthcare System", "venue": "Journal of Computer Science and Technology Studies (JCSTS)", "links": [{"label": "DOI", "url": "https://doi.org/10.32996/jcsts.2024.6.5.32"}, {"label": "View", "url": "https://doi.org/10.32996/jcsts.2024.6.5.32"}]},
      {"year": "2023", "type": "Journal", "title": "Deep Learning-Based Skin Cancer Diagnosis in the United States: Advances, Challenges, and Clinical Translation", "venue": "Journal of Medical and Health Studies", "links": [{"label": "DOI", "url": "https://doi.org/10.32996/jmhs.2023.4.6.18"}, {"label": "View", "url": "https://al-kindipublishers.org/index.php/jmhs/article/view/11890"}]},
      {"year": "2023", "type": "Journal", "title": "A Transfer Learning-Based Deep Convolutional Neural Network Framework for Automated Multi-Class Eye Disease Classification in the USA Using Retinal Fundus Image", "venue": "Journal of Medical and Health Studies", "links": [{"label": "DOI", "url": "https://doi.org/10.32996/jmhs.2023.4.4.24"}, {"label": "View", "url": "https://al-kindipublishers.org/index.php/jmhs/article/view/11950"}]}
    ],
    "Conference Papers": [
      {"year": "2026", "type": "Conference", "title": "Performance Evaluation of Hybrid Machine Learning Models for Heart Disease Prediction in U.S. Clinical Decision Support Systems", "venue": "IEEE International Conference on Sentiment Analysis and Deep Learning (ICSADL)", "links": [{"label": "DOI", "url": "https://doi.org/10.1109/ICSADL67539.2026.11452047"}, {"label": "IEEE", "url": "https://ieeexplore.ieee.org/document/11452047"}]},
      {"year": "2025", "type": "Conference", "title": "An ANN Network-Based Approach for Early Detection of Parkinson's Disease Through Image Processing", "venue": "IEEE Conference on Converging Technology", "links": [{"label": "DOI", "url": "https://doi.org/10.1109/ICCTEIE66144.2025.11341843"}, {"label": "IEEE", "url": "https://ieeexplore.ieee.org/abstract/document/11341843"}]},
      {"year": "2025", "type": "Conference", "title": "PneuNet: A Multi-Scale Attention-Enhanced CNN for Pediatric Pneumonia Detection from Chest X-rays", "venue": "IEEE DELCON", "links": [{"label": "DOI", "url": "https://doi.org/10.1109/DELCON68055.2025.11400229"}, {"label": "IEEE", "url": "https://ieeexplore.ieee.org/abstract/document/11400229"}]},
      {"year": "2025", "type": "Conference", "title": "Deep Learning-Based Multi-Class Brain Tumor Classification from MRI using a Novel MS-DSCCNet Architecture", "venue": "IEEE DELCON", "links": [{"label": "DOI", "url": "https://doi.org/10.1109/DELCON68055.2025.11400450"}, {"label": "IEEE", "url": "https://ieeexplore.ieee.org/abstract/document/11400450"}]}
    ],
    "Manuscripts Under Review": [
      {"year": "2026", "type": "Under Review", "title": "Systematic Evidence of Artifact-Driven Shortcut Learning in Fundus Image Models", "venue": "Computer Methods and Programs in Biomedicine", "description": "Manuscript under review."},
      {"year": "2026", "type": "Under Review", "title": "Calibration Under Domain Shift in Diabetic Retinopathy Screening: Temperature Scaling Transfer and Target-Side Calibration with Limited Labels", "venue": "Computerized Medical Imaging and Graphics", "description": "Manuscript under review."},
      {"year": "2026", "type": "Under Review", "title": "Evaluation of lightweight AI models for early diabetic retinopathy detection in resource-constrained screening settings", "venue": "In review", "description": "Manuscript under review."}
    ]
  },
  "education": [
    {"title": "PhD, Computer Science", "meta": "Wright State University · 2026–Present", "description": "Research focus: trustworthy AI, medical imaging, reliable machine learning, knowledge engineering, dataset shift, calibration, shortcut learning, and knowledge-guided/neurosymbolic methods."},
    {"title": "MBA, Management Information Systems", "meta": "International American University · 2024–2026", "description": "Focus: database systems, business analytics, and data-driven decision-making."},
    {"title": "MSc, Global Business and Administration", "meta": "Kyungsung University · 2022–2023", "description": "Thesis: Integrating Artificial Intelligence in Business and Healthcare Decision Systems."},
    {"title": "B.Tech, Computer Science and Engineering", "meta": "Lovely Professional University · 2017–2021", "description": "Background in software engineering, computing systems, and applied technical development."}
  ],
  "experience": [
    {"title": "PhD Student / Researcher", "meta": "Wright State University · 2026–Present · Dayton, Ohio", "description": "Doctoral research spanning trustworthy AI, medical imaging, reliable machine learning, knowledge engineering, semantic representations, and knowledge-guided reasoning."},
    {"title": "Independent Medical AI Researcher", "meta": "2023–Present · United States", "description": "Designed and evaluated machine-learning systems for retinal, radiological, and healthcare prediction tasks, with emphasis on reliability, generalization, calibration, and reproducible evaluation."},
    {"title": "AI & Data Intern", "meta": "Taskimpetus · 2024–2026", "description": "Supported AI-driven analytics and automation using Python and SQL, including exploratory analysis, reproducible data workflows, and internal analytics."},
    {"title": "Teaching Assistant", "meta": "Kyungsung University · 2022–2023", "description": "Mentored students on preprocessing, evaluation, and reproducible ML workflows while contributing to co-authored research outputs."},
    {"title": "Junior Software Engineer", "meta": "KCIT · 2020–2021", "description": "Worked on software engineering, smart-system integration, and applied technical development."}
  ],
  "service": {
    "reviews": {
      "title": "Verified peer reviews",
      "count": "9 reviews · 5 journals",
      "items": [
        "3 × IAES International Journal of Robotics and Automation (IJRA)",
        "2 × International Journal of Electrical and Computer Engineering (IJECE)",
        "2 × International Journal of Power Electronics and Drive Systems (IJPEDS)",
        "1 × Computer Methods in Biomechanics and Biomedical Engineering",
        "1 × Information Fusion"
      ]
    },
    "certifications": [
      {"label": "IBM Data Science", "url": "https://coursera.org/verify/professional-cert/EC6IHGSG99HX"},
      {"label": "Google Cloud AI Healthcare", "url": "https://coursera.org/verify/P4N76QCC77D3"},
      {"label": "Illinois Tech AI Healthcare", "url": "https://coursera.org/verify/IALUTM83NC4Q"},
      {"label": "Elsevier Researcher Academy — Certified Peer Reviewer Course", "url": ""}
    ]
  }
};