import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldShowCaliforniaBanner } from './californiaBanner.js';

describe('shouldShowCaliforniaBanner', () => {
  it('is disabled on every surface, including former CA promo pages', () => {
    assert.equal(shouldShowCaliforniaBanner('/facility/675408'), false);
    assert.equal(shouldShowCaliforniaBanner('/facility/555021'), false);
    assert.equal(shouldShowCaliforniaBanner('/'), false);
    assert.equal(shouldShowCaliforniaBanner('/post-acute'), false);
    assert.equal(shouldShowCaliforniaBanner('/skilled-nursing'), false);
    assert.equal(shouldShowCaliforniaBanner('/state/TX'), false);
    assert.equal(shouldShowCaliforniaBanner('/state/CA'), false);
    assert.equal(shouldShowCaliforniaBanner('/state/ca'), false);
    assert.equal(shouldShowCaliforniaBanner('/states/california'), false);
    assert.equal(shouldShowCaliforniaBanner('/states/california/hospice'), false);
    assert.equal(shouldShowCaliforniaBanner('/california'), false);
    assert.equal(shouldShowCaliforniaBanner('/watchlist'), false);
    assert.equal(shouldShowCaliforniaBanner('/compare'), false);
    assert.equal(shouldShowCaliforniaBanner('/hospice'), false);
    assert.equal(shouldShowCaliforniaBanner('/hospice/state/CA'), false);
  });
});
