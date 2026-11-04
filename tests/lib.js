/* Outils de test : serveur statique + Chrome (puppeteer-core) avec profils de téléphones simulés. */
const http = require('http'), fs = require('fs'), path = require('path'), puppeteer = require('puppeteer-core');
const WWW = path.join(__dirname, '..', 'www');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

function serve(root, port, extra) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      if (extra && extra(req, res, u)) return;
      let f = path.join(root || WWW, u === '/' ? 'index.html' : u);
      if (!f.startsWith(root || WWW) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(port || 0, '127.0.0.1', () => resolve({ srv, port: srv.address().port, close: () => srv.close() }));
  });
}

/* Profils : largeur x hauteur en pixels CSS, ratio, tactile. Valeurs approchant les téléphones réels. */
const DEVICES = {
  'Pixel 8 (Android 14)': { w: 412, h: 915, dpr: 2.6, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' },
  'Samsung Galaxy A15 (Android 14)': { w: 384, h: 854, dpr: 2.8, ua: 'Mozilla/5.0 (Linux; Android 14; SM-A156B) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36' },
  'Samsung Galaxy S24 (Android 15)': { w: 360, h: 780, dpr: 3, ua: 'Mozilla/5.0 (Linux; Android 15; SM-S921B) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36' },
  'Samsung Galaxy A12 petit (Android 11)': { w: 360, h: 760, dpr: 2, ua: 'Mozilla/5.0 (Linux; Android 11; SM-A125F) AppleWebKit/537.36 Chrome/100.0 Mobile Safari/537.36' },
  'Samsung Z Fold (plié, Android 14)': { w: 280, h: 653, dpr: 3, ua: 'Mozilla/5.0 (Linux; Android 14; SM-F946B) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36' },
  'Samsung Z Fold (ouvert, Android 14)': { w: 673, h: 841, dpr: 2.2, ua: 'Mozilla/5.0 (Linux; Android 14; SM-F946B) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36' },
  'Samsung Z Flip (Android 13)': { w: 412, h: 914, dpr: 2.6, ua: 'Mozilla/5.0 (Linux; Android 13; SM-F731B) AppleWebKit/537.36 Chrome/115.0 Mobile Safari/537.36' },
  'Samsung Tab A9 tablette (Android 14)': { w: 800, h: 1280, dpr: 1.6, ua: 'Mozilla/5.0 (Linux; Android 14; SM-X110) AppleWebKit/537.36 Chrome/120.0 Safari/537.36' },
  'Xiaomi Redmi Note 12 (Android 13)': { w: 393, h: 873, dpr: 2.75, ua: 'Mozilla/5.0 (Linux; Android 13; 23021RAAEG) AppleWebKit/537.36 Chrome/118.0 Mobile Safari/537.36' },
  'Honor 90 (Android 14)': { w: 412, h: 915, dpr: 2.6, ua: 'Mozilla/5.0 (Linux; Android 14; REA-NX9) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36' },
  'Android 12 compact': { w: 360, h: 640, dpr: 2, ua: 'Mozilla/5.0 (Linux; Android 12; SM-A217F) AppleWebKit/537.36 Chrome/108.0 Mobile Safari/537.36' },
  'Android 16 Pixel 9': { w: 412, h: 923, dpr: 2.6, ua: 'Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36' }
};

async function launch() {
  return puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
}
async function newPage(browser, base, dev, opts) {
  opts = opts || {};
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const d = DEVICES[dev] || DEVICES['Pixel 8 (Android 14)'];
  await page.setViewport({ width: opts.landscape ? d.h : d.w, height: opts.landscape ? d.w : d.h, deviceScaleFactor: d.dpr, isMobile: true, hasTouch: true });
  await page.setUserAgent(d.ua);
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|ERR_FAILED|net::/.test(m.text())) page.errors.push('console: ' + m.text()); });
  if (opts.beforeLoad) await page.evaluateOnNewDocument(opts.beforeLoad);
  await page.goto(base + '/index.html' + (opts.hash || ''), { waitUntil: 'load' });
  await page.waitForFunction('window.__TIFA_STARTED === true', { timeout: 8000 });
  return page;
}
/* Saute la présentation de première ouverture */
async function skipOnboarding(page) {
  await page.evaluate(() => { T.store.s.flags.onboarded = true; T.store.save(); const m = T.modalStack[0]; if (m) m.close(); });
}
/* Contrôle de débordement : rien ne dépasse de l'écran, aucun bouton hors écran */
async function overflow(page) {
  return page.evaluate(() => {
    const W = window.innerWidth, H = window.innerHeight, bad = [];
    if (document.documentElement.scrollWidth > W + 1) bad.push('défilement horizontal de la page (' + document.documentElement.scrollWidth + ' > ' + W + ')');
    document.querySelectorAll('#view *, #tabs *, #topbar *, .modal *').forEach((el) => {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
      const st = getComputedStyle(el); if (st.visibility === 'hidden' || st.display === 'none') return;
      if (r.right > W + 1 || r.left < -1) bad.push((el.tagName + '.' + el.className + ' hors écran à droite/gauche: ' + Math.round(r.left) + '→' + Math.round(r.right)).slice(0, 120));
    });
    document.querySelectorAll('.modal-foot').forEach((f) => { const r = f.getBoundingClientRect(); if (r.bottom > H + 1) bad.push('boutons de fenêtre hors écran'); });
    const tabs = document.getElementById('tabs').getBoundingClientRect(); if (tabs.bottom > H + 1) bad.push('barre du bas hors écran');
    return bad.slice(0, 8);
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail: detail || '' }); console.log((ok ? '  ok   ' : '  ECHEC') + ' ' + name + (ok ? '' : ' -> ' + detail)); return !!ok; }
module.exports = { serve, launch, newPage, skipOnboarding, overflow, sleep, check, results, DEVICES, WWW };
