import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    page.on('requestfailed', request =>
      console.log('REQUEST FAILED:', request.url(), request.failure().errorText)
    );
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0', timeout: 5000 });
    console.log('Page loaded');
    await new Promise(r => setTimeout(r, 1000)); // wait for 3d render
    await page.screenshot({ path: 'd:/tools/skin_preview/screenshot.png' });
    console.log('Screenshot saved to screenshot.png');
    await browser.close();
  } catch (err) {
    console.error('Puppeteer error:', err);
  }
})();
