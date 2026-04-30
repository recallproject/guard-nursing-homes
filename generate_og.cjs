// generate_og.cjs — render scripts/og-template.html → public/og-image.png
// Uses puppeteer (already a devDependency) so we get real Source Serif 4 from
// Google Fonts instead of the Georgia fallback the old node-canvas script used.
//
// Run from the frontend root:
//   node generate_og.cjs

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const TEMPLATE = path.join(__dirname, 'scripts', 'og-template.html');
const OUTPUT = path.join(__dirname, 'public', 'og-image.png');
const WIDTH = 1200;
const HEIGHT = 630;

(async () => {
  if (!fs.existsSync(TEMPLATE)) {
    console.error(`✗ Template not found: ${TEMPLATE}`);
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });

    // file:// URL so Google Fonts (https) can still load
    await page.goto('file://' + TEMPLATE, { waitUntil: 'networkidle0', timeout: 30000 });

    // Belt and suspenders: wait for fonts to actually be ready
    await page.evaluate(() => document.fonts.ready);

    // Tiny extra settle for font swap
    await new Promise((r) => setTimeout(r, 500));

    await page.screenshot({
      path: OUTPUT,
      type: 'png',
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
      omitBackground: false,
    });

    const stats = fs.statSync(OUTPUT);
    console.log(`✓ OG image written: ${OUTPUT}`);
    console.log(`✓ Dimensions: ${WIDTH}×${HEIGHT} (2x device scale)`);
    console.log(`✓ File size: ${(stats.size / 1024).toFixed(1)} KB`);
  } catch (err) {
    console.error('✗ Failed to render OG image:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
