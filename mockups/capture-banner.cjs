const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1600,700']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 700, deviceScaleFactor: 2 });
  await page.goto('file:///Users/moltbot/Desktop/RB7-Project/healthcare_fraud/nursing_home/frontend/mockups/reddit-banner.html', { waitUntil: 'networkidle0' });
  
  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 1000));
  
  // Screenshot just the banner element
  const banner = await page.$('.banner');
  await banner.screenshot({ 
    path: '/Users/moltbot/Desktop/RB7-Project/healthcare_fraud/nursing_home/frontend/mockups/reddit-banner.png',
    type: 'png'
  });
  
  console.log('Banner saved as reddit-banner.png');
  await browser.close();
})();
