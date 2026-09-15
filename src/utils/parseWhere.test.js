import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseWhere, buildSettingSearchPath } from './parseWhere.js';
import { getCareSetting } from '../data/careSettings.js';

describe('parseWhere', () => {
  it('parses ZIP, state name, abbr, and City, ST', () => {
    assert.deepEqual(parseWhere('75684').zip, '75684');
    assert.equal(parseWhere('TX').state, 'TX');
    assert.equal(parseWhere('Texas').state, 'TX');
    assert.equal(parseWhere('Overton, TX').state, 'TX');
    assert.equal(parseWhere('Overton, TX').city, 'Overton');
    assert.equal(parseWhere('Overton TX').state, 'TX');
  });
});

describe('buildSettingSearchPath', () => {
  it('sends SNF state searches to /state/XX', () => {
    const snf = getCareSetting('snf');
    assert.equal(buildSettingSearchPath(snf, { where: 'Texas' }), '/state/TX');
    assert.equal(
      buildSettingSearchPath(snf, { where: 'Overton, TX', name: 'Avir at Overton' }),
      '/state/TX?q=Avir%20at%20Overton'
    );
  });

  it('sends other settings to their state routes', () => {
    assert.equal(
      buildSettingSearchPath('hospice', { where: 'CA' }),
      '/hospice/state/CA'
    );
    assert.equal(
      buildSettingSearchPath('irf', { where: 'Ohio' }),
      '/irf/state/OH'
    );
    assert.equal(
      buildSettingSearchPath('ltach', { where: 'FL' }),
      '/ltach/state/FL'
    );
  });
});
