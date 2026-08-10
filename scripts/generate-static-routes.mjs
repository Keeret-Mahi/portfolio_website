import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
let sourceHtml = await readFile(join(root, 'index.html'), 'utf8');

const routes = [
  {
    path: '/projects/',
    output: 'projects/index.html',
    source: 'content/projects/index.md',
    title: 'Projects | Keeret Mahi',
    description: 'Software and hardware projects designed and built by Keeret Mahi, including gooseCalendar and the GCode Plotter.',
    type: 'CollectionPage',
  },
  {
    path: '/projects/goose-calendar/',
    output: 'projects/goose-calendar/index.html',
    source: 'content/projects/goose-calendar.md',
    title: 'gooseCalendar | Keeret Mahi',
    description: 'How Keeret Mahi built gooseCalendar to turn course outlines into clean, reviewable calendar events.',
    type: 'TechArticle',
    image: 'https://keeretmahi.com/assets/images/goose-calendar/hero-image.png',
  },
  {
    path: '/projects/cnc-plotter/',
    output: 'projects/cnc-plotter/index.html',
    source: 'content/projects/cnc-plotter.md',
    title: 'GCode Plotter | Keeret Mahi',
    description: 'How Keeret Mahi built a GCode pen plotter that converts vector paths into coordinated physical drawings.',
    type: 'TechArticle',
    image: 'https://keeretmahi.com/assets/images/cnc-plotter/hero2-cncplotter.jpg',
  },
  {
    path: '/experience/',
    output: 'experience/index.html',
    source: 'content/experience.md',
    title: 'Experience | Keeret Mahi',
    description: 'Professional experience, leadership, and education from Keeret Mahi.',
    type: 'ProfilePage',
  },
  {
    path: '/resume/',
    output: 'resume/index.html',
    source: 'content/resume.md',
    title: 'Resume | Keeret Mahi',
    description: 'Resume, education, selected experience, and projects from Keeret Mahi.',
    type: 'ProfilePage',
  },
  {
    path: '/gallery/',
    output: 'gallery/index.html',
    source: 'content/gallery.md',
    title: 'Gallery | Keeret Mahi',
    description: 'Milestones from Keeret Mahi including his valedictorian address, DECA, graduation, and case competitions.',
    type: 'CollectionPage',
  },
];

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const inlineMarkdown = (value) => escapeHtml(value)
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+|\.?\.?\/[^)]+)\)/g, '<a href="$2">$1</a>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

function markdownToHtml(markdown) {
  const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');
  const output = [];
  let paragraph = [];
  let listOpen = false;
  let codeOpen = false;
  let codeLines = [];

  const closeList = () => {
    if (!listOpen) return;
    output.push('</ul>');
    listOpen = false;
  };
  const flushParagraph = () => {
    if (!paragraph.length) return;
    closeList();
    output.push(`<p>${inlineMarkdown(paragraph.join(' ').replace(/\s+/g, ' ').trim())}</p>`);
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^```/.test(line)) {
      flushParagraph();
      closeList();
      if (codeOpen) {
        output.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
      }
      codeOpen = !codeOpen;
      continue;
    }
    if (codeOpen) {
      codeLines.push(rawLine);
      continue;
    }
    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const emphasis = line.match(/^\*\*\*(.+)\*\*\*$/);
    if (emphasis) {
      flushParagraph();
      closeList();
      output.push(`<p><strong><em>${inlineMarkdown(emphasis[1])}</em></strong></p>`);
      continue;
    }
    const pipeline = line.match(/^\[PIPELINE:\s*(.+)\]$/i);
    if (pipeline) {
      flushParagraph();
      closeList();
      const steps = pipeline[1].split(/\s*(?:->|→)\s*/).filter(Boolean);
      output.push(`<ol>${steps.map((step) => `<li>${inlineMarkdown(step)}</li>`).join('')}</ol>`);
      continue;
    }
    const media = line.match(/^\[(IMAGE|VIDEO):\s*(.+)\]$/i);
    if (media) {
      flushParagraph();
      closeList();
      const parts = media[2].split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean);
      const asset = parts.shift() || '';
      const kicker = parts.length > 1 ? parts.shift() : media[1].toLowerCase();
      const label = parts.join(' | ') || kicker;
      if (media[1].toUpperCase() === 'IMAGE') {
        output.push(`<figure><img src="/${escapeHtml(asset.replace(/^\.\//, ''))}" alt="${escapeHtml(label)}" loading="lazy"><figcaption><strong>${inlineMarkdown(kicker)}</strong> ${inlineMarkdown(label)}</figcaption></figure>`);
      } else {
        output.push(`<p><strong>Video:</strong> ${inlineMarkdown(label)} <a href="/${escapeHtml(asset.replace(/^\.\//, ''))}">Open video file</a>.</p>`);
      }
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (!listOpen) {
        output.push('<ul>');
        listOpen = true;
      }
      output.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  closeList();
  if (codeOpen && codeLines.length) output.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  return output.join('\n  ');
}

const nav = `
  <nav aria-label="Portfolio pages">
    <a href="/">About</a>
    <a href="/projects/">Projects</a>
    <a href="/experience/">Experience</a>
    <a href="/resume/">Resume</a>
    <a href="/gallery/">Gallery</a>
  </nav>`;

function replaceMeta(html, route) {
  const url = `https://keeretmahi.com${route.path}`;
  const socialType = route.type === 'TechArticle' ? 'article' : 'website';
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(route.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(route.description)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`)
    .replace(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="${socialType}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtml(route.title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(route.description)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeHtml(route.title)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeHtml(route.description)}">`);
}

const buildFallback = (article) => `<main class="crawl-fallback">${nav}\n  ${article}\n  <p><a href="/llms.txt">Machine-readable portfolio index</a></p>\n</main>`;

const aboutMarkdown = await readFile(join(root, 'content/about.md'), 'utf8');
const aboutFallback = buildFallback(markdownToHtml(aboutMarkdown));
sourceHtml = sourceHtml.replace(
  /<!-- CRAWL_FALLBACK_START -->[\s\S]*?<!-- CRAWL_FALLBACK_END -->/,
  `<!-- CRAWL_FALLBACK_START -->\n${aboutFallback}\n<!-- CRAWL_FALLBACK_END -->`,
);
await writeFile(join(root, 'index.html'), sourceHtml);
console.log('generated index.html crawl fallback');

for (const route of routes) {
  const markdown = await readFile(join(root, route.source), 'utf8');
  const article = markdownToHtml(markdown);
  const fallback = buildFallback(article);
  const pageJsonLd = `<script id="route-structured-data" type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': route.type,
    name: route.title.replace(' | Keeret Mahi', ''),
    url: `https://keeretmahi.com${route.path}`,
    description: route.description,
    ...(route.type === 'TechArticle' ? { headline: route.title.replace(' | Keeret Mahi', '') } : {}),
    ...(route.image ? { image: route.image } : {}),
    author: { '@id': 'https://keeretmahi.com/#person' },
    isPartOf: { '@id': 'https://keeretmahi.com/#website' },
  })}</script>`;
  let html = replaceMeta(sourceHtml, route)
    .replace(/<!-- CRAWL_FALLBACK_START -->[\s\S]*?<!-- CRAWL_FALLBACK_END -->/, `<!-- CRAWL_FALLBACK_START -->\n${fallback}\n<!-- CRAWL_FALLBACK_END -->`)
    .replace('</head>', `${pageJsonLd}\n</head>`)
    .replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<!-- Generated by scripts/generate-static-routes.mjs. Edit index.html or content/*.md, then regenerate. -->');
  const outputPath = join(root, route.output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html);
  console.log(`generated ${route.output}`);
}
