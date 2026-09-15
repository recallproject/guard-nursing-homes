import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldShowCaliforniaBanner } from './californiaBanner.js';

describe('shouldShowCaliforniaBanner', () => {
  it('hides on facility pages, including non-CA facilities', () => {
    assert.equal(shouldShowCaliforniaBanner('/facility/675408'), false);
    assert.equal(shouldShowCaliforniaBanner('/facility/555021'), false);
  });

  it('hides on national and non-CA surfaces', () => {
    assert.equal(shouldShowCaliforniaBanner('/'), false);
    assert.equal(shouldShowCaliforniaBanner('/post-acute'), false);
    assert.equal(shouldShowCaliforniaBanner('/skilled-nursing'), false);
    assert.equal(shouldShowCaliforniaBanner('/state/TX'), false);
    assert.equal(shouldShowCaliforniaBanner('/watchlist'), false);
    assert.equal(shouldShowCaliforniaBanner('/compare'), false);
    assert.equal(shouldShowCaliforniaBanner('/hospice'), false);
    assert.equal(shouldShowCaliforniaBanner('/hospice/state/CA'), false);
  });

  it('shows on California hub and CA state pages', () => {
    assert.equal(shouldShowCaliforniaBanner('/states/california'), true);
    assert.equal(shouldShowCaliforniaBanner('/states/california/hospice'), true);
    assert.equal(shouldShowCaliforniaBanner('/state/CA'), true);
    assert.equal(shouldShowCaliforniaBanner('/state/ca'), true);
    assert.equal(shouldShowCaliforniaBanner('/california'), true);
  });
});
