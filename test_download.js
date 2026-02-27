const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testDownload() {
  const downloadDir = '/tmp/downloads_test';
  
  // Create download directory
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set up download behavior
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadDir,
    });
    
    console.log('Loading http://localhost:5174...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded successfully');
    
    // Log page title
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Scroll to find the button
    console.log('Scrolling to find "Download Sample PDF" button...');
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(1000);
    
    // Try to find and click the download button
    const buttonSelector = 'button, a, [role="button"]';
    const buttons = await page.$$eval(buttonSelector, elements => 
      elements.map(el => ({
        text: el.textContent.trim(),
        tagName: el.tagName,
        href: el.href || 'N/A'
      }))
    );
    
    console.log('Found buttons/links:');
    buttons.forEach((btn, i) => {
      if (btn.text.includes('Download') || btn.text.includes('Sample') || btn.text.includes('PDF')) {
        console.log(`  [${i}] ${btn.tagName}: "${btn.text}" (${btn.href})`);
      }
    });
    
    // Try to find the specific button
    const downloadButton = await page.$('button:has-text("Download Sample PDF"), a:has-text("Download Sample PDF")');
    
    if (downloadButton) {
      console.log('Found "Download Sample PDF" button!');
      console.log('Clicking the button...');
      await downloadButton.click();
      
      // Wait for download to complete
      console.log('Waiting for download...');
      await page.waitForTimeout(5000);
      
      // Check if any files were downloaded
      const files = fs.readdirSync(downloadDir);
      console.log(`Files in download directory: ${files}`);
      
      if (files.length > 0) {
        files.forEach(file => {
          const filePath = path.join(downloadDir, file);
          const stats = fs.statSync(filePath);
          console.log(`SUCCESS: Downloaded "${file}" (${stats.size} bytes)`);
        });
      } else {
        console.log('FAILED: No files were downloaded');
      }
    } else {
      console.log('ERROR: "Download Sample PDF" button not found');
      console.log('All button/link text content:');
      buttons.slice(0, 20).forEach((btn, i) => {
        console.log(`  [${i}] ${btn.tagName}: "${btn.text.substring(0, 100)}"`);
      });
    }
    
    // Capture console logs and errors
    page.on('console', msg => {
      console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    });
    
    page.on('error', err => {
      console.log(`[PAGE ERROR] ${err.message}`);
    });
    
  } catch (error) {
    console.log(`ERROR: ${error.message}`);
  } finally {
    await browser.close();
  }
}

testDownload();
