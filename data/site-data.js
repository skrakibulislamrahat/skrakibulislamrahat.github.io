/*
  Edit this file when your profile changes.
  Most homepage sections and resume.html are generated from this single source.
  Keep URLs complete: https://...
*/

window.SITE_DATA = {
  profile: {
    name: "SK Rakib Ul Islam Rahat",
    brandName: "SK RAKIB UL ISLAM RAHAT",
    title: "Medical AI Researcher",
    affiliation: "International American University",
    location: "Los Angeles, California, USA",
    email: "skrakibulislamrahat@gmail.com",
    website: "https://skrakibulislamrahat.github.io/",
    scholar: "https://scholar.google.com/citations?user=0X1eRi8AAAAJ",
    orcid: "https://orcid.org/0009-0005-0744-8398",
    orcidId: "0009-0005-0744-8398",
    headshot: "assets/headshot.png"
  },

  hero: {
    pill: "Medical AI · Reliability · Calibration · Dataset Shift",
    title: "Building medical AI that survives contact with real-world data.",
    description:
      "I work on medical imaging and clinical AI systems, with emphasis on shortcut learning, artifact-driven bias, calibration under domain shift, multimodal diagnostic systems, and deployment-facing model evaluation.",
    note: "Current work includes calibration under domain shift (CMIG) and artifact-driven shortcut auditing (CMPB)."
  },

  stats: [
    { value: "101", label: "Citations" },
    { value: "6", label: "h-index" },
    { value: "5", label: "Verified peer reviews" }
  ],

  researchDirection:
    "Medical AI reliability, fundus imaging, calibration, shortcut learning, domain shift, multimodal diagnostic systems, and healthcare-facing model evaluation.",

  strengths: [
    "Medical imaging and clinical AI evaluation",
    "External validation and reliability under shift",
    "Grad-CAM, SHAP, calibration, and auditing workflows",
    "Journal publications, IEEE conference papers, and ongoing medical AI manuscripts"
  ],

  about: {
    subtitle:
      "My work focuses on the gap between benchmark performance and real-world reliability in medical AI. I study how models fail, what they latch onto, and how to make diagnostic systems more trustworthy under changing acquisition conditions and clinical deployment constraints.",
    paragraphs: [
      "I investigate artifact-driven shortcut learning, fundus image bias, calibration under domain shift, multimodal retinal AI, and evaluation strategies that reflect actual clinical use rather than inflated in-dataset performance.",
      "The goal is not just better scores, but models that remain interpretable, reliable, and defensible when conditions change."
    ],
    coreAreas: [
      "Medical image analysis and fundus imaging",
      "Probabilistic calibration and reliability",
      "Shortcut learning and dataset artifact auditing",
      "External validation and cross-dataset evaluation",
      "Explainable AI with Grad-CAM and SHAP",
      "Multimodal learning with clinical metadata"
    ]
  },

  featured: [
    {
      status: "Under Review",
      venue: "CMPB",
      title: "Systematic Evidence of Artifact-Driven Shortcut Learning in Fundus Image Models",
      description:
        "Evaluation study showing how fundus models exploit non-pathological borders, padding, and overlays, with external validation on Messidor-2 and attribution-based auditing."
    },
    {
      status: "Under Review",
      venue: "CMIG",
      title: "Calibration Under Domain Shift in Diabetic Retinopathy Screening",
      description:
        "Controlled study of temperature scaling transfer from APTOS to Messidor-2, showing that source-fitted calibration does not reliably survive dataset shift, while small target calibration subsets can restore reliability."
    },
    {
      status: "Published",
      venue: "KMMS",
      highlight: "Key Work",
      title: "Multimodal Deep Learning for Classifying Diabetic Retinopathy Severity",
      description:
        "Explainable multimodal framework combining fundus images and structured clinical variables for diabetic retinopathy severity classification, with external validation and interpretability analysis."
    }
  ],

  visuals: [
    {
      image: "assets/fig_reliability_shift.png",
      alt: "Reliability diagrams showing calibration behavior under domain shift from APTOS to Messidor-2",
      title: "Reliability under domain shift",
      description:
        "Calibration behavior changes sharply from in-domain APTOS to shifted Messidor-2, showing that source-fitted confidence does not transfer cleanly."
    },
    {
      image: "assets/fig_gradcam_audit.png",
      alt: "Grad-CAM comparison showing reduced border-focused attention after artifact mitigation",
      title: "Shortcut learning audit with Grad-CAM",
      description:
        "Artifact mitigation reduces border-focused attention and shifts model evidence toward retinal regions rather than peripheral non-pathological cues."
    }
  ],

  publications: {
    "Journal Articles": [
      {
        year: "2026",
        type: "Journal",
        title: "TriGWONet: A lightweight multibranch convolutional neural network using gray wolf optimization for accurate oral cancer image classification",
        venue: "Discover Artificial Intelligence (Springer Nature)",
        links: [
          { label: "DOI", url: "https://doi.org/10.1007/s44163-025-00776-x" },
          { label: "View", url: "https://link.springer.com/article/10.1007/s44163-025-00776-x" }
        ]
      },
      {
        year: "2026",
        type: "Journal",
        title: "Multimodal Deep Learning for Classifying Diabetic Retinopathy Severity",
        venue: "Journal of Korea Multimedia Society",
        links: [
          { label: "DOI", url: "https://doi.org/10.9717/kmms.2026.29.3.524" }
        ]
      },
      {
        year: "2025",
        type: "Journal",
        title: "Advancing diabetic retinopathy detection with AI and deep learning: Opportunities, limitations, and clinical barriers",
        venue: "British Journal of Nursing Studies",
        links: [
          { label: "DOI", url: "https://doi.org/10.32996/bjns.2025.5.2.1" },
          { label: "View", url: "https://al-kindipublishers.org/index.php/bjns/article/view/10314" }
        ]
      },
      {
        year: "2025",
        type: "Journal",
        title: "Artificial intelligence for chronic kidney disease risk stratification in the USA: Ensemble vs. deep learning methods",
        venue: "British Journal of Nursing Studies",
        links: [
          { label: "DOI", url: "https://doi.org/10.32996/bjns.2025.5.2.3" },
          { label: "View", url: "https://al-kindipublishers.org/index.php/bjns/article/view/10498" }
        ]
      },
      {
        year: "2025",
        type: "Journal",
        title: "A Deep Learning Framework for Early Breast Cancer Detection Among US Women: Integrating Mammography and Clinical EHR Data",
        venue: "British Journal of Nursing Studies",
        links: [
          { label: "DOI", url: "https://doi.org/10.32996/bjns.2025.5.2.6" },
          { label: "View", url: "https://al-kindipublishers.org/index.php/bjns/article/view/11667" }
        ]
      },
      {
        year: "2024",
        type: "Journal",
        title: "Machine Learning-Based Hospital Readmission Prediction and Risk Analysis in the United States Healthcare System",
        venue: "Journal of Computer Science and Technology Studies (JCSTS)",
        links: [
          { label: "DOI", url: "https://doi.org/10.32996/jcsts.2024.6.5.32" },
          { label: "View", url: "https://doi.org/10.32996/jcsts.2024.6.5.32" }
        ]
      },
      {
        year: "2023",
        type: "Journal",
        title: "Deep Learning-Based Skin Cancer Diagnosis in the United States: Advances, Challenges, and Clinical Translation",
        venue: "Journal of Medical and Health Studies",
        links: [
          { label: "DOI", url: "https://doi.org/10.32996/jmhs.2023.4.6.18" },
          { label: "View", url: "https://al-kindipublishers.org/index.php/jmhs/article/view/11890" }
        ]
      },
      {
        year: "2023",
        type: "Journal",
        title: "A Transfer Learning-Based Deep Convolutional Neural Network Framework for Automated Multi-Class Eye Disease Classification in the USA Using Retinal Fundus Image",
        venue: "Journal of Medical and Health Studies",
        links: [
          { label: "DOI", url: "https://doi.org/10.32996/jmhs.2023.4.4.24" },
          { label: "View", url: "https://al-kindipublishers.org/index.php/jmhs/article/view/11950" }
        ]
      }
    ],

    "Conference Papers": [
      {
        year: "2026",
        type: "Conference",
        title: "Performance Evaluation of Hybrid Machine Learning Models for Heart Disease Prediction in U.S. Clinical Decision Support Systems",
        venue: "IEEE International Conference on Sentiment Analysis and Deep Learning (ICSADL)",
        links: [
          { label: "DOI", url: "https://doi.org/10.1109/ICSADL67539.2026.11452047" },
          { label: "IEEE", url: "https://ieeexplore.ieee.org/document/11452047" }
        ]
      },
      {
        year: "2025",
        type: "Conference",
        title: "An ANN Network-Based Approach for Early Detection of Parkinson's Disease Through Image Processing",
        venue: "IEEE Conference on Converging Technology",
        links: [
          { label: "DOI", url: "https://doi.org/10.1109/ICCTEIE66144.2025.11341843" },
          { label: "IEEE", url: "https://ieeexplore.ieee.org/abstract/document/11341843" }
        ]
      },
      {
        year: "2025",
        type: "Conference",
        title: "PneuNet: A Multi-Scale Attention-Enhanced CNN for Pediatric Pneumonia Detection from Chest X-rays",
        venue: "IEEE DELCON",
        links: [
          { label: "DOI", url: "https://doi.org/10.1109/DELCON68055.2025.11400229" },
          { label: "IEEE", url: "https://ieeexplore.ieee.org/abstract/document/11400229" }
        ]
      },
      {
        year: "2025",
        type: "Conference",
        title: "Deep Learning-Based Multi-Class Brain Tumor Classification from MRI using a Novel MS-DSCCNet Architecture",
        venue: "IEEE DELCON",
        links: [
          { label: "DOI", url: "https://doi.org/10.1109/DELCON68055.2025.11400450" },
          { label: "IEEE", url: "https://ieeexplore.ieee.org/abstract/document/11400450" }
        ]
      }
    ],

    "Manuscripts Under Review": [
      {
        year: "2026",
        type: "Under Review",
        title: "Systematic Evidence of Artifact-Driven Shortcut Learning in Fundus Image Models",
        venue: "Computer Methods and Programs in Biomedicine",
        description: "Manuscript under review."
      },
      {
        year: "2026",
        type: "Under Review",
        title: "Calibration Under Domain Shift in Diabetic Retinopathy Screening: Temperature Scaling Transfer and Target-Side Calibration with Limited Labels",
        venue: "Computerized Medical Imaging and Graphics",
        description: "Manuscript under review."
      },
      {
        year: "2026",
        type: "Under Review",
        title: "Evaluation of lightweight AI models for early diabetic retinopathy detection in resource-constrained screening settings",
        venue: "In review",
        description: "Manuscript under review."
      }
    ]
  },

  education: [
    {
      title: "MBA, Management Information Systems",
      meta: "International American University · 2024–2026",
      description: "Focus: Database systems, business analytics, and data-driven decision-making."
    },
    {
      title: "MSc, Global Business and Administration",
      meta: "Kyungsung University · 2022–2023",
      description: "Thesis: Integrating Artificial Intelligence in Business and Healthcare Decision Systems."
    },
    {
      title: "B.Tech, Computer Science and Engineering",
      meta: "Lovely Professional University · 2017–2021",
      description: "Background in software engineering, computing systems, and applied technical development."
    }
  ],

  experience: [
    {
      title: "Independent Medical AI Researcher",
      meta: "2023–Present · Los Angeles, USA",
      description:
        "Designed and evaluated deep learning models for retinal, dermatological, radiological, and healthcare prediction tasks, with increasing focus on reliability, generalization, and deployment-facing evaluation."
    },
    {
      title: "AI & Data Intern",
      meta: "Taskimpetus · 2024–Present (OPT)",
      description:
        "Supported AI-driven analytics and automation work using Python and SQL, including exploratory analysis, reproducible data workflows, and internal dashboard-oriented tasks."
    },
    {
      title: "Teaching Assistant",
      meta: "Kyungsung University · 2022–2023",
      description:
        "Mentored students on preprocessing, evaluation, and reproducible ML workflows while contributing to co-authored research outputs."
    },
    {
      title: "Junior Software Engineer",
      meta: "KCIT · 2020–2021",
      description:
        "Worked on smart systems integration and software-oriented engineering tasks, forming the technical base for later AI and analytics research."
    }
  ],

  service: {
    reviews: {
      title: "Verified peer reviews",
      count: "5 verified",
      items: [
        "IAES International Journal of Robotics and Automation (IJRA)",
        "International Journal of Electrical and Computer Engineering (IJECE)",
        "International Journal of Power Electronics and Drive Systems (IJPEDS)"
      ]
    },
    certifications: [
      {
        label: "IBM Data Science",
        url: "https://coursera.org/verify/professional-cert/EC6IHGSG99HX"
      },
      {
        label: "Google Cloud AI Healthcare",
        url: "https://coursera.org/verify/P4N76QCC77D3"
      },
      {
        label: "Illinois Tech AI Healthcare",
        url: "https://coursera.org/verify/IALUTM83NC4Q"
      },
      {
        label: "Elsevier Researcher Academy — Certified Peer Reviewer Course",
        url: ""
      }
    ]
  }
};
