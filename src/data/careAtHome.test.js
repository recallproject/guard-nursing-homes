import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CARE_AT_HOME_AGENCIES,
  COMPARISON_ROWS,
  budgetFineprint,
  comparisonRows,
  createRequestDraft,
  defaultRequestCounty,
  filterAgencies,
  formatDollars,
  getBudgetScenario,
  pilotStats,
  splitRecipients,
  toggleCompare,
  weeklyBudget,
} from './careAtHome.js';
import {
  buildClaimMailto,
  buildRequestMailto,
  formspreeEndpoint,
  submitCareAtHomeRequest,
} from '../utils/careAtHomeRequest.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

const genki = CARE_AT_HOME_AGENCIES.find((agency) => agency.id === 'genki');
const coast = CARE_AT_HOME_AGENCIES.find((agency) => agency.id === 'coast');

describe('care at home seed', () => {
  it('keeps 20 unique public profiles, 10 in each county, with only two enriched', () => {
    assert.equal(CARE_AT_HOME_AGENCIES.length, 20);
    assert.equal(new Set(CARE_AT_HOME_AGENCIES.map((agency) => agency.id)).size, 20);
    assert.equal(pilotStats().oc, 10);
    assert.equal(pilotStats().sd, 10);
    assert.equal(pilotStats().enriched, 2);
    assert.equal(pilotStats().verifiedFields, 0);
    assert.deepEqual(
      CARE_AT_HOME_AGENCIES.filter((agency) => agency.enriched).map((agency) => agency.id),
      ['genki', 'coast'],
    );
    for (const agency of CARE_AT_HOME_AGENCIES) {
      assert.equal(agency.status, 'public');
      assert.equal(Object.keys(agency.fields).length, 11);
      for (const [key, field] of Object.entries(agency.fields)) {
        assert.ok(field.status === 'public' || field.status === 'missing');
        assert.notEqual(field.status, 'verified');
        if (field.status === 'public') assert.ok(field.sources.length > 0);
        if (!agency.enriched && key !== 'registry') assert.equal(field.status, 'missing');
      }
    }
  });

  it('keeps Genki and Coast price conditions exact', () => {
    assert.equal(genki.rateLow, 33);
    assert.equal(genki.rateHigh, 37);
    assert.match(genki.fields.rate.value, /\$33\/hr daytime 4\+ hours/);
    assert.match(genki.fields.rate.value, /\$37\/hr shorter visits or nights/);
    assert.match(genki.fields.rate.note, /January 1, 2026/);
    assert.match(genki.fields.minimum.value, /2-hour minimum/);
    assert.match(genki.fields.minimum.note, /four-hour visit per week/);
    assert.match(genki.fields.cancellation.value, /24-hour notice/);
    assert.match(genki.fields.surcharges.value, /1\.5×/);
    assert.match(genki.fields.surcharges.note, /\$0\.73\/mile/);
    assert.match(genki.fields.languages.value, /English and Japanese/);
    assert.match(genki.fields.registry.value, /HCO 374700255/);

    assert.equal(coast.rateLow, 39);
    assert.equal(coast.rateHigh, 39);
    assert.match(coast.fields.rate.value, /\$39\/hour published/);
    assert.match(coast.fields.minimum.value, /4 hours per visit/);
    assert.match(coast.fields.backup.value, /Standby caregivers/);
    assert.match(coast.fields.backup.note, /No timed replacement/);
    assert.match(coast.fields.continuity.value, /within 7 shifts/);
    assert.equal(coast.fields.languages.status, 'missing');
    assert.equal(coast.fields.cancellation.status, 'missing');
    assert.equal(coast.fields.surcharges.status, 'missing');
    assert.equal(coast.fields.response.status, 'missing');
  });

  it('filters, caps comparison at three, and prices the daytime scenario from the seed', () => {
    assert.equal(filterAgencies(CARE_AT_HOME_AGENCIES, { county: 'oc' }).length, 10);
    assert.equal(filterAgencies(CARE_AT_HOME_AGENCIES, { pricingOnly: true }).length, 2);
    const fullerton = filterAgencies(CARE_AT_HOME_AGENCIES, { query: 'fullerton' });
    assert.equal(fullerton.length, 2);
    assert.ok(fullerton.some((agency) => /Magnificare/.test(agency.name)));
    const withHome = filterAgencies(CARE_AT_HOME_AGENCIES, { query: 'with home' });
    assert.equal(withHome.length, 1);
    assert.match(withHome[0].name, /With Home Care/);

    const third = CARE_AT_HOME_AGENCIES[2].id;
    const fourth = CARE_AT_HOME_AGENCIES[3].id;
    const withThird = toggleCompare(['genki', 'coast'], third);
    assert.equal(withThird.rejected, false);
    assert.equal(withThird.selected.length, 3);
    const rejected = toggleCompare(withThird.selected, fourth);
    assert.equal(rejected.rejected, true);
    assert.equal(rejected.selected.length, 3);

    const active = ['genki', 'coast'].map((id) => CARE_AT_HOME_AGENCIES.find((agency) => agency.id === id));
    assert.equal(comparisonRows(active, false).length, COMPARISON_ROWS.length);
    assert.ok(comparisonRows(active, true).length < COMPARISON_ROWS.length);

    const scenario = getBudgetScenario();
    assert.equal(scenario.low, 33);
    assert.equal(scenario.high, 39);
    const twenty = weeklyBudget(20, scenario);
    assert.equal(formatDollars(twenty.low), '660');
    assert.equal(formatDollars(twenty.high), '780');
    const thirtyOne = weeklyBudget(31, scenario);
    assert.equal(formatDollars(thirtyOne.low), '1,023');
    assert.equal(formatDollars(thirtyOne.high), '1,209');
    assert.match(budgetFineprint(scenario), /at least 4 hours/);
    assert.match(budgetFineprint(scenario), /\$33\/hour/);
    assert.match(budgetFineprint(scenario), /\$39\/hour/);
    assert.match(budgetFineprint(scenario), /Not a quote or a county average/);
  });

  it('defaults an explicit agency request to that agency county and does not drop outside-county agencies without a choice', () => {
    assert.equal(defaultRequestCounty({ explicitId: 'coast', browseCounty: 'oc' }), 'sd');
    assert.equal(defaultRequestCounty({ selectedIds: ['genki', 'coast'], browseCounty: 'all' }), 'sd');
    const draft = createRequestDraft({ explicitId: 'coast', browseCounty: 'oc' });
    assert.equal(draft.county, 'San Diego');
    assert.deepEqual(draft.agencies, ['coast']);

    const mixed = {
      county: 'Orange County',
      agencies: ['genki', 'coast'],
      includeOutside: false,
    };
    const blocked = splitRecipients(CARE_AT_HOME_AGENCIES, mixed);
    assert.equal(blocked.recipients.length, 0);
    assert.equal(blocked.outside.length, 2);
    const included = splitRecipients(CARE_AT_HOME_AGENCIES, { ...mixed, includeOutside: true });
    assert.equal(included.recipients.length, 2);
  });
});

describe('care at home delivery', () => {
  const draft = {
    county: 'San Diego',
    zip: '92111',
    support: 'Dementia support',
    hours: '10–20 hours',
    timing: 'Within 2 weeks',
    budget: '$35–$45',
    email: 'person@example.com',
    agencies: ['genki'],
    includeOutside: false,
  };

  it('does not treat a missing or failed form inbox as a received request', async () => {
    assert.equal(formspreeEndpoint({}), '');
    assert.equal(formspreeEndpoint({ VITE_FORMSPREE_ID: 'abc_123' }), '');
    assert.equal(formspreeEndpoint({ VITE_FORMSPREE_ID: 'abc123' }), 'https://formspree.io/f/abc123');

    const unconfigured = await submitCareAtHomeRequest(draft, CARE_AT_HOME_AGENCIES, { endpoint: '' });
    assert.equal(unconfigured.ok, false);
    assert.equal(unconfigured.mode, 'unconfigured');

    const failed = await submitCareAtHomeRequest(draft, CARE_AT_HOME_AGENCIES, {
      endpoint: 'https://formspree.io/f/abc123',
      fetchImpl: async () => ({ ok: false, json: async () => ({ error: 'nope' }) }),
    });
    assert.equal(failed.ok, false);
    assert.match(failed.message, /Nothing was sent/);

    const emptyBody = await submitCareAtHomeRequest(draft, CARE_AT_HOME_AGENCIES, {
      endpoint: 'https://formspree.io/f/abc123',
      fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
    });
    assert.equal(emptyBody.ok, false);

    let posted = null;
    const accepted = await submitCareAtHomeRequest(draft, CARE_AT_HOME_AGENCIES, {
      endpoint: 'https://formspree.io/f/abc123',
      fetchImpl: async (_url, options) => {
        posted = JSON.parse(options.body);
        return { ok: true, json: async () => ({ ok: true }) };
      },
    });
    assert.equal(accepted.ok, true);
    assert.equal(posted.agencies, 'Genki HomeCare');
    assert.match(posted.delivery_note, /Not forwarded to agencies/);
    assert.equal(posted.email, 'person@example.com');
  });

  it('builds a real team email without claiming the request was already received', () => {
    const href = buildRequestMailto(draft, CARE_AT_HOME_AGENCIES);
    assert.match(href, /^mailto:contact@oversightreports\.com\?/);
    const body = decodeURIComponent(href.split('body=')[1]);
    assert.match(body, /Genki HomeCare/);
    assert.match(body, /92111/);
    assert.match(body, /before contacting any agency/);
    assert.doesNotMatch(body, /request was sent/i);

    const claim = buildClaimMailto(genki, 'Agency: Genki HomeCare');
    assert.match(claim, /subject=Care%20at%20home%20profile%20reply/);
    assert.match(decodeURIComponent(claim), /Agency: Genki HomeCare/);
    assert.match(claim, /contact@oversightreports\.com/);
  });

  it('links the section from After Care and the footer without publishing outreach files', () => {
    const page = read('src/pages/CareAtHomePage.jsx');
    const dialog = read('src/components/careAtHome/CareAtHomeDialog.jsx');
    const app = read('src/App.jsx');
    const footer = read('src/components/landing/Footer.jsx');
    const afterCare = read('src/pages/AfterCarePage.jsx');
    const css = read('src/styles/care-at-home.css');
    assert.match(page, /Know what it\s*<br \/>should cost\./);
    assert.match(page, /Compare local agencies before you call\./);
    assert.match(dialog, /has not received this request until you send that email/);
    assert.match(dialog, /has not been delivered to an agency/);
    assert.doesNotMatch(page + dialog, /Preview confirmation|PREVIEW COMPLETE|localStorage/);
    assert.match(app, /path="\/care-at-home"/);
    assert.match(footer, /to="\/care-at-home"/);
    assert.match(afterCare, /to="\/care-at-home"/);
    assert.match(css, /^\.cah\{/);
    assert.doesNotMatch(css, /(^|})body\{/);
    assert.match(read('scripts/generate-sitemap.js'), /\/care-at-home/);
    assert.doesNotMatch(read('src/data/careAtHomeAgencies.json'), /"status": "verified"/);
  });
});
