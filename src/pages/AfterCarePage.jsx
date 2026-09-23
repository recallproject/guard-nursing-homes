import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { AfterCareDisclosure } from '../components/afterCare/AfterCareDisclosure';
import { AfterCarePicker } from '../components/afterCare/AfterCarePicker';
import { track } from '../utils/analytics';
import '../styles/after-care.css';

export function AfterCarePage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    track('after_care_view', { surface: 'page' });
  }, []);

  return (
    <div className="ac-page">
      <Helmet>
        <title>After Care — Home Setup for Families | The Oversight Report</title>
        <meta
          name="description"
          content="Home setup ideas for families leaving a facility: bathing, toileting, walking, and transfers. Medicare notes included. Affiliate links never affect facility scores."
        />
        <meta property="og:title" content="After Care — Home Setup for Families" />
        <meta
          property="og:description"
          content="Pick what your loved one needs help with. A few home-setup options, Medicare coverage notes, and disclosed affiliate links."
        />
        <meta property="og:url" content="https://www.oversightreports.com/after-care" />
        <link rel="canonical" href="https://www.oversightreports.com/after-care" />
      </Helmet>

      <p className="ac-eyebrow">After care</p>
      <h1 id="after-care-question" className="ac-question">What does your loved one need help with?</h1>
      <p className="ac-lead">
        Choose the task that’s hardest right now. You’ll see a few options for heading home, not a catalog.
        These are general setup ideas, not a clinical assessment.
      </p>
      <ul className="ac-steps">
        <li>Pick one kind of help</li>
        <li>Open a recommended option if you want to buy it yourself</li>
        <li>Check Medicare for that type of equipment</li>
      </ul>
      <AfterCareDisclosure />
      <AfterCarePicker surface="page" labelId="after-care-question" syncUrl />
    </div>
  );
}
