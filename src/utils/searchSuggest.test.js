import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseWhere } from './parseWhere.js';
import { suggestFacilities, suggestLocations } from './searchSuggest.js';

const index = {
  facilities: [
    { ccn: '675408', name: 'Avir at Overton', city: 'OVERTON', state: 'TX', zip: '75684', aliases: 'Overton Care Center' },
    { ccn: '675101', name: 'Avir at Giddings', city: 'Giddings', state: 'TX', zip: '78942' },
    { ccn: '015009', name: 'Los Angeles Care', city: 'LOS ANGELES', state: 'CA', zip: '90001' },
    { ccn: '455001', name: 'Fort Worth One', city: 'FORT WORTH', state: 'TX', zip: '76102' },
    { ccn: '455002', name: 'Fort Worth Two', city: 'Fort Worth', state: 'TX', zip: '76102' },
    { ccn: '265001', name: 'Saint Louis Home', city: 'St. Louis', state: 'MO', zip: '63101' },
  ],
  postacute: [
    { ccn: 'H1001', name: 'AGAVE HOSPICE AND PALLIATIVE CARE', city: 'DALLAS', state: 'TX', zip: '75201', setting: 'hospice' },
    { ccn: 'HH100', name: 'VNA of Austin', city: 'AUSTIN', state: 'TX', zip: '78701', setting: 'home-health' },
  ],
};

describe('suggestLocations', () => {
  it('suggests a title-cased city and keeps City, ST parseable', () => {
    const hits = suggestLocations(index, 'over');
    const overton = hits.find((hit) => hit.kind === 'city' && hit.label === 'Overton, TX');
    assert.ok(overton);
    assert.equal(overton.value, 'Overton, TX');
    assert.equal(overton.meta, 'City');
    assert.equal(parseWhere(overton.value).state, 'TX');
    assert.equal(parseWhere(overton.value).city, 'Overton');
  });

  it('suggests ZIP prefixes and exact ZIPs from facility records', () => {
    const prefix = suggestLocations(index, '756');
    assert.equal(prefix[0].kind, 'zip');
    assert.equal(prefix[0].value, '75684');
    assert.equal(prefix[0].meta, 'Overton, TX');

    const exact = suggestLocations(index, '75684');
    assert.equal(exact.length, 1);
    assert.equal(exact[0].value, '75684');
  });

  it('suggests states by abbreviation and name', () => {
    const byCode = suggestLocations(index, 'TX');
    assert.equal(byCode[0].kind, 'state');
    assert.equal(byCode[0].label, 'Texas');
    assert.equal(parseWhere(byCode[0].value).state, 'TX');

    const byName = suggestLocations(index, 'tex');
    assert.ok(byName.some((hit) => hit.kind === 'state' && hit.label === 'Texas'));
  });

  it('narrows cities when a state hint is typed', () => {
    const hits = suggestLocations(index, 'Overton, T');
    assert.ok(hits.some((hit) => hit.value === 'Overton, TX'));
    assert.equal(hits.some((hit) => hit.label.includes('CA')), false);
  });

  it('dedupes mixed-case city names and ignores punctuation', () => {
    const fort = suggestLocations(index, 'fort');
    const cities = fort.filter((hit) => hit.kind === 'city');
    assert.equal(cities.length, 1);
    assert.equal(cities[0].label, 'Fort Worth, TX');

    const louis = suggestLocations(index, 'st louis');
    assert.ok(louis.some((hit) => hit.value === 'St. Louis, MO'));
  });

  it('uses the active care type for ZIP suggestions', () => {
    const hospice = suggestLocations(index, '752', { settingId: 'hospice' });
    assert.ok(hospice.some((hit) => hit.value === '75201'));
    assert.equal(hospice.some((hit) => hit.value === '75684'), false);

    const snf = suggestLocations(index, '752', { settingId: 'snf' });
    assert.equal(snf.some((hit) => hit.value === '75201'), false);
  });

  it('returns nothing for a short or empty query', () => {
    assert.deepEqual(suggestLocations(index, 'o'), []);
    assert.deepEqual(suggestLocations(null, 'overton'), []);
  });
});

describe('suggestFacilities', () => {
  it('matches facility names and former names on the skilled nursing tab', () => {
    const hits = suggestFacilities(index, 'avir', { settingId: 'snf' });
    assert.deepEqual(
      hits.map((hit) => hit.label),
      ['Avir at Giddings', 'Avir at Overton']
    );
    assert.equal(hits.every((hit) => hit.kind === 'facility'), true);

    const former = suggestFacilities(index, 'overton care', { settingId: 'snf' });
    assert.equal(former[0].ccn, '675408');
  });

  it('ranks a facility in the typed city first', () => {
    const hits = suggestFacilities(index, 'avir', {
      settingId: 'snf',
      where: 'Overton, TX',
    });
    assert.equal(hits[0].label, 'Avir at Overton');
    assert.equal(hits[0].meta, 'Overton, TX');
  });

  it('keeps suggestions inside the selected care type', () => {
    const hospice = suggestFacilities(index, 'agave', { settingId: 'hospice' });
    assert.equal(hospice.length, 1);
    assert.equal(hospice[0].label, 'Agave Hospice And Palliative Care');
    assert.equal(hospice[0].meta, 'Dallas, TX');

    assert.equal(suggestFacilities(index, 'avir', { settingId: 'hospice' }).length, 0);
    assert.equal(suggestFacilities(index, 'agave', { settingId: 'snf' }).length, 0);

    const home = suggestFacilities(index, 'vna', { settingId: 'home-health' });
    assert.equal(home[0].label, 'VNA of Austin');
  });
});
