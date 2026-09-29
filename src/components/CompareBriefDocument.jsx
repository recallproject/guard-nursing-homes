import { PRODUCT_LABEL } from '../utils/compareBriefContent';
import '../styles/compare-brief.css';

function ScoreTable({ caption, rows, homes }) {
  if (!rows?.length) return null;
  return (
    <div className="cb-table-wrap">
      <table className="cb-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Measure</th>
            {homes.map((home) => (
              <th key={home.ccn} scope="col">{home.shortName || home.name}</th>
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

export function CompareBriefDocument({
  model,
  showActions = false,
  onDownload,
  pdfLoading = false,
  sample = false,
}) {
  if (!model) return null;

  return (
    <article className="cb">
      <header className="cb-top">
        <p className="cb-brand">The Oversight Report</p>
        <p className="cb-product">{PRODUCT_LABEL}</p>
        <h1>One decision document for {model.count} nursing homes</h1>
        <p className="cb-meta">
          CMS data as of {model.dataAsOfLabel}. Generated {model.reportDateLabel}.
          {model.price ? ` Launch price $${model.price}.` : ''}
        </p>
        {sample ? (
          <p className="cb-sample">Sample of the paid Compare Brief. Viewing it is free and does not start checkout.</p>
        ) : null}
        {showActions ? (
          <div className="cb-actions no-print">
            <button type="button" className="cb-btn" onClick={onDownload} disabled={pdfLoading}>
              {pdfLoading ? 'Generating PDF...' : 'Download Compare Brief PDF'}
            </button>
          </div>
        ) : null}
      </header>

      <ul className="cb-homes">
        {model.homes.map((home) => (
          <li key={home.ccn}>
            <strong>{home.name}</strong>
            <span>{home.place} · CCN {home.ccn} · Overall {home.starsLabel}</span>
          </li>
        ))}
      </ul>

      <section>
        <h2>What this is</h2>
        <p>
          A scorecard, plain-language differences, tour questions for these homes, and a notes page.
          It does not pick a home.
        </p>
        <h2>What this is not</h2>
        <ul>
          <li>Not a ranking and not a recommendation of one home.</li>
          <li>Not live bed availability or a private-pay price.</li>
          <li>Not a substitute for a visit or for Medicare Care Compare.</li>
        </ul>
      </section>

      <section>
        <h2>Scorecard</h2>
        <p>Same public CMS fields as the free comparison. Direction labels are CMS meanings, not a verdict.</p>
        <ScoreTable caption="CMS measures across the selected homes" rows={model.scorecard} homes={model.homes} />
        <ScoreTable caption="More measures on the same extract" rows={model.extraScorecard} homes={model.homes} />
      </section>

      <section>
        <h2>Material differences</h2>
        <p>
          Only gaps large enough to ask about are written out. If a figure is missing, or the records are too close to treat as a difference, the page says so.
        </p>
        {model.noMaterialDifference ? <p className="cb-callout">{model.noMaterialDifference}</p> : null}
        <ul className="cb-diffs">
          {model.differences.map((item) => (
            <li key={item.id} className={item.status === 'insufficient' ? 'cb-diff cb-diff--thin' : 'cb-diff'}>
              {item.text}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Questions for your visit</h2>
        <h3>Shared questions</h3>
        <ol>
          {model.sharedQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ol>
        {model.facilityQuestions.map((home) => (
          <div key={home.ccn}>
            <h3>Follow-ups for {home.name}</h3>
            <ul>
              {home.questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section>
        <h2>Notes and decision</h2>
        <p>
          Write what you saw and what still matters. Distance, specialty care, and the people you met can outweigh a higher star rating. This page is not a score.
        </p>
        {model.homes.map((home) => (
          <div key={home.ccn} className="cb-notes">
            <h3>{home.shortName || home.name}</h3>
            {model.worksheetPrompts.map((prompt) => (
              <p key={prompt} className="cb-line"><span>{prompt}</span></p>
            ))}
          </div>
        ))}
      </section>

      <section>
        <h2>Sources, dates, and limits</h2>
        <ul>
          {model.sources.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {model.limits.map((line) => (
          <p key={line} className="cb-limit">{line}</p>
        ))}
        <p className="cb-limit">{model.independence}</p>
        <p className="cb-limit">{model.paymentDisclosure}</p>
      </section>
    </article>
  );
}
