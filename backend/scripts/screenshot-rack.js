const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Login
  await page.goto('http://wms-frontend-staging/login', {waitUntil: 'networkidle0'});
  await page.waitForSelector('input', {timeout: 5000}).catch(() => {});
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].type('admin@demo.com');
    await inputs[1].type('demo123');
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const t = await b.evaluate(el => el.textContent);
      if (t && t.includes('Sign')) { await b.click(); break; }
    }
  }
  await new Promise(r => setTimeout(r, 2000));

  // Go to racks
  await page.goto('http://wms-frontend-staging/racks', {waitUntil: 'networkidle0'});
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: '/app/uploads/rack_page.jpg', fullPage: true });
  await browser.close();
  console.log('OK');
})().catch(e => console.error('ERR:', e.message));
