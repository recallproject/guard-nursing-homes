import { Helmet } from 'react-helmet-async';
import { HubSearch } from '../components/HubSearch';
import { focusHubWhere } from '../utils/focusHubWhere';
import { StickyFamilyActions } from '../components/StickyFamilyActions';
import { getCareSetting } from '../data/careSettings';
import { useEffect, useState } from 'react';
import '../styles/family-ia.css';

export default function PostAcuteHomePage() {
  const [showSticky, setShowSticky] = useState(false);
  const snf = getCareSetting('snf');

  useEffect(() => {
    function onScroll() {
      setShowSticky(window.scrollY > 280);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <Helmet>
        <title>Look up any facility | The Oversight Report</title>
        <meta
          name="description"
          content="Look up skilled nursing, hospice, home health, inpatient rehab, and long-term acute care. Independent CMS public data. Free to search. Not a referral broker."
        />
        <link rel="canonical" href="https://www.oversightreports.com/" />
      </Helmet>

      <div className="ia-page ia-hub">
        <section className="ia-hub-hero" aria-labelledby="ia-hub-heading">
          <p className="ia-eyebrow">Independent · CMS public data · Free to look up</p>
          <h1 id="ia-hub-heading">Look up any facility. Get the facts.</h1>
          <p className="ia-hub-sub">
            Nursing homes, hospice, home health, rehab, and long-term acute care — one search, same playbook.
          </p>
          <HubSearch initialSettingId="snf" />
        </section>

        <section className="ia-hub-below" aria-label="What you get">
          <div className="ia-mini">
            <h2>Free full pages</h2>
            <p>Inspections, staffing, fines, ownership — sourced from CMS, with as-of dates.</p>
          </div>
          <div className="ia-mini">
            <h2>$29 Facility Brief</h2>
            <p>Printable family PDF when you want something to take on a visit.</p>
          </div>
          <div className="ia-mini">
            <h2>Not a referral broker</h2>
            <p>No advisor forms or paid “best match.” Independent facts only.</p>
          </div>
        </section>

        <StickyFamilyActions
          visible={showSticky}
          primaryLabel="Search"
          secondaryLabel="Browse by state"
          onPrimary={focusHubWhere}
          secondaryTo={`${snf.route}#browse-states`}
        />
      </div>
    </>
  );
}
