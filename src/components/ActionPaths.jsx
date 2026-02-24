import { useState, useEffect } from 'react';

export function ActionPaths({ facility }) {
  const [stateResources, setStateResources] = useState(null);

  useEffect(() => {
    fetch('/state_resources.json')
      .then(res => res.json())
      .then(data => setStateResources(data))
      .catch(err => console.error('Failed to load state resources:', err));
  }, []);

  const resources = stateResources?.[facility.state] || null;

  // Determine which action paths to show based on facility data
  const hasSeriousConcerns = (facility.jeopardy_count > 0 || facility.harm_count > 0);
  const hasStaffingConcerns = (facility.zero_rn_pct > 20 || facility.rn_gap_pct > 30);
  const hasFinancialPenalties = (facility.total_fines > 50000);
  const hasGoodRecord = (facility.composite < 30 && facility.stars >= 4);

  return (
    <div className="action-paths">
      {/* Serious Concerns */}
      {hasSeriousConcerns && (
        <div className="action-path">
          <div className="action-path-header box-red">
            <strong>Serious Concerns Found</strong>
            <p>This facility has citations for serious danger or actual harm to residents. Consider taking action immediately.</p>
          </div>

          {resources ? (
            <>
              <div className="resource-card">
                <h4>File a State Complaint</h4>
                <p><strong>{resources.survey_agency}</strong></p>
                <p>Call: <a href={`tel:${resources.survey_phone}`} className="action-link phone">{resources.survey_phone}</a></p>
                <p><a href={resources.complaint_url} target="_blank" rel="noopener noreferrer" className="action-link">File Online Complaint</a></p>
              </div>

              <div className="resource-card">
                <h4>Contact the Ombudsman</h4>
                <p><strong>{resources.ombudsman_name}</strong></p>
                <p>Call: <a href={`tel:${resources.ombudsman_phone}`} className="action-link phone">{resources.ombudsman_phone}</a></p>
                <p><a href={resources.ombudsman_url} target="_blank" rel="noopener noreferrer" className="action-link">Visit Ombudsman Website</a></p>
                <p className="help-text">Free, confidential advocacy for nursing home residents</p>
              </div>

              <div className="resource-card emergency">
                <h4>If Someone Is in Danger</h4>
                <p><strong>Call 911</strong> if someone is in immediate physical danger</p>
                <p>Or contact Adult Protective Services: <a href={`tel:${resources.aps_phone}`} className="action-link phone">{resources.aps_phone}</a></p>
              </div>
            </>
          ) : (
            <div className="resource-card">
              <h4>National Resources</h4>
              <p>Eldercare Locator: <a href="tel:1-800-677-1116" className="action-link phone">1-800-677-1116</a></p>
              <p className="help-text">Get connected to your state's complaint hotline and ombudsman</p>
            </div>
          )}
        </div>
      )}

      {/* Staffing Concerns */}
      {hasStaffingConcerns && (
        <div className="action-path">
          <div className="action-path-header box-yellow">
            <strong>Staffing Concerns</strong>
            <p>This facility has concerning staffing patterns. Ask detailed questions before placing a loved one here.</p>
          </div>

          <div className="resource-card">
            <h4>Questions to Ask During Your Visit</h4>
            <ul>
              <li>How many registered nurses are on duty right now?</li>
              <li>Can I see actual staffing schedules for nights and weekends?</li>
              <li>What is your nurse-to-patient ratio during overnight shifts?</li>
              <li>How do you ensure coverage when staff call out sick?</li>
            </ul>
          </div>

          <div className="resource-card">
            <h4>Compare Alternatives</h4>
            <p>Use the map view to explore other facilities in this area with better staffing records.</p>
            <p><a href="/" className="action-link">View Map</a></p>
          </div>
        </div>
      )}

      {/* Financial Penalties */}
      {hasFinancialPenalties && (
        <div className="action-path">
          <div className="action-path-header box-yellow">
            <strong>Significant Financial Penalties</strong>
            <p>This facility has been fined ${facility.total_fines.toLocaleString()} by CMS. Ask what corrective actions were taken.</p>
          </div>

          <div className="resource-card">
            <h4>Review Inspection Reports</h4>
            <p><a href={`https://projects.propublica.org/nursing-homes/homes/h-${facility.ccn}`} target="_blank" rel="noopener noreferrer" className="action-link">View ProPublica Report</a></p>
            <p><a href={`https://www.medicare.gov/care-compare/details/nursing-home/${facility.ccn}`} target="_blank" rel="noopener noreferrer" className="action-link">View Medicare Care Compare</a></p>
            <p className="help-text">Read the full inspection reports and enforcement history</p>
          </div>

          <div className="resource-card">
            <h4>Ask the Facility</h4>
            <ul>
              <li>What violations led to these fines?</li>
              <li>What changes have you made since being fined?</li>
              <li>Can you show me documentation of corrective actions?</li>
            </ul>
          </div>
        </div>
      )}

      {/* Good Record */}
      {hasGoodRecord && !hasSeriousConcerns && (
        <div className="action-path">
          <div className="action-path-header box-green">
            <strong>Good Record</strong>
            <p>This facility has no major issues in recent CMS data. Still, visit in person and ask questions.</p>
          </div>

          <div className="resource-card">
            <h4>Still Do Your Homework</h4>
            <ul>
              <li>Visit at different times of day, including evenings and weekends</li>
              <li>Talk to residents and their families</li>
              <li>Observe how staff interact with residents</li>
              <li>Check back periodically — conditions can change</li>
            </ul>
          </div>
        </div>
      )}

      {/* General Resources - Always Show */}
      <div className="action-path">
        <div className="action-path-header">
          <strong>General Resources</strong>
        </div>

        {resources ? (
          <>
            <div className="resource-card">
              <h4>{resources.state_name} Long-Term Care Ombudsman</h4>
              <p>Call: <a href={`tel:${resources.ombudsman_phone}`} className="action-link phone">{resources.ombudsman_phone}</a></p>
              <p className="help-text">Free advocates who help resolve problems for nursing home residents</p>
            </div>

            <div className="resource-card">
              <h4>{resources.state_name} Complaint Hotline</h4>
              <p>Call: <a href={`tel:${resources.survey_phone}`} className="action-link phone">{resources.survey_phone}</a></p>
              <p><a href={resources.complaint_url} target="_blank" rel="noopener noreferrer" className="action-link">File Online Complaint</a></p>
            </div>
          </>
        ) : (
          <div className="resource-card">
            <h4>National Eldercare Locator</h4>
            <p>Call: <a href="tel:1-800-677-1116" className="action-link phone">1-800-677-1116</a></p>
            <p className="help-text">Connect to local resources, ombudsman programs, and complaint hotlines in your state</p>
          </div>
        )}

        <div className="resource-card">
          <h4>Additional Resources</h4>
          <p><a href="https://www.medicare.gov/care-compare/" target="_blank" rel="noopener noreferrer" className="action-link">Medicare Care Compare</a> — Compare nursing homes nationwide</p>
          <p><a href="https://projects.propublica.org/nursing-homes/" target="_blank" rel="noopener noreferrer" className="action-link">ProPublica Nursing Home Inspect</a> — Detailed inspection reports</p>
        </div>
      </div>
    </div>
  );
}
