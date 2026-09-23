import { Link } from 'react-router-dom';
import '../../styles/after-care.css';

export function CareAtHomeHomeLink() {
  return (
    <section className="ac-home" aria-labelledby="cah-home-heading">
      <div>
        <p className="ac-eyebrow">Care at home</p>
        <h2 id="cah-home-heading" className="ac-home-title">Need hands-on help?</h2>
        <p className="ac-home-copy">
          Compare local agencies in Orange County and San Diego before you call.
        </p>
      </div>
      <Link className="ac-home-cta" to="/care-at-home">
        See Care at home
      </Link>
    </section>
  );
}
