import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function testDownloadFull() {
  const downloadDir = '/tmp/downloads_full_test';
  
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
  
  const consoleMessages = [];
  const pageErrors = [];
  
  try {
    const page = await browser.newPage();
    
    // Capture all console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });
    
    // Capture page errors
    page.on('error', err => {
      pageErrors.push(err.message);
    });
    
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });
    
    // Set up download behavior
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadDir,
    });
    
    console.log('Loading http://localhost:5174...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded successfully');
    
    // Wait a bit for any async operations
    await new Promise(r => setTimeout(r, 2000));
    
    // Log page title
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Scroll down to find the button
    console.log('\nScrolling to sample report section...');
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await new Promise(r => setTimeout(r, 1000));
    
    // Find and click the download button
    console.log('Clicking "Download Sample PDF" button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const downloadBtn = buttons.find(btn => 
        btn.textContent.toLowerCase().includes('download') && 
        btn.textContent.toLowerCase().includes('sample')
      );
      if (downloadBtn) {
        downloadBtn.click();
      }
    });
    
    console.log('Waiting for download to complete...');
    await new Promise(r => setTimeout(r, 5000));
    
    // Check results
    const files = fs.readdirSync(downloadDir);
    console.log(`\n=== DOWNLOAD TEST RESULT ===`);
    console.log(`Files downloaded: ${files.length}`);
    
    if (files.length > 0) {
      files.forEach(file => {
        const filePath = path.join(downloadDir, file);
        const stats = fs.statSync(filePath);
        console.log(`FILE: ${file}`);
        console.log(`SIZE: ${stats.size} bytes (${(stats.size / 1024).toFixed(2)} KB)`);
        console.log(`CREATED: ${stats.birthtime}`);
      });
      console.log(`\nRESULT: SUCCESS`);
    } else {
      console.log(`RESULT: FAILED - No files downloaded`);
    }
    
    // Report console messages
    console.log(`\n=== CONSOLE OUTPUT ===`);
    if (consoleMessages.length === 0) {
      console.log('(No console messages)');
    } else {
      consoleMessages.forEach(msg => {
        console.log(`[${msg.type.toUpperCase()}] ${msg.text}`);
      });
    }
    
    // Report errors
    if (pageErrors.length > 0) {
      console.log(`\n=== PAGE ERRORS ===`);
      pageErrors.forEach(err => {
        console.log(`ERROR: ${err}`);
      });
    } else {
      console.log(`\n=== PAGE ERRORS ===`);
      console.log('(None)');
    }
    
  } catch (error) {
    console.log(`CRITICAL ERROR: ${error.message}`);
  } finally {
    await browser.close();
  }
}

testDownloadFull();
