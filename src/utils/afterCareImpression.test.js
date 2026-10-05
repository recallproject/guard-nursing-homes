import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, afterEach } from 'node:test';
import {
  AFTER_CARE_VIEW_EVENT,
  FACILITY_AFTER_CARE_SURFACE,
  FACILITY_AFTER_CARE_VISIBLE_THRESHOLD,
  bindFacilityAfterCareImpression,
  entryShowsModule,
  facilityAfterCareImpressionKey,
  resetFacilityAfterCareImpressions,
  trackFacilityAfterCareView,
} from './afterCareImpression.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function readSrc(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
  };
}

function visibleEntry(target, ratio = FACILITY_AFTER_CARE_VISIBLE_THRESHOLD) {
  return { target, isIntersecting: true, intersectionRatio: ratio };
}

class FakeIntersectionObserver {
  static instances = [];

  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.disconnected = false;
    this.observed = [];
    FakeIntersectionObserver.instances.push(this);
  }

  observe(element) {
    this.observed.push(element);
  }

  disconnect() {
    this.disconnected = true;
  }

  emit(entries) {
    this.callback(entries);
  }
}

describe('facility after_care_view visibility', () => {
  const previousWindow = globalThis.window;
  const previousObserver = globalThis.IntersectionObserver;

  afterEach(() => {
    resetFacilityAfterCareImpressions();
    FakeIntersectionObserver.instances = [];
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousObserver === undefined) delete globalThis.IntersectionObserver;
    else globalThis.IntersectionObserver = previousObserver;
  });

  it('treats an off-screen or barely visible module as not shown', () => {
    const element = { id: 'module' };
    assert.equal(entryShowsModule({ target: element, isIntersecting: false, intersectionRatio: 0 }, element), false);
    assert.equal(entryShowsModule({
      target: element,
      isIntersecting: true,
      intersectionRatio: FACILITY_AFTER_CARE_VISIBLE_THRESHOLD - 0.01,
    }, element), false);
    assert.equal(entryShowsModule(visibleEntry(element), element), true);
    assert.equal(entryShowsModule(visibleEntry({ id: 'other' }), element), false);
  });

  it('does not fire on bind, and fires once when the module becomes visible', () => {
    const element = { id: 'module' };
    const calls = [];
    const storage = memoryStorage();
    const stop = bindFacilityAfterCareImpression(element, {
      pagePath: '/facility/056435',
      storage,
      memory: new Set(),
      trackFn: (event, properties) => calls.push({ event, properties }),
      IntersectionObserverImpl: FakeIntersectionObserver,
    });

    assert.equal(calls.length, 0);
    const observer = FakeIntersectionObserver.instances[0];
    assert.equal(observer.options.threshold, FACILITY_AFTER_CARE_VISIBLE_THRESHOLD);
    assert.deepEqual(observer.observed, [element]);

    observer.emit([{ target: element, isIntersecting: false, intersectionRatio: 0 }]);
    observer.emit([{
      target: element,
      isIntersecting: true,
      intersectionRatio: 0.1,
    }]);
    assert.equal(calls.length, 0);
    assert.equal(observer.disconnected, false);

    observer.emit([visibleEntry(element, 0.4)]);
    assert.deepEqual(calls, [{
      event: AFTER_CARE_VIEW_EVENT,
      properties: { surface: FACILITY_AFTER_CARE_SURFACE },
    }]);
    assert.equal(observer.disconnected, true);

    observer.emit([visibleEntry(element, 1)]);
    stop();
    assert.equal(calls.length, 1);
    assert.equal(storage.getItem(facilityAfterCareImpressionKey('/facility/056435')), '1');
  });

  it('dedupes a Strict Mode remount and a second visible callback in the same session', () => {
    const element = { id: 'module' };
    const calls = [];
    const storage = memoryStorage();
    const memory = new Set();
    const options = {
      pagePath: '/facility/056435',
      storage,
      memory,
      trackFn: (event, properties) => calls.push({ event, properties }),
      IntersectionObserverImpl: FakeIntersectionObserver,
    };

    const stopFirst = bindFacilityAfterCareImpression(element, options);
    FakeIntersectionObserver.instances[0].emit([visibleEntry(element, 1)]);
    stopFirst();

    const stopSecond = bindFacilityAfterCareImpression(element, options);
    FakeIntersectionObserver.instances[1].emit([visibleEntry(element, 1)]);
    stopSecond();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].properties.surface, 'facility');
  });

  it('counts a different facility path as a new impression', () => {
    const calls = [];
    const storage = memoryStorage();
    const memory = new Set();
    const trackFn = (event, properties) => calls.push({ event, properties, path: calls.length });

    assert.equal(trackFacilityAfterCareView({
      pagePath: '/facility/056435',
      storage,
      memory,
      trackFn,
    }), true);
    assert.equal(trackFacilityAfterCareView({
      pagePath: '/facility/056435',
      storage,
      memory: new Set(),
      trackFn,
    }), false);
    assert.equal(trackFacilityAfterCareView({
      pagePath: '/facility/675408',
      storage,
      memory,
      trackFn,
    }), true);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].event, 'after_care_view');
    assert.deepEqual(calls[0].properties, { surface: 'facility' });
    assert.deepEqual(calls[1].properties, { surface: 'facility' });
  });

  it('uses the same track() gate when PostHog capture is missing', () => {
    globalThis.window = {};
    const storage = memoryStorage();
    const key = facilityAfterCareImpressionKey('/facility/056435');
    assert.equal(trackFacilityAfterCareView({
      pagePath: '/facility/056435',
      storage,
      memory: new Set(),
    }), false);
    assert.equal(storage.getItem(key), null);

    const calls = [];
    globalThis.window = {
      posthog: {
        capture(event, properties) { calls.push({ event, properties }); },
      },
    };
    assert.equal(trackFacilityAfterCareView({
      pagePath: '/facility/056435',
      storage,
      memory: new Set(),
    }), true);
    assert.deepEqual(calls, [{
      event: 'after_care_view',
      properties: { surface: 'facility' },
    }]);
    assert.equal(trackFacilityAfterCareView({
      pagePath: '/facility/056435',
      storage,
      memory: new Set(),
    }), false);
    assert.equal(calls.length, 1);
  });

  it('does not track when the element or IntersectionObserver is missing', () => {
    const calls = [];
    delete globalThis.IntersectionObserver;
    const stopMissing = bindFacilityAfterCareImpression(null, {
      pagePath: '/facility/056435',
      trackFn: () => calls.push('tracked'),
    });
    const stopNoObserver = bindFacilityAfterCareImpression({ id: 'module' }, {
      pagePath: '/facility/056435',
      trackFn: () => calls.push('tracked'),
    });
    stopMissing();
    stopNoObserver();
    assert.deepEqual(calls, []);
  });

  it('keeps /after-care page tracking on mount and wires the facility module through visibility', () => {
    const page = readSrc('src/pages/AfterCarePage.jsx');
    const block = readSrc('src/components/afterCare/AfterCareFacilityBlock.jsx');
    const facility = readSrc('src/pages/FacilityPage.jsx');

    assert.match(page, /track\('after_care_view', \{ surface: 'page' \}\)/);
    assert.doesNotMatch(page, /bindFacilityAfterCareImpression|surface: 'facility'/);
    assert.match(block, /bindFacilityAfterCareImpression\(rootRef\.current, \{ pagePath: pathname \}\)/);
    assert.match(block, /ref=\{rootRef\}/);
    assert.doesNotMatch(block, /track\('after_care_view'/);
    assert.match(facility, /<AfterCareFacilityBlock \/>/);
    assert.equal(facility.includes('surface: \'facility\''), false);
  });
});
