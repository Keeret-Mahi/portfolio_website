# Keeret Mahi — Portfolio Website

Keeret Mahi's personal portfolio, built as a static HTML, CSS, and JavaScript site.

Live at [keeretmahi.com](https://keeretmahi.com).

## Run locally

From the project directory, start a local web server:

```sh
python3 -m http.server 5173
```

Then open [http://localhost:5173](http://localhost:5173).

A local server is required because the project write-ups are loaded from Markdown files with `fetch()`.

## Project structure

```text
.
├── index.html                  # Redirects visitors to the current portfolio document
├── Portfolio.dc.html           # Current portfolio UI and application logic
├── support.js                  # Browser runtime used by Portfolio.dc.html
├── content/projects/           # Project write-ups in Markdown
├── assets/images/              # Site and project imagery
├── assets/videos/              # Compressed videos used by project write-ups
├── assets/*.pdf                # Resume PDF
├── CNAME                       # GitHub Pages custom domain
└── .nojekyll                   # Serve the repository as a static site
```

## Hosting

The site is deployed through GitHub Pages from the repository's `main` branch. It has no server-side runtime or build step.
