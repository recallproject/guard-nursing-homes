import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function testDownload() {
  const downloadDir = '/tmp/downloads_test';
  
  // Create download directory
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  
  // Clean up old downloads
  const oldFiles = fs.readdirSync(downloadDir);
  oldFiles.forEach(file => {
    fs.unlinkSync(path.join(downloadDir, file));
  });
  
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
    
    // Get page content to find button
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('Download Sample PDF')) {
      console.log('Found "Download Sample PDF" text on page');
    }
    
    // Scroll down to find the button
    console.log('Scrolling to find download button...');
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await new Promise(r => setTimeout(r, 1000));
    
    // Get all buttons
    const buttons = await page.$$eval('button, a', elements => 
      elements.map(el => ({
        text: el.textContent.trim(),
        tagName: el.tagName,
        href: el.getAttribute('href') || 'N/A',
        type: el.getAttribute('type') || 'N/A'
      }))
    );
    
    console.log('\nAll buttons and links found:');
    buttons.forEach((btn, i) => {
      const text = btn.text.substring(0, 80);
      console.log(`  [${i}] ${btn.tagName}: "${text}"`);
    });
    
    // Find the download button
    const downloadButtonIndex = buttons.findIndex(btn => 
      btn.text.toLowerCase().includes('download') && btn.text.toLowerCase().includes('sample')
    );
    
    if (downloadButtonIndex !== -1) {
      console.log(`\nFound "Download Sample PDF" button at index ${downloadButtonIndex}`);
      
      // Click it using the index
      await page.evaluate((index) => {
        const elements = Array.from(document.querySelectorAll('button, a'));
        if (elements[index]) {
          elements[index].click();
        }
      }, downloadButtonIndex);
      
      console.log('Clicked the button, waiting for download...');
      await new Promise(r => setTimeout(r, 5000));
      
      // Check if any files were downloaded
      const files = fs.readdirSync(downloadDir);
      console.log(`\nFiles in download directory: ${files.length} file(s)`);
      
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
      console.log('\nERROR: "Download Sample PDF" button not found');
      console.log('Buttons containing "Download":');
      buttons.filter(b => b.text.toLowerCase().includes('download')).forEach(btn => {
        console.log(`  ${btn.tagName}: "${btn.text}"`);
      });
    }
    
    // Check for console errors
    page.on('console', msg => {
      if (msg.type() !== 'log') {
        console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });
    
  } catch (error) {
    console.log(`ERROR: ${error.message}`);
  } finally {
    await browser.close();
  }
}

testDownload();
