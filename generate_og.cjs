const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Canvas dimensions for OG image
const WIDTH = 1200;
const HEIGHT = 630;

// Create canvas
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// Colors matching the site
const colors = {
  navyDark: '#0F172A',
  navyLight: '#1E293B',
  coralRed: '#FF6B6B',
  lavender: '#A5B4FC',
  white: '#FFFFFF',
  slateLight: '#CBD5E1',
  slateMuted: '#94A3B8',
  slateDim: '#64748B',
  indigoGlow: 'rgba(79, 70, 229, 0.08)'
};

// Draw background gradient (navy with subtle indigo glow)
const bgGradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
bgGradient.addColorStop(0, colors.navyDark);
bgGradient.addColorStop(1, colors.navyLight);
ctx.fillStyle = bgGradient;
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Add subtle radial glow in center
const glowGradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 0, WIDTH / 2, HEIGHT / 2, WIDTH * 0.6);
glowGradient.addColorStop(0, colors.indigoGlow);
glowGradient.addColorStop(1, 'rgba(79, 70, 229, 0)');
ctx.fillStyle = glowGradient;
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Helper function to draw centered text
function drawCenteredText(text, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, WIDTH / 2, y);
}

// Helper function to get text width
function getTextWidth(text, font) {
  ctx.font = font;
  return ctx.measureText(text).width;
}

// 1. "T H E" - spaced out uppercase
let currentY = 120;
ctx.font = '18px sans-serif';
ctx.fillStyle = colors.slateMuted;
ctx.textAlign = 'center';
ctx.letterSpacing = '0.4em';
ctx.fillText('T H E', WIDTH / 2, currentY);
ctx.letterSpacing = '0px'; // Reset

// 2. "OVERSIGHT REPORT" - Large serif title
currentY += 65;
ctx.font = 'bold 72px Georgia, serif';
ctx.fillStyle = colors.white;
ctx.textAlign = 'center';
ctx.fillText('OVERSIGHT REPORT', WIDTH / 2, currentY);

// 3. Coral accent line
currentY += 50;
const lineWidth = 80;
ctx.strokeStyle = colors.coralRed;
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(WIDTH / 2 - lineWidth / 2, currentY);
ctx.lineTo(WIDTH / 2 + lineWidth / 2, currentY);
ctx.stroke();

// 4. "Nursing Home Safety Data" subtitle
currentY += 40;
ctx.font = 'italic 22px Georgia, serif';
ctx.fillStyle = colors.slateLight;
ctx.textAlign = 'center';
ctx.fillText('Nursing Home Safety Data', WIDTH / 2, currentY);

// 5. Three stats in a row
currentY += 90;

const statSpacing = 300; // Horizontal spacing between stats
const leftStatX = WIDTH / 2 - statSpacing;
const centerStatX = WIDTH / 2;
const rightStatX = WIDTH / 2 + statSpacing;

// Helper to draw a stat
function drawStat(x, y, value, valueColor, label) {
  // Draw value (large mono font)
  ctx.font = 'bold 36px "Courier New", monospace';
  ctx.fillStyle = valueColor;
  ctx.textAlign = 'center';
  ctx.fillText(value, x, y);
  
  // Draw label below
  ctx.font = '13px sans-serif';
  ctx.fillStyle = colors.slateMuted;
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 30);
}

// Left stat: 14,713 Facilities Exposed
drawStat(leftStatX, currentY, '14,713', colors.lavender, 'Facilities Exposed');

// Center stat: 1 in 3 Had Zero RNs on Duty
drawStat(centerStatX, currentY, '1 in 3', colors.coralRed, 'Had Zero RNs on Duty');

// Right stat: $492M In Federal Fines
drawStat(rightStatX, currentY, '$492M', colors.lavender, 'In Federal Fines');

// 6. "oversightreports.com" at bottom
currentY = HEIGHT - 40;
ctx.font = '14px sans-serif';
ctx.fillStyle = colors.slateDim;
ctx.textAlign = 'center';
ctx.fillText('oversightreports.com', WIDTH / 2, currentY);

// Save the image
const outputPath = path.join(__dirname, 'public', 'og-image.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);

console.log(`✓ OG image generated successfully at: ${outputPath}`);
console.log(`✓ File size: ${(buffer.length / 1024).toFixed(2)} KB`);
