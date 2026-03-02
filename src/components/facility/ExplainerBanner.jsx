import '../../styles/explainer-banner.css';

/**
 * ExplainerBanner — auto-triggered contextual banners on facility pages
 * 
 * Props:
 *  - variant: 'danger' | 'warning' | 'info'
 *  - icon: emoji or SVG
 *  - title: string
 *  - children: React node (body text)
 *  - linkText: string (optional)
 *  - linkHref: string (optional)
 *  - onLinkClick: function (optional)
 */
export default function ExplainerBanner({ variant = 'info', icon, title, children, linkText, linkHref, onLinkClick }) {
  return (
    <div className={`eb-banner eb-${variant}`}>
      <span className="eb-icon">{icon}</span>
      <div className="eb-text">
        <h4 className="eb-title">{title}</h4>
        <p className="eb-body">{children}</p>
        {linkText && (
          linkHref
            ? <a className="eb-link" href={linkHref}>{linkText} →</a>
            : <button className="eb-link" onClick={onLinkClick}>{linkText} →</button>
        )}
      </div>
    </div>
  );
}
