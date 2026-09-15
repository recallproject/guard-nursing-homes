import { PRODUCT_LABEL } from '../utils/facilityBriefContent';
import '../styles/facility-brief.css';

function Chip({ label, value, tone }) {
  return (
    <span className={`fb-chip fb-chip--${tone || 'neutral'}`}>
      <span className="fb-chip-k">{label}</span>
      <span className="fb-chip-v">{value}</span>
    </span>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className={`fb-metric fb-tone-${tone || 'neutral'}`}>
      <div className="fb-metric-v">{value ?? 'n/a'}</div>
      <div className="fb-metric-k">{label}</div>
    </div>
  );
}

function Card({ title, children, tone = 'neutral' }) {
  return (
    <section className={`fb-card fb-card--${tone}`}>
      {title ? <h3 className="fb-card-title">{title}</h3> : null}
      {children}
    </section>
  );
}

function Bullets({ items }) {
  if (!items?.length) return <p className="fb-muted">None listed in this extract.</p>;
  return (
    <ul className="fb-bullets">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function FacilityBriefDocument({
  model,
  showActions = false,
  onDownload,
  onPrint,
  pdfLoading = false,
}) {
  if (!model) return null;

  const ownItems = (model.ownership || []).map((b) => (b.label ? `${b.label}: ${b.value}` : b.value));

  return (
    <article className="fb">
      <header className="fb-top">
        <div className="fb-brand-row">
          <div className="fb-brand">The <em>Oversight</em> Report</div>
          <div className="fb-product">{PRODUCT_LABEL}</div>
        </div>
        <h1 className="fb-facility">{model.name}</h1>
        <p className="fb-meta">
          {model.locationLine || model.metaLine}
          <br />
          <strong>CMS CCN</strong> {model.ccn || 'n/a'}
          {' · '}
          Generated {model.reportDateLabel}
          {model.dataAsOfLabel ? ` · CMS data as of ${model.dataAsOfLabel}` : ''}
        </p>
        {showActions ? (
          <div className="fb-actions no-print">
            <button type="button" className="fb-btn fb-btn-primary" onClick={onDownload} disabled={pdfLoading}>
              {pdfLoading ? 'Generating PDF...' : 'Download PDF'}
            </button>
            <button type="button" className="fb-btn fb-btn-ghost" onClick={onPrint}>
              Print
            </button>
            <span className="fb-no-dropdown">Family Brief · no attorney toggle</span>
          </div>
        ) : null}
      </header>

      <section className="fb-page" aria-labelledby="fb-exec">
        <h2 id="fb-exec">1. Executive summary</h2>
        <div className="fb-chip-row">
          {model.chips.map((chip) => (
            <Chip key={chip.label} {...chip} />
          ))}
        </div>
        <Card title="Bottom line" tone="navy">
          <p className="fb-lead">{model.bottomLine}</p>
        </Card>
        <div className="fb-two">
          <Card title="Comparatively less alarming" tone="soft">
            <Bullets items={model.strengths} />
          </Card>
          <Card title="Questions & concerns" tone="urgent">
            <Bullets items={model.concerns} />
          </Card>
        </div>
        <Card title="What to do next" tone="ok">
          <p>{model.nextAction}</p>
        </Card>
        <p className="fb-inside"><strong>Inside this brief: </strong>{model.inside}</p>
      </section>

      <section className="fb-page" aria-labelledby="fb-score">
        <h2 id="fb-score">2. Scorecard · How to read these ratings</h2>
        <p className="fb-muted">
          CMS data as of {model.dataAsOfLabel} · Report prepared {model.reportDateLabel}. Oversight composite uses public CMS inputs (higher = more concern in this model).
        </p>
        <div className="fb-metrics">
          <Metric {...model.stars.overall} label={model.stars.overall.label} value={model.stars.overall.value} tone={model.stars.overall.tone} />
          <Metric {...model.stars.inspection} label={model.stars.inspection.label} value={model.stars.inspection.value} tone={model.stars.inspection.tone} />
          <Metric {...model.stars.staffing} label={model.stars.staffing.label} value={model.stars.staffing.value} tone={model.stars.staffing.tone} />
          <Metric {...model.stars.quality} label={model.stars.quality.label} value={model.stars.quality.value} tone={model.stars.quality.tone} />
        </div>
        <div className="fb-chip-row">
          <Chip label="Oversight composite" value={model.composite ? `${model.composite} · ${model.compositeLabel}` : 'n/a'} tone="warn" />
          <Chip label="Deficiencies on record" value={`${model.deficiencyCount} health`} />
          <Chip label="Complaint investigations" value={String(model.complaintInvestigations || 0)} />
        </div>
        <Card title="What each signal means (plain English)">
          <Bullets items={model.interpretations.map((i) => `${i.title}: ${i.text}`)} />
        </Card>
        <div className="fb-two">
          <Card title="Look closer" tone="warn">
            <Bullets items={model.lookCloser} />
          </Card>
          <Card title="What this does not tell you">
            <Bullets items={model.doesNotTell} />
          </Card>
        </div>
        <p className="fb-note">Stars are signals, not guarantees. CMS updates Care Compare on a schedule; always confirm the last updated date on medicare.gov when you verify.</p>
      </section>

      <section className="fb-page" aria-labelledby="fb-staff">
        <h2 id="fb-staff">3. Staffing &amp; ownership</h2>
        <p>{model.staffingIntro}</p>
        <div className="fb-metrics">
          {model.staffingMetrics.map((m) => (
            <Metric key={m.l} label={m.l} value={m.v} tone={m.tone} />
          ))}
        </div>
        <div className="fb-three">
          {model.staffingHighlights.map((h) => (
            <Card key={h.title} title={h.title} tone={h.tone}>
              <p className="fb-highlight-v">{h.value}</p>
              <p className="fb-muted">{h.note}</p>
            </Card>
          ))}
        </div>
        <div className="fb-two">
          <Card title="More staffing context">
            <Bullets items={model.staffingContext.length ? model.staffingContext : ['No extra staffing context in this extract.']} />
          </Card>
          <Card title="Ownership">
            <Bullets items={ownItems} />
          </Card>
        </div>
        <p className="fb-note">Why it matters: {model.staffingWhy}</p>
      </section>

      <section className="fb-page" aria-labelledby="fb-fit">
        <h2 id="fb-fit">4. Care fit · Who this profile speaks to</h2>
        <p>{model.careFitIntro}</p>
        <div className="fb-metrics">
          {model.careFitMetrics.map((m) => (
            <Metric key={m.l} label={m.l} value={m.v} tone={m.tone} />
          ))}
        </div>
        <div className="fb-two">
          <Card title="Long-stay relevance" tone="soft">
            <p className="fb-muted">{model.longStayNote}</p>
          </Card>
          <Card title="Short-stay note">
            <p className="fb-muted">{model.shortStayNote}</p>
          </Card>
        </div>
        <h3 className="fb-sub">Selected long-stay quality measures (real values only)</h3>
        <p className="fb-muted">Lower is generally better unless noted. These are facility-reported rates CMS publishes — not a complete clinical chart.</p>
        {model.careFitRows.length ? (
          <table className="fb-table">
            <thead>
              <tr>
                <th>Measure</th>
                <th>Facility rate</th>
                <th>Reading tip</th>
              </tr>
            </thead>
            <tbody>
              {model.careFitRows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.rate}</td>
                  <td>{row.tip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="fb-muted">No long-stay quality-measure rates appear in this extract.</p>
        )}
        <div className="fb-two">
          <Card title="Also reported (context)">
            <Bullets items={model.careFitContext.length ? model.careFitContext : ['No additional quality-measure context in this extract.']} />
          </Card>
          <Card title="Fit checklist for your visit" tone="warn">
            <Bullets items={model.fitChecklist} />
          </Card>
        </div>
      </section>

      <section className="fb-page" aria-labelledby="fb-insp">
        <h2 id="fb-insp">5. Inspection story</h2>
        <p>{model.inspectionIntro}</p>
        <div className="fb-metrics">
          {model.categories.map((c) => (
            <Metric key={c.t} label={c.t} value={c.n} />
          ))}
        </div>
        {model.stories.map((story) => (
          <Card key={story.tag + story.finding}>
            <p className="fb-story-tag">{story.tag}</p>
            <p><strong>Finding: </strong>{story.finding}</p>
            <p><strong>Why it matters: </strong>{story.why}</p>
            <p><strong>Status: </strong>{story.status}</p>
            <p className="fb-ask"><strong>Ask: </strong>&ldquo;{story.ask}&rdquo;</p>
          </Card>
        ))}
        <p className="fb-note">{model.alsoOnRecord}</p>
      </section>

      <section className="fb-page" aria-labelledby="fb-ftag">
        <h2 id="fb-ftag">6. F-tag table · Decision-relevant deficiencies</h2>
        <p>{model.ftagIntro}</p>
        {model.ftagRows.length ? (
          <table className="fb-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>F-tag</th>
                <th>Plain label</th>
                <th>Scope / severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {model.ftagRows.map((row) => (
                <tr key={`${row.date}-${row.ftag}-${row.status}`} className={row.ij ? 'fb-row-ij' : undefined}>
                  <td>{row.date}</td>
                  <td>{row.ftag}</td>
                  <td>{row.label}</td>
                  <td>{row.scope}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="fb-muted">No individual deficiency rows were available to tabulate.</p>
        )}
        <p className="fb-note">{model.ftagNote}</p>
      </section>

      <section className="fb-page" aria-labelledby="fb-pen">
        <h2 id="fb-pen">7. Penalties &amp; safety extras</h2>
        <p>{model.penaltyIntro}</p>
        <div className="fb-chip-row">
          {model.penaltyChips.map((chip) => (
            <Chip key={chip.label} {...chip} />
          ))}
        </div>
        <h3 className="fb-sub">Penalty timeline</h3>
        {model.penaltyRows.length ? (
          <table className="fb-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {model.penaltyRows.map((row) => (
                <tr key={`${row.date}-${row.type}-${row.detail}`}>
                  <td>{row.date}</td>
                  <td>{row.type}</td>
                  <td>{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="fb-muted">No penalty timeline rows appear in this extract.</p>
        )}
        {(model.sffCard || model.abuseCard) ? (
          <div className="fb-two">
            {model.sffCard ? (
              <Card title="Special Focus Facility (SFF)" tone="urgent">
                <p>{model.sffCard}</p>
              </Card>
            ) : null}
            {model.abuseCard ? (
              <Card title="Abuse icon — active" tone="urgent">
                <p>{model.abuseCard}</p>
              </Card>
            ) : null}
          </div>
        ) : null}
        {model.fireCard ? (
          <Card title="Fire safety (when present)">
            <Bullets items={model.fireCard} />
          </Card>
        ) : null}
        <p className="fb-note">{model.penaltyNote}</p>
      </section>

      <section className="fb-page" aria-labelledby="fb-visit">
        <h2 id="fb-visit">8. Visit checklist · Questions tied to this facility</h2>
        <p>{model.visitIntro}</p>
        <ol className="fb-questions">
          {model.questions.map((q) => (
            <li key={q}>
              <p>{q}</p>
              <div className="fb-answer-line">
                <span>Answered by:</span>
                <span className="fb-write-in" />
                <span>Role / date:</span>
                <span className="fb-write-in" />
              </div>
            </li>
          ))}
        </ol>
        <p className="fb-note">{model.visitTip}</p>
      </section>

      <section className="fb-page" aria-labelledby="fb-decide">
        <h2 id="fb-decide">9. Decision worksheet &amp; sources</h2>
        <p>After the tour, capture what must be true for your family — then verify on Care Compare.</p>
        <h3 className="fb-sub">Nearby alternatives to compare</h3>
        {model.nearby.length ? (
          <table className="fb-table">
            <thead>
              <tr>
                <th>Facility</th>
                <th>City</th>
                <th>Stars</th>
                <th>Composite</th>
                <th>Fines</th>
                <th>IJ</th>
              </tr>
            </thead>
            <tbody>
              {model.nearby.map((n) => (
                <tr key={n.name}>
                  <td>{n.name}</td>
                  <td>{n.city}</td>
                  <td>{n.stars}</td>
                  <td>{n.composite}</td>
                  <td>{n.fines}</td>
                  <td>{n.ij}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="fb-muted">No lower-composite nearby homes were available to list in this extract.</p>
        )}
        <p className="fb-muted">{model.nearbyNote}</p>
        <div className="fb-two">
          <Card title="Must-haves">
            <p className="fb-muted">{model.mustHavesHint}</p>
            <div className="fb-write-block" />
          </Card>
          <Card title="Tradeoffs we can accept">
            <p className="fb-muted">Imperfect but workable for your situation</p>
            <div className="fb-write-block" />
          </Card>
          <Card title="People to call">
            <p className="fb-muted">Admissions · DON · social work · ombudsman</p>
            <div className="fb-write-block" />
          </Card>
          <Card title="Compare &amp; follow-up">
            <p className="fb-muted">Other facilities / dates to re-check</p>
            <div className="fb-write-block" />
          </Card>
        </div>
        <Card title="Sources">
          <p>{model.sources}</p>
        </Card>
        <p className="fb-limitation">Limitation: {model.limitation} · The Oversight Report · oversightreports.com · DataLink Clinical LLC</p>
      </section>
    </article>
  );
}
