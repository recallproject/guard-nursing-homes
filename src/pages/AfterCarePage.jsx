import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AfterCareDisclosure } from '../components/afterCare/AfterCareDisclosure';
import { AfterCarePicker } from '../components/afterCare/AfterCarePicker';
import { track } from '../utils/analytics';
import '../styles/after-care.css';

const HERO_IMAGE = '/after-care/tub-transfer-bench.jpg';

export function AfterCarePage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    track('after_care_view', { surface: 'page' });
  }, []);

  return (
    <div className="ac-page">
      <Helmet>
        <title>After Care — The Edit | The Oversight Report</title>
        <meta
          name="description"
          content="We searched the options so you don’t have to. A short edit for bathing, walking, transfers, and sitting, with prices and Medicare notes. Affiliate links never affect facility scores."
        />
        <meta property="og:title" content="After Care — The Edit" />
        <meta
          property="og:description"
          content="Tell us what your loved one needs help with. A few practical products, visible prices, and whether Medicare may cover that type of equipment."
        />
        <meta property="og:url" content="https://www.oversightreports.com/after-care" />
        <link rel="canonical" href="https://www.oversightreports.com/after-care" />
      </Helmet>

      <section className="ac-hero">
        <div className="ac-wrap ac-hero-grid">
          <div>
            <p className="ac-kicker">After Care / The Edit</p>
            <h1 id="after-care-question">We searched the options so you don’t have to.</h1>
            <p className="ac-hero-copy">
              Tell us what your loved one needs help with. We’ll narrow the field to a few practical products, show what they cost, and explain whether Medicare may cover that type of equipment.
            </p>
            <p className="ac-hero-fine">
              Curated for families heading home after rehab, hospitalization, or a change in care needs.
            </p>
          </div>
          <div className="ac-hero-visual">
            <div className="ac-hero-frame">
              <img
                src={HERO_IMAGE}
                alt="Vive tub transfer bench with a backrest, shown as the featured bathing option"
                width="700"
                height="700"
              />
            </div>
            <div className="ac-hero-stamp">
              <small>Featured need</small>
              <strong>Safer bathing at home</strong>
            </div>
          </div>
        </div>
      </section>

      <AfterCarePicker surface="page" labelId="after-care-shop-heading" syncUrl variant="edit" />

      <section className="ac-caregiver" aria-labelledby="ac-caregiver-heading">
        <div className="ac-wrap ac-caregiver-grid">
          <div>
            <p className="ac-kicker ac-kicker--on-navy">Sometimes equipment isn’t enough</p>
            <h2 id="ac-caregiver-heading">Need hands-on help at home too?</h2>
            <p>
              If bathing, dressing, meals, toileting, or transfers are difficult, equipment may only solve part of the problem. We can help estimate what part-time home support may cost.
            </p>
            <Link className="ac-care-cta" to="/care-at-home">
              Compare local agencies →
            </Link>
            <p className="ac-care-note">Orange County and San Diego pilot. Published rates are not a quote.</p>
          </div>
          <div className="ac-cost-card">
            <small>Illustrative part-time private-pay support</small>
            <p className="ac-cost">$2,000–$3,200</p>
            <p className="ac-cost-note">per month for several hours of help on multiple days each week. Local rates vary.</p>
          </div>
        </div>
      </section>

      <section className="ac-trust" aria-label="How After Care stays separate from facility scores">
        <div className="ac-wrap ac-trust-grid">
          <div className="ac-trust-item">
            <strong>We narrow the field.</strong>
            <p>After Care is a curated guide, not a medical-supply marketplace with hundreds of nearly identical listings.</p>
          </div>
          <div className="ac-trust-item">
            <strong>We show the money part.</strong>
            <p>Retail pricing is visible before you click out, and Medicare guidance is kept separate from retail purchasing.</p>
          </div>
          <div className="ac-trust-item">
            <strong>Our facility data stays independent.</strong>
            <p>Commercial relationships never affect facility scores, safety data, rankings, or comparisons.</p>
          </div>
        </div>
      </section>

      <div className="ac-wrap">
        <AfterCareDisclosure variant="page" />
      </div>
    </div>
  );
}
