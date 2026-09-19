import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertPaidCompareBriefSession,
  isCompareBriefSession,
  resolveCompareCcns,
} from './resolveCompareBrief.js';

describe('resolveCompareCcns', () => {
  it('prefers metadata.ccns over a mismatched client list', () => {
    const result = resolveCompareCcns(
      {
        client_reference_id: '111111,222222',
        metadata: { product: 'compare_brief', ccns: '675408,055559' },
      },
      '345179,055559'
    );
    assert.deepEqual(result, { ccns: ['675408', '055559'] });
  });

  it('uses client_reference_id when metadata is empty', () => {
    const result = resolveCompareCcns(
      { client_reference_id: '675408,345179', metadata: {} },
      ''
    );
    assert.deepEqual(result, { ccns: ['675408', '345179'] });
  });

  it('falls back to client CCNs for a paid session without Stripe CCNs', () => {
    const result = resolveCompareCcns(
      { client_reference_id: null, metadata: {} },
      '675408,055559,345179'
    );
    assert.deepEqual(result, { ccns: ['675408', '055559', '345179'] });
  });

  it('errors when no 2-3 CCN set exists', () => {
    const result = resolveCompareCcns(
      { client_reference_id: '675408', metadata: {} },
      '111111'
    );
    assert.equal(result.status, 400);
    assert.match(result.error, /No compare-set/);
  });
});

describe('assertPaidCompareBriefSession', () => {
  it('accepts a paid one-time session', () => {
    assert.deepEqual(
      assertPaidCompareBriefSession({ payment_status: 'paid', mode: 'payment' }),
      { ok: true }
    );
  });

  it('rejects unpaid or subscription sessions', () => {
    assert.equal(
      assertPaidCompareBriefSession({ payment_status: 'unpaid', mode: 'payment' }).status,
      402
    );
    assert.equal(
      assertPaidCompareBriefSession({ payment_status: 'paid', mode: 'subscription' }).status,
      400
    );
  });

  it('detects compare sessions from metadata.product', () => {
    assert.equal(
      isCompareBriefSession({ metadata: { product: 'compare_brief', ccns: '675408,055559' } }),
      true
    );
    assert.equal(isCompareBriefSession({ metadata: { ccn: '675408' } }), false);
  });
});
