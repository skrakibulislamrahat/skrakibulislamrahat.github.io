/* Shared source for the research portfolio and academic CV. */
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
    "headshot": "assets/headshot.png",
    "advisor": "Dr. Cogan Shimizu"
  },
  "hero": {
    "pill": "PhD Computer Science · Trustworthy AI · Medical Imaging · Knowledge Engineering",
    "title": "Reliable AI beyond benchmark accuracy.",
    "description": "I study trustworthy machine learning for medical imaging, with emphasis on dataset shift, calibration failure, shortcut learning, external validation, high-confidence error, explainability, and knowledge-guided reasoning.",
    "note": "Current doctoral work at Wright State University extends reliability-focused medical AI toward knowledge engineering, semantic representations, and neurosymbolic methods."
  },
  "stats": [
    {
      "value": "100+",
      "label": "Citations"
    },
    {
      "value": "12",
      "label": "Published works"
    },
    {
      "value": "10",
      "label": "Completed peer reviews"
    }
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
    {
      "status": "Submitted",
      "venue": "BSPC",
      "title": "Reduced background sensitivity does not ensure external discrimination in fundus classifiers",
      "description": "A 12-model study of background sensitivity and external discrimination across APTOS and a processed Messidor-2 archive."
    },
    {
      "status": "Under Review",
      "venue": "CMIG",
      "title": "Calibration Under Domain Shift in Diabetic Retinopathy Screening",
      "description": "Controlled evaluation of calibration transfer from APTOS to Messidor-2, including source-fitted temperature scaling and limited-label target-side recalibration."
    },
    {
      "status": "Research Project",
      "venue": "Chest X-ray",
      "highlight": "Cross-Dataset Reliability",
      "title": "Same Label, Different Disease: Semantic Transport Failure Across Chest X-ray Benchmarks",
      "description": "Five-seed DenseNet-121 study testing whether superficially similar pneumonia and opacity labels transfer reliably across Kaggle, RSNA, and CheXpert, with calibration and high-confidence-error analysis."
    },
    {
      "status": "Published",
      "venue": "KMMS",
      "highlight": "Published Work",
      "title": "Multimodal Deep Learning for Classifying Diabetic Retinopathy Severity",
      "description": "Explainable multimodal retinal-AI study with five-fold evaluation, external validation on Messidor-2, and interpretability analysis."
    }
  ],
  "visuals": [
    {
      "image": "assets/fig_reliability_shift.png",
      "alt": "Reliability diagrams showing calibration behavior under domain shift from APTOS to Messidor-2",
      "title": "Reliability under domain shift",
      "description": "Calibration behavior changes from in-domain APTOS to shifted Messidor-2, motivating explicit reliability evaluation rather than accuracy-only reporting."
    },
    {
      "image": "assets/fig_gradcam_audit.png",
      "alt": "Grad-CAM comparison showing reduced border-focused attention after artifact mitigation",
      "title": "Shortcut-learning audit with Grad-CAM",
      "description": "Attribution analysis is used to test whether model evidence concentrates on retinal regions or on peripheral non-pathological cues."
    }
  ],
  "publications": {
    "Journal Articles": [
      {
        "year": "2026",
        "type": "Journal",
        "title": "TriGWONet: A lightweight multibranch convolutional neural network using gray wolf optimization for accurate oral cancer image classification",
        "venue": "Discover Artificial Intelligence (Springer Nature)",
        "links": [
          {
            "label": "DOI",
            "url": "https://doi.org/10.1007/s44163-025-00776-x"
          },
          {
            "label": "View",
            "url": "https://link.springer.com/article/10.1007/s44163-025-00776-x"
          }
        ]
      },
      {
        "year": "2026",
        "type": "Journal",
        "title": "Multimodal Deep Learning for Classifying Diabetic Retinopathy Severity",
        "venue": "Journal of Korea Multimedia Society",
        "links": [
          {
            "label": "DOI",
            "url": "https://doi.org/10.9717/kmms.2026.29.3.524"
          }
        ]
      },
      {
        "year": "2025",
        "type": "Journal",
        "title": "Advancing diabetic retinopathy detection with AI and deep learning: Opportunities, limitations, and clinical barriers",
        "venue": "British Journal of Nursing Studies",
        "links": [
          {
            "label": "DOI",
            "url": "https://doi.org/10.32996/bjns.2025.5.2.1"
          },
          {
            "label": "View",
            "url": "https://al-kindipublishers.org/index.php/bjns/article/view/10314"
          }
        ]
      },
      {
        "year": "2025",
        "type": "Journal",
        "title": "Artificial intelligence for chronic kidney disease risk stratification in the USA: Ensemble vs. deep learning methods",
        "venue": "British Journal of Nursing Studies",
        "links": [
          {
            "label": "DOI",
            "url": "https://doi.org/10.32996/bjns.2025.5.2.3"
          },
          {
            "label": "View",
            "url": "https://al-kindipublishers.org/index.php/bjns/article/view/10498"
          }
        ]
      },
      {
        "year": "2025",
        "type": "Journal",
        "title": "A Deep Learning Framework for Early Breast Cancer Detection Among US Women: Integrating Mammography and Clinical EHR Data",
        "venue": "British Journal of Nursing Studies",
        "links": [
          {
            "label": "DOI",
            "url": "https://doi.org/10.32996/bjns.2025.5.2.6"
          },
          {
            "label": "View",
            "url": "https://al-kindipublishers.org/index.php/bjns/article/view/11667"
          }
        ]
      },
      {
        "year": "2024",
        "type": "Journal",
        "title": "Machine Learning-Based Hospital Readmission Prediction and Risk Analysis in the United States Healthcare System",
        "venue": "Journal of Computer Science and Technology Studies (JCSTS)",
        "links": [
          {
            "label": "DOI",
            "url": "https://doi.org/10.32996/jcsts.2024.6.5.32"
          },
          {
            "label": "View",
            "url": "https://doi.org/10.32996/jcsts.2024.6.5.32"
          }
        ]
      },
      {
        "year": "2023",
        "type": "Journal",
        "title": "Deep Learning-Based Skin Cancer Diagnosis in the United States: Advances, Challenges, and Clinical Translation",
        "venue": "Journal of Medical and Health Studies",
        "links": [
          {
            "label": "DOI",
            "url": "https://doi.org/10.32996/jmhs.2023.4.6.18"
          },
          {
            "label": "View",
            "url": "https://al-kindipublishers.org/index.php/jmhs/article/view/11890"
          }
        ]
      },
      {
        "year": "2023",
        "type": "Journal",
        "title": "A Transfer Learning-Based Deep Convolutional Neural Network Framework for Automated Multi-Class Eye Disease Classification in the USA Using Retinal Fundus Image",
        "venue": "Journal of Medical and Health Studies",
        "links": [
          {
            "label": "DOI",
            "url": "https://doi.org/10.32996/jmhs.2023.4.4.24"
          },
          {
            "label": "View",
            "url": "https://al-kindipublishers.org/index.php/jmhs/article/view/11950"
          }
        ]
      }
    ],
    "Conference Papers": [
      {
        "year": "2026",
        "type": "Conference",
        "title": "Performance Evaluation of Hybrid Machine Learning Models for Heart Disease Prediction in U.S. Clinical Decision Support Systems",
        "venue": "IEEE International Conference on Sentiment Analysis and Deep Learning (ICSADL)",
        "links": [
          {
            "label": "DOI",
            "url": "https://doi.org/10.1109/ICSADL67539.2026.11452047"
          },
          {
            "label": "IEEE",
            "url": "https://ieeexplore.ieee.org/document/11452047"
          }
        ]
      },
      {
        "year": "2025",
        "type": "Conference",
        "title": "An ANN Network-Based Approach for Early Detection of Parkinson's Disease Through Image Processing",
        "venue": "IEEE Conference on Converging Technology",
        "links": [
          {
            "label": "DOI",
            "url": "https://doi.org/10.1109/ICCTEIE66144.2025.11341843"
          },
          {
            "label": "IEEE",
            "url": "https://ieeexplore.ieee.org/abstract/document/11341843"
          }
        ]
      },
      {
        "year": "2025",
        "type": "Conference",
        "title": "PneuNet: A Multi-Scale Attention-Enhanced CNN for Pediatric Pneumonia Detection from Chest X-rays",
        "venue": "IEEE DELCON",
        "links": [
          {
            "label": "DOI",
            "url": "https://doi.org/10.1109/DELCON68055.2025.11400229"
          },
          {
            "label": "IEEE",
            "url": "https://ieeexplore.ieee.org/abstract/document/11400229"
          }
        ]
      },
      {
        "year": "2025",
        "type": "Conference",
        "title": "Deep Learning-Based Multi-Class Brain Tumor Classification from MRI using a Novel MS-DSCCNet Architecture",
        "venue": "IEEE DELCON",
        "links": [
          {
            "label": "DOI",
            "url": "https://doi.org/10.1109/DELCON68055.2025.11400450"
          },
          {
            "label": "IEEE",
            "url": "https://ieeexplore.ieee.org/abstract/document/11400450"
          }
        ]
      }
    ],
    "Manuscripts": [
      {
        "year": "2026",
        "type": "Submitted",
        "title": "Reduced background sensitivity does not ensure external discrimination in fundus classifiers",
        "venue": "Biomedical Signal Processing and Control",
        "description": "Submitted September 2026."
      },
      {
        "year": "2026",
        "type": "Under Review",
        "title": "Calibration Under Domain Shift in Diabetic Retinopathy Screening: Temperature Scaling Transfer and Target-Side Calibration with Limited Labels",
        "venue": "Computerized Medical Imaging and Graphics",
        "description": "Manuscript under review."
      },
      {
        "year": "2026",
        "type": "Under Review",
        "title": "Evaluation of lightweight AI models for early diabetic retinopathy detection in resource-constrained screening settings",
        "venue": "In review",
        "description": "Manuscript under review."
      }
    ]
  },
  "education": [
    {
      "title": "PhD, Computer Science",
      "meta": "Wright State University · 2026–Present",
      "description": "Research focus: trustworthy AI, medical imaging, reliable machine learning, knowledge engineering, dataset shift, calibration, shortcut learning, and knowledge-guided/neurosymbolic methods."
    },
    {
      "title": "MBA, Management Information Systems",
      "meta": "International American University · 2024–2026",
      "description": "Focus: database systems, business analytics, and data-driven decision-making."
    },
    {
      "title": "MSc, Global Business and Administration",
      "meta": "Kyungsung University · 2022–2023",
      "description": "Thesis: Integrating Artificial Intelligence in Business and Healthcare Decision Systems."
    },
    {
      "title": "B.Tech, Computer Science and Engineering",
      "meta": "Lovely Professional University · 2017–2021",
      "description": "Background in software engineering, computing systems, and applied technical development."
    }
  ],
  "experience": [
    {
      "title": "PhD Student / Researcher",
      "meta": "Wright State University · 2026–Present · Dayton, Ohio",
      "description": "Doctoral research connecting trustworthy medical AI, reliable evaluation, knowledge engineering, and semantic representations."
    },
    {
      "title": "Independent Medical AI Researcher",
      "meta": "2023–Present · United States",
      "description": "Developed medical-imaging studies on dataset shift, calibration, shortcut learning, and reproducible external evaluation."
    },
    {
      "title": "AI & Data Intern",
      "meta": "Taskimpetus · 2024–2026",
      "description": "Supported analytics and automation using Python and SQL, exploratory analysis, and reproducible data workflows."
    },
    {
      "title": "Teaching Assistant",
      "meta": "Kyungsung University · 2022–2023",
      "description": "Mentored students on preprocessing, evaluation, and reproducible ML workflows; contributed to co-authored research."
    },
    {
      "title": "Junior Software Engineer",
      "meta": "KCIT · 2020–2021",
      "description": "Contributed to software engineering, smart-system integration, and applied technical development."
    }
  ],
  "service": {
    "reviews": {
      "title": "Completed peer reviews",
      "total": 10,
      "count": "10 completed reviews · 5 journals",
      "note": "Includes completed review rounds. Updated September 17, 2026.",
      "items": [
        "IAES International Journal of Robotics and Automation (IJRA)",
        "International Journal of Electrical and Computer Engineering (IJECE)",
        "International Journal of Power Electronics and Drive Systems (IJPEDS)",
        "Computer Methods in Biomechanics and Biomedical Engineering",
        "Information Fusion"
      ]
    },
    "certifications": [
      {
        "label": "IBM Data Science",
        "url": "https://coursera.org/verify/professional-cert/EC6IHGSG99HX"
      },
      {
        "label": "Google Cloud AI Healthcare",
        "url": "https://coursera.org/verify/P4N76QCC77D3"
      },
      {
        "label": "Illinois Tech AI Healthcare",
        "url": "https://coursera.org/verify/IALUTM83NC4Q"
      },
      {
        "label": "Elsevier Researcher Academy — Certified Peer Reviewer Course",
        "url": ""
      }
    ]
  },
  "updated": "September 17, 2026",
  "projects": [
    {
      "id": "artifacts",
      "number": "01",
      "category": "Medical imaging / shortcut learning",
      "title": "When cleaner inputs do not mean better predictions.",
      "cvTitle": "Background sensitivity and external discrimination in fundus classifiers",
      "summary": "Twelve models. Two architectures. One fixed APTOS split. A study separating background sensitivity from external discrimination on a processed Messidor-2 archive.",
      "status": "Submitted · BSPC",
      "tags": [
        "ResNet-18",
        "EfficientNet-B0",
        "External validation"
      ],
      "repo": "https://github.com/skrakibulislamrahat/Exposing_Dataset_Artifacts",
      "details": "https://github.com/skrakibulislamrahat/Exposing_Dataset_Artifacts/blob/main/REPRODUCIBILITY.md"
    },
    {
      "id": "semantic",
      "number": "02",
      "category": "Chest X-ray / semantic transport",
      "title": "Same label. Different prediction task.",
      "cvTitle": "Semantic transport across chest X-ray benchmarks",
      "summary": "Five-seed DenseNet-121 experiments across Kaggle, RSNA, and CheXpert examine label transport, calibration, and high-confidence errors.",
      "status": "Research project",
      "tags": [
        "DenseNet-121",
        "Semantic shift",
        "Five seeds"
      ],
      "repo": "https://github.com/skrakibulislamrahat/semantic-shift-chest-xray",
      "details": "https://github.com/skrakibulislamrahat/semantic-shift-chest-xray/blob/main/RESULTS.md"
    },
    {
      "id": "calibration",
      "number": "03",
      "category": "Reliable ML / probability calibration",
      "title": "Confidence needs an external check.",
      "cvTitle": "Calibration-aware diabetic-retinopathy reliability",
      "summary": "Traceable experiments on calibration transfer from APTOS to Messidor-2, preserving split definitions, predictions, metrics, and audit artifacts.",
      "status": "Research project",
      "tags": [
        "Temperature scaling",
        "Dataset shift",
        "Reproducibility"
      ],
      "repo": "https://github.com/skrakibulislamrahat/calibration-aware-dr-reliability",
      "details": "https://github.com/skrakibulislamrahat/calibration-aware-dr-reliability/blob/main/ARTIFACT_INDEX.md"
    },
    {
      "id": "lightweight",
      "number": "04",
      "category": "Efficient AI / retinal screening",
      "title": "Smaller models. The same scrutiny.",
      "cvTitle": "Lightweight diabetic-retinopathy screening models",
      "summary": "Five-fold comparison of EfficientNet-B0, MobileNetV2, and SqueezeNet using out-of-fold predictions and paired statistical tests.",
      "status": "Research project",
      "tags": [
        "Five-fold evaluation",
        "Compact CNNs",
        "Paired testing"
      ],
      "repo": "https://github.com/skrakibulislamrahat/Lightweight_DR_Detection_Models",
      "details": "https://github.com/skrakibulislamrahat/Lightweight_DR_Detection_Models/blob/main/RESULTS.md"
    }
  ],
  "skills": [
    [
      "Programming",
      "Python, SQL, Java"
    ],
    [
      "Machine learning",
      "PyTorch, TensorFlow, scikit-learn, CNNs, multimodal learning"
    ],
    [
      "Evaluation",
      "External validation, calibration, dataset shift, Grad-CAM, SHAP"
    ],
    [
      "Research tools",
      "Jupyter, Google Colab, GitHub, LaTeX, Overleaf"
    ],
    [
      "Current doctoral interests",
      "Knowledge engineering, semantic representations, knowledge graphs, neurosymbolic AI"
    ]
  ]
};
