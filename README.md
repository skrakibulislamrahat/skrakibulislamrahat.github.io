# SK Rakib Ul Islam Rahat — Research Portfolio

Faculty-facing academic portfolio for **SK Rakib Ul Islam Rahat**, a **Computer Science PhD student at Wright State University** working on trustworthy artificial intelligence, medical imaging, reliable machine learning, and knowledge engineering.

## Research focus

- Trustworthy AI for medical imaging
- Dataset shift and external validation
- Probability calibration and high-confidence error
- Shortcut learning and dataset artifact auditing
- Explainable AI and model diagnostics
- Knowledge engineering, semantic representations, and neurosymbolic AI

## Selected research

### Artifact-driven shortcut learning in retinal AI
Research on whether diabetic-retinopathy models exploit non-pathological image artifacts such as borders, padding, and overlays, with external validation and attribution-based auditing.

Repository: [Exposing_Dataset_Artifacts](https://github.com/skrakibulislamrahat/Exposing_Dataset_Artifacts)

### Semantic transport failure across chest X-ray benchmarks
Cross-dataset reliability study testing whether superficially similar pneumonia and opacity labels behave as interchangeable prediction tasks across Kaggle, RSNA, and CheXpert. The project includes five-seed DenseNet-121 training, calibration/high-confidence-error analysis, and source-only operating-point transfer.

Repository: [semantic-shift-chest-xray](https://github.com/skrakibulislamrahat/semantic-shift-chest-xray)

### Calibration and reliability under dataset shift
Experimental work on probability calibration, seed stability, source-to-target transfer, and external evaluation on APTOS 2019 and Messidor-2.

Repository: [calibration-aware-dr-reliability](https://github.com/skrakibulislamrahat/calibration-aware-dr-reliability)

### Lightweight diabetic-retinopathy screening models
Five-fold evaluation of EfficientNet-B0, MobileNetV2, and SqueezeNet for resource-constrained retinal screening, including out-of-fold evaluation and pairwise statistical comparison.

Repository: [Lightweight_DR_Detection_Models](https://github.com/skrakibulislamrahat/Lightweight_DR_Detection_Models)

### Explainable multimodal retinal-AI prototype
Image + structured-feature fusion architecture with Grad-CAM and SHAP. The repository explicitly documents that the structured metadata used in the prototype are synthetic and should not be interpreted as patient-level clinical evidence.

Repository: [Multimodal_Framework_Research](https://github.com/skrakibulislamrahat/Multimodal_Framework_Research)

## Published work

- **TriGWONet: A lightweight multibranch convolutional neural network using gray wolf optimization for accurate oral cancer image classification.** *Discover Artificial Intelligence*, 2026. DOI: https://doi.org/10.1007/s44163-025-00776-x
- **Multimodal Deep Learning for Classifying Diabetic Retinopathy Severity.** *Journal of Korea Multimedia Society*, 2026. DOI: https://doi.org/10.9717/kmms.2026.29.3.524

The portfolio website contains the broader publication and scholarly-service record.

## Links

- Portfolio: https://skrakibulislamrahat.github.io/
- GitHub: https://github.com/skrakibulislamrahat
- Google Scholar: https://scholar.google.com/citations?user=0X1eRi8AAAAJ
- ORCID: https://orcid.org/0009-0005-0744-8398

## Site architecture

The site is data-driven: `data/site-data.js` is the source for the public profile, publications, education, experience, and service record. `index.html` renders the faculty-facing portfolio and `resume.html` generates a printable academic résumé from the same information.

## Front end and CV maintenance

The September 2026 redesign uses one stylesheet (`css/portfolio.css`) and one
renderer (`js/portfolio.js`). Do not reintroduce legacy patch stylesheets or
multiple renderers for the same components. Evidence panels use native tab
semantics; the figure viewer uses a native modal dialog. Hover lighting is
pointer-aware and motion respects `prefers-reduced-motion`.

Update `data/site-data.js` for the academic profile, review total, publications,
and project descriptions. Counts include completed peer-review rounds. Submitted
manuscripts are separated from published work.

Rebuild both the static HTML CV and the downloadable PDF from the same data:

```bash
python3 -m pip install reportlab
python3 scripts/build_cv.py
```

The outputs are `resume.html` and `assets/Rahat_Academic_CV.pdf`. Inspect all PDF
pages after a content change. The CV currently has three pages: background,
published research, and current research/service.

This is a static GitHub Pages site; no package install or bundling is needed to
serve it. For local development: `python3 -m http.server 8765`.
