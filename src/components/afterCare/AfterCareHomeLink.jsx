import { Link } from 'react-router-dom';
import { AFTER_CARE_DISCLOSURE } from '../../data/afterCare';
import '../../styles/after-care.css';

export function AfterCareHomeLink() {
  return (
    <section className="ac-home" aria-labelledby="ac-home-heading">
      <div>
        <p className="ac-eyebrow">After care</p>
        <h2 id="ac-home-heading" className="ac-home-title">Heading home?</h2>
        <p className="ac-home-copy">
          A short list for bathing, toileting, walking, and transfers after a facility stay.
          Separate from facility scores.
        </p>
        <p className="ac-home-disclosure">{AFTER_CARE_DISCLOSURE}</p>
      </div>
      <Link className="ac-home-cta" to="/after-care">
        See home setup options
      </Link>
    </section>
  );
}
