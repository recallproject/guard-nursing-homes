import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CARE_SETTINGS, familyLabel, getCareSetting } from './careSettings.js';

describe('care setting family labels', () => {
  it('uses plain-language primary labels, never bare IRF or LTACH', () => {
    const labels = CARE_SETTINGS.map((s) => s.familyLabel);
    assert.equal(familyLabel('snf'), 'Skilled nursing');
    assert.equal(familyLabel('hospice'), 'Hospice');
    assert.equal(familyLabel('home-health'), 'Home health');
    assert.equal(familyLabel('irf'), 'Inpatient rehab');
    assert.equal(familyLabel('ltach'), 'Long-term acute care');
    assert.ok(!labels.includes('IRF'));
    assert.ok(!labels.includes('LTACH'));
    assert.ok(!labels.includes('SNF'));
    for (const s of CARE_SETTINGS) {
      assert.notEqual(s.familyLabel.trim().toUpperCase(), 'IRF');
      assert.notEqual(s.familyLabel.trim().toUpperCase(), 'LTACH');
    }
  });

  it('keeps CMS nerd subtitles optional on rehab and long-term acute care only', () => {
    assert.equal(getCareSetting('irf').nerdLabel, 'IRF');
    assert.equal(getCareSetting('ltach').nerdLabel, 'LTACH');
    assert.equal(getCareSetting('snf').nerdLabel, null);
    assert.equal(getCareSetting('hospice').nerdLabel, null);
  });

  it('keeps stable family routes', () => {
    assert.equal(getCareSetting('snf').route, '/skilled-nursing');
    assert.equal(getCareSetting('irf').route, '/irf');
    assert.equal(getCareSetting('ltach').route, '/ltach');
    assert.equal(getCareSetting('snf').statePath('tx'), '/state/TX');
  });
});
