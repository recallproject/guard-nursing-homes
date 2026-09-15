import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { CONTACT_EMAIL, CONTACT_MAILTO } from './contact.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readSrc(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

describe('public contact + trust surfaces', () => {
  it('keeps a single public mailto address', () => {
    assert.equal(CONTACT_EMAIL, 'contact@oversightreports.com');
    assert.equal(CONTACT_MAILTO, 'mailto:contact@oversightreports.com');
  });

  it('frames /about as a trust page, not a biography', () => {
    const about = readSrc('pages/AboutPage.jsx');
    assert.match(about, /About \/ Why trust us/);
    assert.match(about, /Who built this/);
    assert.match(about, /Why trust the analysis/);
    assert.match(about, /Where the data comes from/);
    assert.match(about, /Independence and funding/);
    assert.match(about, /What this is not/);
    assert.match(about, /CONTACT_MAILTO/);
    assert.doesNotMatch(about, /About the Builder/);
    assert.doesNotMatch(about, /I've spent 20\+ years in acute care/);
  });

  it('puts About and Contact in the shared footer', () => {
    const footer = readSrc('components/landing/Footer.jsx');
    assert.match(footer, /to="\/about"/);
    assert.match(footer, /CONTACT_MAILTO/);
    assert.match(footer, /About \/ Why trust us/);
  });

  it('adds a Downloads support mailto without changing report CTAs', () => {
    const downloads = readSrc('components/FacilityDownloads.jsx');
    assert.match(downloads, /Questions about a report\?/);
    assert.match(downloads, /CONTACT_MAILTO/);
    assert.match(downloads, /Download Family Report \(Free\)/);
    assert.match(downloads, /Buy Facility Brief \(\$29\)/);
  });

  it('mounts the shared footer once in App', () => {
    const app = readSrc('App.jsx');
    assert.match(app, /import Footer from '\.\/components\/landing\/Footer'/);
    assert.equal(app.split('<Footer').length - 1, 1);
  });
});
