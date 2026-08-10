# Keeret Mahi — Portfolio Website

My personal portfolio site, built with HTML, CSS, and JavaScript.

🔗 **Live site:** [keeretmahi.com](https://keeretmahi.com)

## About

 This site is where I share my projects, experience, and a bit more about who I am.

## Tech Stack

- HTML5
- CSS3
- JavaScript

## Static crawl layer

The interactive portfolio remains a client-rendered single-page app. Search engines and text-only scanners receive resolved semantic content through clean static routes, `robots.txt`, `sitemap.xml`, `llms.txt`, and the Markdown files under `content/`.

After changing `index.html` or public portfolio content, regenerate and verify the clean route documents:

```sh
node scripts/generate-static-routes.mjs
node scripts/verify-crawl-pages.mjs
```

The generated `index.html` files inside `projects/`, `experience/`, `resume/`, and `gallery/` should not be edited directly.
A GitHub Actions check reruns both commands on every push and pull request so generated pages cannot silently drift from the interactive site.

## Contact

- [LinkedIn](https://www.linkedin.com/in/keeret-mahi/)
- [GitHub](https://github.com/keeret-mahi)
