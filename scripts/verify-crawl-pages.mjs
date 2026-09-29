import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const pages = [
  ['index.html', 'Keeret Mahi', 'https://keeretmahi.com/'],
  ['projects/index.html', 'Projects | Keeret Mahi', 'https://keeretmahi.com/projects/'],
  ['projects/goose-calendar/index.html', 'gooseCalendar | Keeret Mahi', 'https://keeretmahi.com/projects/goose-calendar/'],
  ['projects/cnc-plotter/index.html', 'GCode Plotter | Keeret Mahi', 'https://keeretmahi.com/projects/cnc-plotter/'],
  ['experience/index.html', 'Experience | Keeret Mahi', 'https://keeretmahi.com/experience/'],
  ['resume/index.html', 'Resume | Keeret Mahi', 'https://keeretmahi.com/resume/'],
  ['gallery/index.html', 'Gallery | Keeret Mahi', 'https://keeretmahi.com/gallery/'],
];

const fail = (message) => { throw new Error(message); };
const rootHtml = await readFile(join(root, 'index.html'), 'utf8');
const resumePdfUrl = '/assets/Keeret%20Mahi%20Resume%20%28Portfolio%29.pdf';
const faviconLinks = [
  '<link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg">',
  '<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">',
  '<link rel="icon" type="image/png" sizes="32x32" href="/images/title-images/title-image-32.png">',
  '<link rel="shortcut icon" href="/favicon.ico">',
  '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
];
const rootAppTemplate = rootHtml.match(/<x-dc hidden aria-hidden="true" data-nosnippet>[\s\S]*?<\/x-dc>/)?.[0];
if (!rootAppTemplate) fail('index.html: missing interactive application template');

for (const [file, title, canonical] of pages) {
  const html = await readFile(join(root, file), 'utf8');
  if (!html.includes('<html lang="en">')) fail(`${file}: missing document language`);
  if (!html.includes(`<title>${title}</title>`)) fail(`${file}: incorrect title`);
  if (!html.includes(`<link rel="canonical" href="${canonical}">`)) fail(`${file}: incorrect canonical URL`);
  if (!html.includes('<meta name="robots" content="index, follow, max-image-preview:large">')) fail(`${file}: missing indexing directive`);
  for (const faviconLink of faviconLinks) {
    if (!html.includes(faviconLink)) fail(`${file}: missing current favicon reference ${faviconLink}`);
  }
  if (html.includes('href="./favicon.svg"')) fail(`${file}: favicon URL is route-relative`);
  if (!html.includes('<template id="portfolio-app-template">')) fail(`${file}: interactive template is not isolated from static readers`);
  if (!html.includes('<x-dc hidden aria-hidden="true" data-nosnippet>')) fail(`${file}: raw client template is not hidden from static readers`);
  if (!html.includes(`pdfjs.getDocument('${resumePdfUrl}')`)) fail(`${file}: resume viewer does not use the root-relative PDF URL`);
  if (html.includes("pdfjs.getDocument('./assets/")) fail(`${file}: resume viewer can resolve the PDF beneath a clean route and return 404`);
  const appTemplate = html.match(/<x-dc hidden aria-hidden="true" data-nosnippet>[\s\S]*?<\/x-dc>/)?.[0];
  if (appTemplate !== rootAppTemplate) fail(`${file}: interactive application differs from the homepage`);

  const fallback = html.match(/<!-- CRAWL_FALLBACK_START -->([\s\S]*?)<!-- CRAWL_FALLBACK_END -->/);
  if (!fallback || !/<h1>/.test(fallback[1])) fail(`${file}: missing semantic crawl fallback`);
  if (/{{|}}/.test(fallback[1])) fail(`${file}: unresolved template value in crawl fallback`);
  if (/<noscript>[\s\S]*?CRAWL_FALLBACK_START/.test(html)) fail(`${file}: semantic fallback is only available inside noscript`);

  const component = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);
  if (!component) fail(`${file}: missing application component`);
  new Function(component[1]);

  const jsonLd = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  if (!jsonLd.length) fail(`${file}: missing structured data`);
  jsonLd.forEach((match) => JSON.parse(match[1]));
  if (file !== 'index.html' && !html.includes('<script id="route-structured-data" type="application/ld+json">')) fail(`${file}: missing route-specific structured data`);
}

const resumePdf = await readFile(join(root, 'assets/Keeret Mahi Resume (Portfolio).pdf'));
if (resumePdf.subarray(0, 5).toString() !== '%PDF-') fail('resume PDF asset is missing or invalid');

const pngIcons = [
  'favicon-48x48.png',
  'apple-touch-icon.png',
  'images/title-images/title-image-32.png',
];
for (const icon of pngIcons) {
  const contents = await readFile(join(root, icon));
  if (contents.subarray(1, 4).toString() !== 'PNG') fail(`${icon}: favicon asset is missing or invalid`);
}
const ico = await readFile(join(root, 'favicon.ico'));
if (!ico.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]))) fail('favicon.ico: favicon asset is missing or invalid');
const shopifyLogo = await readFile(join(root, 'assets/images/experience-pics/shopify-bag.svg'), 'utf8');
if (!shopifyLogo.includes('<svg') || !shopifyLogo.includes('#95BF47')) fail('Shopify experience logo is missing or is not the official green bag asset');

const componentSource = rootHtml.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)?.[1];
class TestLogic {
  setState(update) { this.state = { ...this.state, ...(typeof update === 'function' ? update(this.state) : update) }; }
}
const Component = new Function('DCLogic', `${componentSource}; return Component;`)(TestLogic);
const routeStates = [
  ['/', 'about', null],
  ['/projects/', 'projects', null],
  ['/projects/goose-calendar/', 'projects', 'goose-calendar'],
  ['/projects/cnc-plotter/', 'projects', 'cnc-plotter'],
  ['/experience/', 'experience', null],
  ['/resume/', 'resume', null],
  ['/gallery/', 'gallery', null],
];
const originalGlobals = {
  location: globalThis.location,
  history: globalThis.history,
  window: globalThis.window,
  document: globalThis.document,
  requestAnimationFrame: globalThis.requestAnimationFrame,
  setInterval: globalThis.setInterval,
};
globalThis.history = { replaceState() {}, pushState() {} };
globalThis.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }) };
globalThis.document = { addEventListener() {}, removeEventListener() {}, querySelector: () => null, hidden: false };
globalThis.requestAnimationFrame = () => 0;
globalThis.setInterval = () => 0;
for (const [pathname, expectedPage, expectedSlug] of routeStates) {
  globalThis.location = { pathname, search: '', hash: '' };
  const instance = new Component();
  if (instance.state.page !== expectedPage || instance.state.projectSlug !== expectedSlug) {
    fail(`${pathname}: initial render would use ${instance.state.page}/${instance.state.projectSlug}, expected ${expectedPage}/${expectedSlug}`);
  }
  if (instance._cleanRoutePath(expectedPage, expectedSlug) !== pathname) {
    fail(`${pathname}: client navigation does not map back to the clean route`);
  }
  for (const method of ['_tick', '_startStatRotation', '_initHalo', '_syncNav', '_animateIn', '_playHomeIntro', '_syncHeroVideo', '_syncInlineVideos', '_syncResumeViewer', '_loadProjectWriteup']) {
    instance[method] = () => {};
  }
  instance.componentDidMount();
  if (instance.state.page !== expectedPage || instance.state.projectSlug !== expectedSlug) {
    fail(`${pathname}: initialized ${instance.state.page}/${instance.state.projectSlug}, expected ${expectedPage}/${expectedSlug}`);
  }
}

const routeWrites = [];
globalThis.history = {
  replaceState(_state, _title, url) { routeWrites.push(['replace', url]); },
  pushState(_state, _title, url) { routeWrites.push(['push', url]); },
};
globalThis.location = { pathname: '/', search: '', hash: '' };
const navigationInstance = new Component();
navigationInstance._writeRoute('experience', null, false);
navigationInstance._writeRoute('projects', 'goose-calendar', false);
if (!routeWrites.some(([method, url]) => method === 'push' && url === '/experience/')) fail('client navigation: Experience does not use its clean URL');
if (!routeWrites.some(([method, url]) => method === 'push' && url === '/projects/goose-calendar/')) fail('client navigation: gooseCalendar does not use its clean URL');

globalThis.location = { pathname: '/', search: '', hash: '' };
const historyInstance = new Component();
for (const method of ['_tick', '_startStatRotation', '_initHalo', '_syncNav', '_animateIn', '_playHomeIntro', '_syncHeroVideo', '_syncInlineVideos', '_syncResumeViewer', '_loadProjectWriteup']) {
  historyInstance[method] = () => {};
}
historyInstance.componentDidMount();
historyInstance.setState({ lightbox: 2, showPeople: true, factCard: 'typing' });
globalThis.location = { pathname: '/experience/', search: '', hash: '' };
historyInstance._onRouteChange();
if (historyInstance.state.lightbox !== null || historyInstance.state.showPeople || historyInstance.state.factCard !== null) {
  fail('browser history: route-specific overlays are not cleared');
}
Object.assign(globalThis, originalGlobals);

const aboutMarkdown = await readFile(join(root, 'content/about.md'), 'utf8');
const rootFallback = rootHtml.match(/<!-- CRAWL_FALLBACK_START -->([\s\S]*?)<!-- CRAWL_FALLBACK_END -->/)?.[1] || '';
for (const phrase of ['Keeret Mahi', 'Incoming Software Engineer at Shopify', 'AI Enablement at Constellation Software', 'astronomy', 'keeretmahi@gmail.com']) {
  if (!aboutMarkdown.includes(phrase) || !rootFallback.includes(phrase)) fail(`index.html: About fallback is missing generated content for ${phrase}`);
}

const robots = await readFile(join(root, 'robots.txt'), 'utf8');
for (const agent of ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot']) {
  if (!robots.includes(`User-agent: ${agent}`)) fail(`robots.txt: missing ${agent}`);
}
if (!robots.includes('User-agent: GPTBot\nAllow: /')) fail('robots.txt: GPTBot cannot read the public portfolio');
if (!robots.includes('Sitemap: https://keeretmahi.com/sitemap.xml')) fail('robots.txt: missing sitemap link');

const sitemap = await readFile(join(root, 'sitemap.xml'), 'utf8');
for (const [, , canonical] of pages) {
  if (!sitemap.includes(`<loc>${canonical}</loc>`)) fail(`sitemap.xml: missing ${canonical}`);
}

const llms = await readFile(join(root, 'llms.txt'), 'utf8');
for (const required of ['content/about.md', 'content/projects/goose-calendar.md', 'content/projects/cnc-plotter.md', 'content/experience.md', 'content/resume.md', 'content/gallery.md']) {
  if (!llms.includes(required)) fail(`llms.txt: missing ${required}`);
}

console.log(`Verified ${pages.length} crawlable pages, clean-route app initialization, robots.txt, sitemap.xml, llms.txt, structured data, and application syntax.`);
