import { formerNamesLabel, SFF_STATUS_EXPLAIN, sffDetailRows, sffStatusOf } from '../../utils/sffStatus';

export function SffStatusPanel({ facility }) {
  const status = sffStatusOf(facility);
  if (status === 'none') return null;
  const rows = sffDetailRows(facility);
  const explain = SFF_STATUS_EXPLAIN[status];

  return (
    <section className={`sff-banner sff-banner--${status}`} aria-label="Special Focus Facility status">
      <span className="sff-dot" aria-hidden="true" />
      <div className="sff-content">
        <span className="sff-label">CMS Special Focus Facility program</span>
        <dl className="sff-facts">
          {rows.map((row) => (
            <div className="sff-fact" key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        {explain ? <p className="sff-explain">{explain}</p> : null}
      </div>
    </section>
  );
}

export function FormerFacilityName({ facility }) {
  const label = formerNamesLabel(facility);
  if (!label) return null;
  return <p className="fp-former">{label}</p>;
}
