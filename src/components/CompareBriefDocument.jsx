import { PRODUCT_LABEL } from '../utils/compareBriefContent';
import '../styles/compare-brief.css';

function ScoreTable({ caption, rows, homes }) {
  if (!rows?.length) return null;
  return (
    <div className="cb-table-wrap">
      <table className="cb-table">
        <caption className="cb-sr">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Measure</th>
            {homes.map((home) => (
              <th key={home.ccn} scope="col" title={home.name}>
                {home.tableName || home.shortName || home.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">
                {row.label}
                <span className="cb-dir">{row.direction}</span>
              </th>
              {row.cells.map((cell, index) => (
                <td key={`${row.id}-${homes[index]?.ccn || index}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DifferenceList({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="cb-diffs">
      {items.map((item) => (
        <li key={item.id} className={item.status === 'insufficient' ? 'cb-diff cb-diff--thin' : 'cb-diff'}>
          {item.label ? <p className="cb-diff-label">{item.label}</p> : null}
          <p className="cb-diff-fact">{item.fact || item.text}</p>
          {item.ask ? <p className="cb-diff-ask">{item.ask}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function CompareBriefDocument({
  model,
  showActions = false,
  onDownload,
  pdfLoading = false,
  sample = false,
}) {
  if (!model) return null;

  const downloadLabel = pdfLoading ? 'Generating PDF...' : 'Download Compare Brief PDF';

  return (
    <article className="cb">
      <header className="cb-top">
        <div className="cb-brand-row">
          <p className="cb-brand">The Oversight Report</p>
          <p className="cb-product">{PRODUCT_LABEL}</p>
        </div>
        <h1>{model.count} nursing homes, side by side</h1>
        <p className="cb-meta">
          CMS data as of {model.dataAsOfLabel}
          <span aria-hidden="true"> · </span>
          Generated {model.reportDateLabel}
          {sample ? '. Free to view. Does not start checkout.' : ''}
          {sample && model.price ? ` The paid brief is $${model.price}.` : ''}
        </p>
      </header>

      <ul className="cb-homes">
        {model.homes.map((home) => (
          <li key={home.ccn}>
            <span className="cb-stars">{home.starsLabel}</span>
            <strong>{home.name}</strong>
            <span className="cb-place">{home.place}</span>
            <span className="cb-ccn">CCN {home.ccn}</span>
          </li>
        ))}
      </ul>

      <section className="cb-section" aria-labelledby="cb-score">
        <h2 id="cb-score">Scorecard</h2>
        <p className="cb-swipe">Swipe sideways to see every home.</p>
        <ScoreTable caption="CMS measures across the selected homes" rows={model.scorecard} homes={model.homes} />
        {model.extraScorecard?.length ? (
          <>
            <h3>More from the same extract</h3>
            <ScoreTable caption="More measures on the same extract" rows={model.extraScorecard} homes={model.homes} />
          </>
        ) : null}
      </section>

      <section className="cb-section" aria-labelledby="cb-diff">
        <h2 id="cb-diff">Differences to ask about</h2>
        {model.noMaterialDifference ? <p className="cb-callout">{model.noMaterialDifference}</p> : null}
        <DifferenceList items={model.differences} />
      </section>

      <section className="cb-section" aria-labelledby="cb-visit">
        <h2 id="cb-visit">Questions for a visit</h2>
        <ol className="cb-questions">
          {model.sharedQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ol>
        <div className="cb-followups">
          {model.facilityQuestions.map((home) => (
            <div key={home.ccn}>
              <h3>{home.name}</h3>
              <ul>
                {home.questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {showActions ? (
        <div className="cb-actions no-print">
          <button type="button" className="cb-btn" onClick={onDownload} disabled={pdfLoading}>
            {downloadLabel}
          </button>
        </div>
      ) : null}

      <footer className="cb-foot">
        <p className="cb-fine">
          Does not pick a home, rank homes, or show open beds or private-pay prices.
          Confirm records on Medicare Care Compare before a visit.
          Not affiliated with CMS or HHS.
        </p>
        <details className="cb-sources">
          <summary>Sources and limits</summary>
          <ul>
            {model.sources.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {model.limits.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p>{model.independence}</p>
          <p>{model.paymentDisclosure}</p>
          <p>The PDF includes a notes page for each home: {model.worksheetPrompts.join(', ').toLowerCase()}.</p>
        </details>
      </footer>
    </article>
  );
}
