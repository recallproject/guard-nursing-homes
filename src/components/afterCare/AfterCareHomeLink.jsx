import { Link } from 'react-router-dom';
import { AFTER_CARE_DISCLOSURE } from '../../data/afterCare';
import '../../styles/after-care.css';

const HOME_THUMBS = [
  '/after-care/shower-chair.jpg',
  '/after-care/lightweight-rollator.jpg',
  '/after-care/gel-cushion.jpg',
];

export function AfterCareHomeLink() {
  return (
    <section className="ac-home" aria-labelledby="ac-home-heading">
      <div>
        <p className="ac-eyebrow">After care</p>
        <div className="ac-home-thumbs" aria-hidden="true">
          {HOME_THUMBS.map((src) => (
            <img key={src} src={src} alt="" width="52" height="52" />
          ))}
        </div>
        <h2 id="ac-home-heading" className="ac-home-title">Heading home?</h2>
        <p className="ac-home-copy">
          A short edit for bathing, walking, transfers, and sitting after a facility stay.
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
