# Modular Portfolio Starter

This version keeps the same single-page portfolio idea but separates the code into maintainable files.

## File map

- `index.html` = page shell only
- `data/site-data.js` = edit your profile, stats, publications, education, experience, links, certifications
- `css/styles.css` = all portfolio design and animations
- `js/render.js` = builds the homepage cards from `site-data.js`
- `js/animations.js` = scroll reveal animation
- `resume.html` = printable resume generated from the same data
- `css/resume.css` = resume design
- `js/resume.js` = builds the resume from `site-data.js`
- `assets/` = put `headshot.png`, `fig_reliability_shift.png`, `fig_gradcam_audit.png`, `favicon.svg`

## How to update

1. New paper? Edit `data/site-data.js`.
2. New citations? Update the `stats` section in `data/site-data.js`.
3. New CV content? Update `data/site-data.js`; `resume.html` will reuse the same data.
4. Change colors/design? Edit the variables at the top of `css/styles.css`.
5. Change animations? Edit `.reveal` in `css/styles.css` or `js/animations.js`.

## Deploy on GitHub Pages

For the repository `skrakibulislamrahat.github.io`, place these files in the repository root and push to `main`.

Keep this file if useful, or delete it before final deployment.
