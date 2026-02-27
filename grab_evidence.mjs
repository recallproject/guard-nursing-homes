import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 900 });

// Set subscription tier before navigating
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('subscription_tier', 'professional');
});

await page.goto('http://localhost:5179/evidence/325047', { waitUntil: 'networkidle0', timeout: 30000 });

// Wait for content to render
await page.waitForSelector('.ev-body', { timeout: 10000 });
await new Promise(r => setTimeout(r, 2000));

// Take full page screenshot
await page.screenshot({
  path: '/Users/moltbot/Desktop/evidence_page_preview.png',
  fullPage: true
});

console.log('Screenshot saved to ~/Desktop/evidence_page_preview.png');

// Also save as PDF
await page.pdf({
  path: '/Users/moltbot/Desktop/evidence_page_preview.pdf',
  format: 'A4',
  printBackground: true,
  margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' }
});

console.log('PDF saved to ~/Desktop/evidence_page_preview.pdf');

await browser.close();
