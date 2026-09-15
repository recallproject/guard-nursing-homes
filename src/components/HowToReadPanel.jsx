import { Link } from 'react-router-dom';

export function HowToReadPanel({ items = [], extraLinks = [] }) {
  return (
    <aside className="ia-howto">
      <h2 className="ia-howto-title">How to read this</h2>
      <ul className="ia-howto-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {extraLinks.length > 0 && (
        <p className="ia-howto-links">
          {extraLinks.map((link, i) => (
            <span key={link.to}>
              {i > 0 ? ' · ' : ''}
              <Link to={link.to}>{link.label}</Link>
            </span>
          ))}
        </p>
      )}
    </aside>
  );
}
