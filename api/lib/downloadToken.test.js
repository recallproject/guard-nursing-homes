import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateCompareBriefToken,
  generateFacilityBriefToken,
  readSignedToken,
} from './downloadToken.js';

const SECRET = 'test-evidence-secret';

describe('downloadToken', () => {
  it('round-trips a Facility Brief CCN token', () => {
    const { token } = generateFacilityBriefToken('675408', SECRET);
    const read = readSignedToken(token, SECRET);
    assert.equal(read.valid, true);
    assert.equal(read.product, 'facility_brief');
    assert.equal(read.ccn, '675408');
  });

  it('round-trips a Compare Brief multi-CCN token', () => {
    const { token } = generateCompareBriefToken(['675408', '055559', '345179'], SECRET);
    const read = readSignedToken(token, SECRET);
    assert.equal(read.valid, true);
    assert.equal(read.product, 'compare_brief');
    assert.deepEqual(read.ccns, ['675408', '055559', '345179']);
  });

  it('rejects a tampered token', () => {
    const { token } = generateCompareBriefToken(['675408', '055559'], SECRET);
    const [payload] = token.split('.');
    const bad = `${payload}.deadbeef`;
    const read = readSignedToken(bad, SECRET);
    assert.equal(read.valid, false);
    assert.equal(read.status, 403);
  });
});
