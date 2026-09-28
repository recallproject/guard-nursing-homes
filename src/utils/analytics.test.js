import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { productsForNeed, AFTER_CARE_NEEDS } from '../data/afterCare.js';
import {
  REDIRECT_CAPTURE,
  affiliateClickProperties,
  checkoutStartedProperties,
  onAffiliateLinkClick,
  purchaseDedupeKey,
  track,
  trackBeforeRedirect,
  trackPurchaseCompleted,
} from './analytics.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function readSrc(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
  };
}

describe('checkout_started properties', () => {
  it('includes product, price, page, placement, and ccn when present', () => {
    assert.deepEqual(checkoutStartedProperties({
      product: 'facility_brief',
      price: 29,
      ccn: '055559',
      placement: 'cta-rail',
      pagePath: '/facility/055559',
    }), {
      product: 'facility_brief',
      price: 29,
      page_path: '/facility/055559',
      placement: 'cta-rail',
      facility_id: '055559',
      ccn: '055559',
    });
  });

  it('omits facility id and non-numeric prices', () => {
    assert.deepEqual(checkoutStartedProperties({
      product: 'clinician_report',
      price: undefined,
      placement: 'ask-a-clinician',
      pagePath: '/ask-a-clinician',
    }), {
      product: 'clinician_report',
      page_path: '/ask-a-clinician',
      placement: 'ask-a-clinician',
    });
  });
});

describe('trackBeforeRedirect', () => {
  const previousWindow = globalThis.window;

  afterEach(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });

  it('sends with sendBeacon immediately when PostHog is loaded', async () => {
    const calls = [];
    globalThis.window = {
      posthog: {
        __loaded: true,
        capture(event, properties, options) {
          calls.push({ event, properties, options });
        },
      },
    };
    let scheduled = 0;
    await trackBeforeRedirect('checkout_started', { product: 'facility_brief' }, {
      timeoutMs: 400,
      schedule() { scheduled += 1; },
    });
    assert.equal(scheduled, 0);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].event, 'checkout_started');
    assert.deepEqual(calls[0].options, REDIRECT_CAPTURE);
  });

  it('waits for the capture promise but not past the timeout', async () => {
    let resolveCapture;
    const calls = [];
    globalThis.window = {
      posthog: {
        __loaded: true,
        capture(event) {
          calls.push(event);
          return new Promise((resolve) => { resolveCapture = resolve; });
        },
      },
    };
    const queue = [];
    let time = 0;
    const pending = trackBeforeRedirect('checkout_started', {}, {
      timeoutMs: 100,
      now: () => time,
      schedule(fn, ms) {
        const id = queue.length + 1;
        queue.push({ id, fn, at: time + ms });
        return id;
      },
      cancel(id) {
        const index = queue.findIndex((item) => item.id === id);
        if (index >= 0) queue.splice(index, 1);
      },
    });
    assert.equal(calls.length, 1);
    resolveCapture();
    await pending;
    assert.equal(queue.length, 0);
  });

  it('does not block past the timeout when PostHog is still a stub', async () => {
    const calls = [];
    globalThis.window = {
      posthog: {
        __loaded: false,
        capture(event) { calls.push(event); },
      },
    };
    const queue = [];
    let time = 0;
    const pending = trackBeforeRedirect('checkout_started', { product: 'facility_brief' }, {
      timeoutMs: 50,
      now: () => time,
      schedule(fn, ms) {
        queue.push({ fn, at: time + ms });
      },
      cancel() {},
    });
    let guard = 0;
    while (queue.length && guard < 20) {
      guard += 1;
      const next = queue.shift();
      time = next.at;
      next.fn();
    }
    await pending;
    assert.equal(calls.length, 1);
    assert.ok(time >= 50);
  });

  it('track() no-ops when posthog is missing', () => {
    globalThis.window = {};
    assert.equal(track('checkout_started', {}), undefined);
  });
});

describe('purchase_completed dedupe', () => {
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;

  beforeEach(() => {
    globalThis.localStorage = memoryStorage();
    globalThis.window = {
      posthog: {
        __loaded: true,
        capture() {},
      },
    };
  });

  afterEach(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  });

  it('fires once per session_id and records has_session_id', () => {
    const calls = [];
    globalThis.window.posthog.capture = (event, properties) => {
      calls.push({ event, properties });
    };
    assert.equal(trackPurchaseCompleted({ product: 'facility_brief', sessionId: 'cs_123' }), true);
    assert.equal(trackPurchaseCompleted({ product: 'facility_brief', sessionId: 'cs_123' }), false);
    assert.equal(trackPurchaseCompleted({ product: 'facility_brief', sessionId: 'cs_456' }), true);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0].properties, {
      product: 'facility_brief',
      session_id: 'cs_123',
      has_session_id: true,
    });
    assert.equal(globalThis.localStorage.getItem(purchaseDedupeKey('facility_brief', 'cs_123')), '1');
  });

  it('keeps session-less hits so scanners stay visible', () => {
    const calls = [];
    globalThis.window.posthog.capture = (event, properties) => {
      calls.push(properties);
    };
    assert.equal(trackPurchaseCompleted({ product: 'facility_brief', sessionId: '' }), true);
    assert.equal(trackPurchaseCompleted({ product: 'facility_brief', sessionId: '' }), true);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].has_session_id, false);
    assert.equal(calls[0].session_id, '');
  });
});

describe('affiliate_click', () => {
  it('recognizes Vive aff=745, Target, and CareX, and ignores Medicare', () => {
    assert.deepEqual(
      affiliateClickProperties('https://www.vivehealth.com/products/shower-chair?aff=745', {
        productName: 'Vive Shower Chair',
        pagePath: '/after-care',
      }),
      {
        partner: 'vive',
        product_name: 'Vive Shower Chair',
        destination_url: 'https://www.vivehealth.com/products/shower-chair?aff=745',
        page_path: '/after-care',
      },
    );
    assert.equal(affiliateClickProperties('https://www.vivehealth.com/products/shower-chair'), null);
    assert.equal(affiliateClickProperties('https://www.vivehealth.com/products/shower-chair?aff=1'), null);
    assert.equal(
      affiliateClickProperties('https://www.target.com/p/rollator/-/A-1', { pagePath: '/after-care' }).partner,
      'target',
    );
    assert.equal(
      affiliateClickProperties('https://goto.target.com/product', { pagePath: '/after-care' }).partner,
      'target',
    );
    assert.equal(
      affiliateClickProperties('https://www.carex.com/shower-chair', {
        productName: 'Carex Shower Chair',
        pagePath: '/after-care',
      }).partner,
      'carex',
    );
    assert.equal(
      affiliateClickProperties('https://www.medicare.gov/coverage/walkers', { pagePath: '/after-care' }),
      null,
    );
  });

  it('classifies every live Vive pick and no Medicare coverage link', () => {
    const picks = AFTER_CARE_NEEDS.flatMap((need) => productsForNeed(need.id));
    const vive = picks.filter((pick) => pick.kind === 'vive');
    assert.ok(vive.length > 0);
    for (const pick of vive) {
      const props = affiliateClickProperties(pick.affiliateUrl, {
        productName: pick.title,
        pagePath: '/after-care',
      });
      assert.equal(props.partner, 'vive');
      assert.equal(props.product_name, pick.title);
    }
    for (const pick of picks.filter((item) => item.kind === 'coverage')) {
      assert.equal(affiliateClickProperties(pick.coverageUrl, { productName: pick.title }), null);
    }
  });

  it('fires from an anchor click and ignores other links', () => {
    const calls = [];
    const trackFn = (event, properties, options) => calls.push({ event, properties, options });
    const anchor = (href, productName) => ({
      href,
      getAttribute(name) { return name === 'data-product-name' ? productName : null; },
    });
    onAffiliateLinkClick({
      button: 0,
      target: { closest: () => anchor('https://www.vivehealth.com/products/shower-chair?aff=745', 'Vive Shower Chair') },
    }, { pagePath: '/facility/675408', trackFn });
    onAffiliateLinkClick({
      button: 0,
      target: { closest: () => anchor('https://www.medicare.gov/coverage/walkers', 'Walkers') },
    }, { pagePath: '/after-care', trackFn });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].event, 'affiliate_click');
    assert.equal(calls[0].properties.partner, 'vive');
    assert.equal(calls[0].properties.page_path, '/facility/675408');
    assert.deepEqual(calls[0].options, REDIRECT_CAPTURE);
  });
});

describe('commerce wiring on main', () => {
  it('flushes checkout_started inside every Stripe redirect helper', () => {
    const stripe = readSrc('src/utils/stripe.js');
    assert.equal(stripe.includes("posthog.init"), false);
    for (const product of ["product: 'facility_brief'", "product: 'clinician_report'", 'product: priceKey']) {
      const at = stripe.indexOf(product);
      assert.ok(at > 0, product);
      const href = stripe.indexOf('window.location.href', at);
      assert.ok(href > at, product);
    }
  });

  it('passes placement from each live Facility Brief trigger', () => {
    const downloads = readSrc('src/components/FacilityDownloads.jsx');
    const compare = readSrc('src/components/WatchlistCompareView.jsx');
    const evidence = readSrc('src/pages/EvidencePage.jsx');
    assert.match(downloads, /checkoutSingleReport\(ccn, \{ placement \}\)/);
    assert.match(compare, /placement: 'watchlist-compare'/);
    assert.match(evidence, /placement: 'evidence-page'/);
    assert.match(readSrc('src/pages/PricingPage.jsx'), /placement: 'pricing'/);
  });

  it('records purchase_completed on the Stripe success routes that exist', () => {
    assert.match(readSrc('src/pages/EvidenceSuccessPage.jsx'), /product: 'facility_brief'/);
    assert.match(readSrc('src/pages/SuccessPage.jsx'), /trackPurchaseCompleted/);
    assert.equal(readSrc('src/App.jsx').includes('compare-brief-success'), false);
  });

  it('reuses the index.html snippet and listens for affiliate clicks', () => {
    const html = readSrc('index.html');
    assert.equal((html.match(/posthog\.init\(/g) || []).length, 1);
    const main = readSrc('src/main.jsx');
    assert.match(main, /installAffiliateClickTracking\(\)/);
    assert.equal(main.includes('posthog.init'), false);
    assert.match(readSrc('src/components/afterCare/AfterCareProductCard.jsx'), /data-product-name=\{pick\.title\}/);
    assert.match(readSrc('src/components/careAtHome/CareAtHomeDialog.jsx'), /form: 'claim'/);
    assert.match(readSrc('src/pages/CareAtHomePage.jsx'), /form: 'request'/);
  });
});
