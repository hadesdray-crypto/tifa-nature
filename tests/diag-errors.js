const L = require('./lib');
(async () => {
  const s = await L.serve(L.WWW, 0), base = 'http://127.0.0.1:' + s.port, b = await L.launch();
  const ctx = await b.createBrowserContext(), page = await ctx.newPage();
  page.on('response', r => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
  page.on('pageerror', e => console.log('pageerror', e.message, (e.stack||'').split('\n').slice(0,3).join(' / ')));
  await page.goto(base + '/index.html', { waitUntil: 'load' }); await L.sleep(800);
  await b.close(); s.close();
})();
