import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertPaidFacilityBriefSession, resolveFacilityCcn } from './resolveFacilityCcn.js';

describe('resolveFacilityCcn', () => {
  it('prefers client_reference_id over localStorage/URL CCN', () => {
    const result = resolveFacilityCcn(
      { client_reference_id: '675408', metadata: {} },
      '111111'
    );
    assert.deepEqual(result, { ccn: '675408' });
  });

  it('uses metadata.ccn when client_reference_id is missing', () => {
    const result = resolveFacilityCcn(
      { client_reference_id: null, metadata: { ccn: '055559' } },
      ''
    );
    assert.deepEqual(result, { ccn: '055559' });
  });

  it('falls back to client CCN for legacy sessions without Stripe CCN', () => {
    const result = resolveFacilityCcn(
      { client_reference_id: null, metadata: {} },
      '345179'
    );
    assert.deepEqual(result, { ccn: '345179' });
  });

  it('errors when session_id is paid but no CCN exists anywhere', () => {
    const result = resolveFacilityCcn(
      { client_reference_id: null, metadata: {} },
      ''
    );
    assert.equal(result.ccn, undefined);
    assert.equal(result.status, 400);
    assert.match(result.error, /No facility ID/);
  });

  it('rejects an invalid client-supplied CCN on a legacy session', () => {
    const result = resolveFacilityCcn(
      { client_reference_id: null, metadata: {} },
      'abc'
    );
    assert.deepEqual(result, { error: 'Invalid facility CCN', status: 400 });
  });

  it('ignores invalid client_reference_id and uses a valid fallback', () => {
    const result = resolveFacilityCcn(
      { client_reference_id: 'not-a-ccn', metadata: { ccn: 'bad' } },
      '675408'
    );
    assert.deepEqual(result, { ccn: '675408' });
  });
});

describe('assertPaidFacilityBriefSession', () => {
  it('rejects unpaid sessions', () => {
    const result = assertPaidFacilityBriefSession({
      payment_status: 'unpaid',
      mode: 'payment',
    });
    assert.equal(result.status, 402);
  });

  it('rejects subscription checkouts used as a single-report bypass', () => {
    const result = assertPaidFacilityBriefSession({
      payment_status: 'paid',
      mode: 'subscription',
    });
    assert.equal(result.status, 400);
    assert.match(result.error, /Invalid checkout type/);
  });

  it('accepts a paid one-time session', () => {
    const result = assertPaidFacilityBriefSession({
      payment_status: 'paid',
      mode: 'payment',
    });
    assert.deepEqual(result, { ok: true });
  });
});
