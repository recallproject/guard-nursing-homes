import { useState, useEffect } from 'react';

export function ActionPaths({ facility }) {
  const [stateResources, setStateResources] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}state_resources.json`)
      .then(res => res.json())
      .then(data => setStateResources(data))
      .catch(err => console.error('Failed to load state resources:', err));
  }, []);

  const resources = stateResources?.[facility.state] || null;

  if (stateResources && !resources) {
    // State not in our JSON — show generic resources
    return (
      <div className="resources-grid">
        <div className="resource-card">
          <div className="resource-card-title">File a State Complaint</div>
          <div className="resource-card-desc">
            Contact your state's Department of Health survey and certification division to report concerns.
          </div>
          <a href="https://www.medicare.gov/care-compare/resources/nursing-home/file-a-complaint" target="_blank" rel="noopener noreferrer" className="resource-link">
            How to File a Complaint →
          </a>
        </div>
        <div className="resource-card">
          <div className="resource-card-title">Contact the Ombudsman</div>
          <div className="resource-card-desc">
            Free, confidential advocacy for nursing home residents. Available in every state.
          </div>
          <a href="https://eldercare.acl.gov/Public/About/Aging_Network/LTCO.aspx" target="_blank" rel="noopener noreferrer" className="resource-link">
            Find Your Ombudsman →
          </a>
        </div>
        <div className="resource-card" style={{ borderColor: 'rgba(248,81,73,0.3)' }}>
          <div className="resource-card-title">If Someone Is in Danger</div>
          <div className="resource-card-desc">
            Call 911 for immediate physical danger.<br />
            Eldercare Locator: 1-800-677-1116
          </div>
        </div>
        <div className="resource-card">
          <div className="resource-card-title">Compare Alternatives</div>
          <div className="resource-card-desc">
            Explore other facilities nearby with better safety records.
          </div>
          <a href="#nearby-facilities" className="resource-link">
            View Map →
          </a>
        </div>
      </div>
    );
  }

  if (!resources) {
    return (
      <p style={{ fontSize: '0.9rem', color: '#64748B' }}>
        Loading state-specific resources...
      </p>
    );
  }

  return (
    <div className="resources-grid">
      {/* 1. File a State Complaint */}
      <div className="resource-card">
        <div className="resource-card-title">File a State Complaint</div>
        <div className="resource-card-desc">
          {resources.survey_agency}<br />
          {resources.survey_phone}
        </div>
        <a href={resources.complaint_url} target="_blank" rel="noopener noreferrer" className="resource-link">
          File Online Complaint →
        </a>
      </div>

      {/* 2. Contact the Ombudsman */}
      <div className="resource-card">
        <div className="resource-card-title">Contact the Ombudsman</div>
        <div className="resource-card-desc">
          Free, confidential advocacy for residents<br />
          {resources.ombudsman_phone}
        </div>
        <a href={resources.ombudsman_url} target="_blank" rel="noopener noreferrer" className="resource-link">
          Visit Ombudsman Website →
        </a>
      </div>

      {/* 3. If Someone Is in Danger */}
      <div className="resource-card" style={{ borderColor: 'rgba(248,81,73,0.3)' }}>
        <div className="resource-card-title">If Someone Is in Danger</div>
        <div className="resource-card-desc">
          Call 911 for immediate physical danger<br />
          Adult Protective Services: {resources.aps_phone}
        </div>
      </div>

      {/* 4. Compare Alternatives */}
      <div className="resource-card">
        <div className="resource-card-title">Compare Alternatives</div>
        <div className="resource-card-desc">
          Explore other facilities nearby with better safety records.
        </div>
        <a href="#nearby-facilities" className="resource-link">
          View Map →
        </a>
      </div>
    </div>
  );
}
