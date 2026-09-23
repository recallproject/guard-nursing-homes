import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { CareAtHomeDialog } from '../components/careAtHome/CareAtHomeDialog';
import { StatusBadge } from '../components/careAtHome/StatusBadge';
import {
  CARE_AT_HOME_AGENCIES,
  CARD_FACTS,
  STATUS_LABELS,
  INITIAL_VISIBLE,
  MAX_COMPARE,
  PAGE_STEP,
  budgetFineprint,
  comparisonRows,
  confirmationLabel,
  createRequestDraft,
  filterAgencies,
  findAgency,
  formatCheckedDate,
  formatDollars,
  getBudgetScenario,
  latestChecked,
  pilotStats,
  toggleCompare,
  weeklyBudget,
} from '../data/careAtHome';
import { formspreeEndpoint } from '../utils/careAtHomeRequest';
import { track } from '../utils/analytics';
import '../styles/care-at-home.css';

const HERO_IMAGE = '/care-at-home/care-at-home.jpg';
const SCENARIO = getBudgetScenario();
const STATS = pilotStats();
const CHECKED_LABEL = formatCheckedDate(latestChecked());
const FINEPRINT = budgetFineprint(SCENARIO);
const ENDPOINT = formspreeEndpoint();

const QUESTIONS = [
  ['What would our actual week cost?', 'Describe the days, hours, and support you need. Ask for a written quote with minimum shifts, weekend and holiday rates, cancellation charges, and any other fees.'],
  ['What happens if our caregiver can’t come?', 'Ask who you call, how backup coverage is arranged, how quickly someone can respond, and whether replacement coverage is guaranteed in writing.'],
  ['Will we see the same person regularly?', 'Ask how caregivers are matched, how many people would be on your regular team, and what happens when a caregiver is away. Ask about relevant experience and language preferences, too.'],
];

export function CareAtHomePage() {
  const [county, setCounty] = useState('all');
  const [query, setQuery] = useState('');
  const [pricingOnly, setPricingOnly] = useState(false);
  const [shown, setShown] = useState(INITIAL_VISIBLE);
  const [selected, setSelected] = useState(['genki', 'coast']);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [hours, setHours] = useState(SCENARIO.defaultHours);
  const [dialog, setDialog] = useState(() => {
    if (typeof window === 'undefined') return null;
    const hashId = window.location.hash.replace('#agency-', '');
    return findAgency(hashId) ? { kind: 'profile', id: hashId } : null;
  });
  const [toast, setToast] = useState('');
  const dialogRef = useRef(null);
  const returnFocus = useRef(null);
  const pendingFocus = useRef(null);
  const toastTimer = useRef(null);

  const visible = filterAgencies(CARE_AT_HOME_AGENCIES, { county, query, pricingOnly });
  const page = visible.slice(0, shown);
  const filtersDirty = county !== 'all' || query.trim() !== '' || pricingOnly;
  const active = CARE_AT_HOME_AGENCIES.filter((agency) => selected.includes(agency.id));
  const rows = comparisonRows(active, differencesOnly);
  const budget = weeklyBudget(hours, SCENARIO);
  const moreCount = Math.min(PAGE_STEP, Math.max(0, visible.length - shown));

  useEffect(() => {
    window.scrollTo(0, 0);
    track('care_at_home_view', { surface: 'page', agencies: STATS.total });
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    if (dialog) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [dialog]);

  const dialogFocusKey = dialog
    ? [dialog.kind, dialog.id || '', dialog.field || '', dialog.explicitId || '', dialog.mode || ''].join('|')
    : '';

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return undefined;
    if (dialogFocusKey) {
      if (!el.open) el.showModal();
      const title = el.querySelector('#cah-dialog-title');
      title?.focus();
      el.scrollTop = 0;
    } else if (el.open) {
      el.close();
    }
    return undefined;
  }, [dialogFocusKey]);

  useEffect(() => {
    if (pendingFocus.current == null) return;
    const cards = document.querySelectorAll('.cah .agency-card');
    const card = cards[pendingFocus.current];
    pendingFocus.current = null;
    card?.querySelector('button')?.focus();
  }, [shown, page.length]);

  useEffect(() => {
    let saved = [];
    const before = () => {
      saved = [...document.querySelectorAll('.cah .question-list details')].map((el) => ({ el, open: el.open }));
      saved.forEach(({ el }) => { el.open = true; });
    };
    const after = () => {
      saved.forEach(({ el, open }) => { el.open = open; });
      saved = [];
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const notify = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4000);
  };

  const openDialog = (next) => {
    if (!dialog) returnFocus.current = document.activeElement;
    setDialog(next);
  };

  const closeDialog = () => {
    setDialog(null);
    const focus = returnFocus.current;
    if (focus instanceof HTMLElement && focus.isConnected) focus.focus();
  };

  const resetFilters = () => {
    setCounty('all');
    setQuery('');
    setPricingOnly(false);
    setShown(INITIAL_VISIBLE);
  };

  const restoreComparison = () => setSelected(['genki', 'coast']);

  const onCompare = (id, checked) => {
    if (checked) {
      const result = toggleCompare(selected, id, MAX_COMPARE);
      if (result.rejected) {
        notify('Compare up to 3 agencies. Remove one from your comparison to add another.');
        return;
      }
      setSelected(result.selected);
      return;
    }
    setSelected(selected.filter((item) => item !== id));
  };

  const openRequest = (explicitId = '', draft, mode = 'form', result) => {
    const nextDraft = draft || createRequestDraft({
      explicitId,
      selectedIds: selected,
      browseCounty: county,
    });
    if (mode === 'review') {
      openDialog({ kind: 'review', explicitId, draft: nextDraft });
      return;
    }
    if (mode === 'delivery') {
      track('care_at_home_request', {
        delivery: result.mode,
        agency_count: result.recipients.length,
        county: nextDraft.county,
      });
      openDialog({
        kind: 'delivery',
        explicitId,
        draft: nextDraft,
        mode: result.mode,
        recipients: result.recipients,
      });
      return;
    }
    openDialog({ kind: 'request', explicitId, draft: nextDraft });
  };

  const copyChecklist = async (value) => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      notify('Checklist copied. Paste it into your email to OversightReports.');
    } catch {
      const field = document.getElementById('claim-reply');
      field?.focus();
      field?.select();
      notify('Checklist selected. Copy it and paste into your email to OversightReports.');
    }
  };

  return (
    <div className="cah">
      <Helmet>
        <title>Care at home — Compare local agencies | The Oversight Report</title>
        <meta
          name="description"
          content="Know what it should cost. Know what to ask. Compare local home-care agencies in Orange County and San Diego before you call. A pilot of 20 profiles, with published Genki HomeCare and Coast Care rates."
        />
        <meta property="og:title" content="Care at home — The Oversight Report" />
        <meta property="og:description" content="Know what it should cost. Know what to ask. Compare local agencies before you call." />
        <meta property="og:url" content="https://www.oversightreports.com/care-at-home" />
        <link rel="canonical" href="https://www.oversightreports.com/care-at-home" />
      </Helmet>

      <a className="skip-link" href="#care-at-home-main">Skip to content</a>
      <p className="pilot-banner">
        Local pilot · {STATS.total} agencies · Public sources checked {CHECKED_LABEL} · No agency has confirmed a profile.
        {ENDPOINT ? ' Requests go to the OversightReports team first.' : ' Email is the way to reach the team.'}
      </p>

      <main id="care-at-home-main">
        <section className="hero container" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="small-line" /> THE CARE AT HOME EDIT</p>
            <h1 id="hero-title">
              Know what it<br />should cost.<br /><em>Know what to ask.</em>
            </h1>
            <p className="hero-deck">Compare local agencies before you call.</p>
            <p className="hero-description">
              Finding help at home is personal. We bring the rates, the policies, and the unanswered questions into one clearer picture.
            </p>
            <div className="hero-actions">
              <a className="button" href="#agencies">Explore local agencies <span aria-hidden="true">↓</span></a>
              <a className="text-link" href="#comparison">Compare side by side <span aria-hidden="true">↗</span></a>
            </div>
            <p className="market-line">
              ORANGE COUNTY <span>·</span> SAN DIEGO <span className="pilot-label">A local pilot</span>
            </p>
          </div>
          <figure className="hero-visual">
            <img
              src={HERO_IMAGE}
              alt="AI illustration of an older woman and an adult companion at home. Not a photograph of agency staff or clients."
              width="1122"
              height="1402"
              fetchPriority="high"
            />
            <figcaption>
              <span className="eyebrow">MORE CLARITY. LESS CALLING.</span>
              <p>A little help.<br />A lot more peace of mind.</p>
              <span className="caption-rule" />
              <span className="illustration-note">AI illustration. Not agency staff or clients.</span>
            </figcaption>
          </figure>
        </section>

        <div className="trust-strip container" aria-label="What you can compare">
          <div><span className="index-number">01</span><p><strong>The cost, upfront.</strong><span>Hourly rates. Minimums. The fine print.</span></p></div>
          <div><span className="index-number">02</span><p><strong>The everyday details.</strong><span>Backup plans and familiar faces.</span></p></div>
          <div><span className="index-number">03</span><p><strong>The source, always.</strong><span>Know who provided each fact.</span></p></div>
        </div>

        <section className="shortlist container section-space" id="agencies" aria-labelledby="agencies-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 / YOUR LOCAL SHORTLIST</p>
              <h2 id="agencies-title">Your local starting points.</h2>
            </div>
            <p>
              {STATS.total} agency profiles. {STATS.enriched} with published pricing and policies.
              <br />See what is known, and what is still worth asking.
            </p>
          </div>
          <div className="pilot-summary">
            <span><strong>{STATS.total}</strong> local agency profiles</span>
            <span><strong>{STATS.enriched}</strong> pricing profiles researched</span>
            <span>{confirmationLabel(STATS)}</span>
          </div>
          <div className="filters">
            <div className="filter-fields">
              <label>
                Browse by county
                <select id="county" value={county} onChange={(event) => { setCounty(event.target.value); setShown(INITIAL_VISIBLE); }}>
                  <option value="all">Orange County + San Diego</option>
                  <option value="oc">Orange County</option>
                  <option value="sd">San Diego</option>
                </select>
              </label>
              <label>
                Find an agency
                <input
                  id="agency-search"
                  type="search"
                  placeholder="Agency or city"
                  autoComplete="off"
                  value={query}
                  maxLength={80}
                  onChange={(event) => { setQuery(event.target.value.slice(0, 80)); setShown(INITIAL_VISIBLE); }}
                />
              </label>
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                id="pricing-only"
                checked={pricingOnly}
                onChange={(event) => { setPricingOnly(event.target.checked); setShown(INITIAL_VISIBLE); }}
              />
              Published pricing only
            </label>
          </div>
          <div className="results-meta">
            <p id="result-count" role="status">
              {visible.length === 0
                ? 'No matching agencies'
                : `Showing ${page.length} of ${visible.length} ${visible.length === 1 ? 'agency' : 'agencies'} · Published pricing first, then A–Z`}
            </p>
            <button type="button" className="subtle-link" id="reset-filters" hidden={!filtersDirty} onClick={resetFilters}>Reset filters</button>
            <a className="subtle-link" href="#sources">What do the labels mean? <span aria-hidden="true">↗</span></a>
          </div>
          <div className="agency-grid" id="agency-grid">
            {page.map((agency) => (
              <article key={agency.id} id={`agency-${agency.id}`} className={`agency-card ${agency.enriched ? 'researched' : 'basic'}`} aria-labelledby={`name-${agency.id}`}>
                <div className="agency-identity">
                  <span className="agency-monogram" aria-hidden="true">{agency.monogram}</span>
                  <small>
                    {agency.enriched ? <>Published details<br />Ready to explore</> : <>Local agency<br />Contact profile</>}
                  </small>
                </div>
                <div className="agency-body">
                  <p className="agency-location">{agency.area} · {agency.city}</p>
                  <h3 id={`name-${agency.id}`}>{agency.name}</h3>
                  <p className="agency-description">{agency.description}</p>
                  <StatusBadge status={agency.status} />
                  <div className="rate-block">
                    <div>
                      <p className={`rate ${agency.rateLow == null ? 'unlisted' : ''}`}>
                        {agency.rateLow != null ? <>{agency.rateLabel}<span> / hour</span></> : 'Rate not provided'}
                      </p>
                      <p className="rate-note">{agency.rateNote || 'Pricing and policies still to be collected.'}</p>
                    </div>
                    {agency.enriched && (
                      <p className="min-shift">
                        <strong>{agency.minimumLabel}</strong>
                        minimum visit
                        {agency.id === 'genki' ? <small>*Transport differs</small> : null}
                      </p>
                    )}
                  </div>
                  {agency.enriched ? (
                    <ul className="card-facts">
                      {CARD_FACTS.map(([key, label]) => (
                        <li key={key}>
                          <span className="fact-label">{label}</span>
                          <span className={`fact-value ${agency.fields[key].status === 'missing' ? 'unanswered' : ''}`}>
                            {agency.fields[key].value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="profile-pending">
                      Start with the agency’s contact details. Rates, minimums and everyday policies will be added as they are researched or confirmed.
                    </p>
                  )}
                </div>
                <div className="card-actions">
                  <button type="button" className="button button-outline" onClick={() => openDialog({ kind: 'profile', id: agency.id })}>
                    Explore agency details <span aria-hidden="true">↗</span>
                  </button>
                  <div className="card-bottom">
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={selected.includes(agency.id)}
                        aria-label={`Compare ${agency.name}`}
                        onChange={(event) => onCompare(agency.id, event.target.checked)}
                      />
                      Compare
                    </label>
                    <button type="button" className="subtle-link" onClick={() => openDialog({ kind: 'claim', id: agency.id })}>
                      Claim this profile
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="load-more">
            <button
              type="button"
              className="button button-outline"
              id="load-more"
              hidden={shown >= visible.length || visible.length === 0}
              onClick={() => {
                pendingFocus.current = page.length;
                setShown((count) => count + PAGE_STEP);
              }}
            >
              Show {moreCount} more agencies
            </button>
          </div>
          <div className="empty-state" id="empty-state" hidden={visible.length !== 0}>
            <h3>No profiles match those filters.</h3>
            <p>Try another county, a different search, or include profiles without pricing.</p>
            <button type="button" className="button button-outline" id="empty-reset" onClick={resetFilters}>Reset filters</button>
          </div>
          <p className="sample-note">
            Genki HomeCare and Coast Care appear first because their published details have been researched. The remaining profiles contain contact information, with comparison details still to be collected. Order is not a care-quality ranking. Confirm service area, availability and a written quote directly.
          </p>
        </section>

        <section className="comparison-section" id="comparison" aria-labelledby="comparison-title">
          <div className="container">
            <p className="print-notice">
              LOCAL PILOT — Public agency information checked {CHECKED_LABEL}. Agency confirmations and current licensing checks are pending. Prices are published starting terms, not quotes or market averages.
            </p>
            <div className="section-heading">
              <div>
                <p className="eyebrow">02 / THE DETAILS THAT MAKE A DIFFERENCE</p>
                <h2 id="comparison-title">Good questions.<br />Clearer comparisons.</h2>
              </div>
              <div className="comparison-intro">
                <p>A lower hourly rate is only part of the picture. Put the practical details next to each other.</p>
                <label className="check-label">
                  <input id="differences-only" type="checkbox" checked={differencesOnly} onChange={(event) => setDifferencesOnly(event.target.checked)} />
                  Show differences only
                </label>
              </div>
            </div>
            <div className="compare-toolbar">
              <p id="compare-count" role="status">
                {active.length} of {MAX_COMPARE} comparison slots used
                {differencesOnly && active.length >= 2 ? ` · ${rows.length} differing fields` : ''}
              </p>
              <button type="button" className="subtle-link" id="compare-all" onClick={restoreComparison}>Restore Genki + Coast</button>
            </div>
            <p className="mobile-hint">Swipe across to compare agencies <span aria-hidden="true">↔</span></p>
            <div className="table-scroll" role="region" aria-label="Agency comparison table, scroll horizontally on smaller screens" tabIndex={0} hidden={active.length < 2}>
              <table id="comparison-table">
                <caption className="sr-only">Public agency rates, policies, and information sources, checked {CHECKED_LABEL}</caption>
                <thead>
                  <tr>
                    <th scope="col">The things<br />worth knowing.</th>
                    {active.map((agency) => (
                      <th scope="col" key={agency.id}>
                        <button
                          type="button"
                          className="remove-compare"
                          aria-label={`Remove ${agency.name} from comparison`}
                          onClick={() => setSelected(selected.filter((id) => id !== agency.id))}
                        >
                          ×
                        </button>
                        <h3>{agency.name}</h3>
                        <StatusBadge status={agency.status} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([key, label, description]) => (
                    <tr key={key}>
                      <th scope="row">{label}<span>{description}</span></th>
                      {active.map((agency) => {
                        const field = agency.fields[key];
                        return (
                          <td key={agency.id}>
                            <span className="cell-value">{field.value}</span>
                            {field.note ? <span className="cell-note">{field.note}</span> : null}
                            <button
                              type="button"
                              className="cell-source"
                              aria-label={`Source for ${label} at ${agency.name}: ${STATUS_LABELS[field.status] || 'Not provided'}`}
                              onClick={() => openDialog({ kind: 'source', id: agency.id, field: key })}
                            >
                              <StatusBadge status={field.status} />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div id="compare-empty" className="empty-state" hidden={active.length >= 2}>
              <h3>Your comparison starts here.</h3>
              <p>Select at least two agencies for a side-by-side view.</p>
              <button type="button" className="button button-outline" id="compare-reset" onClick={restoreComparison}>Compare Genki + Coast</button>
            </div>
            <div className="comparison-footnote">
              <span>“Not provided” is a useful question to ask, not a quality rating.</span>
              <span>Agency statements are not an independent assessment of care.</span>
            </div>
          </div>
        </section>

        <section className="cost-section container section-space" aria-labelledby="cost-title">
          <div className="cost-copy">
            <p className="eyebrow">03 / PUT THE NUMBERS IN CONTEXT</p>
            <h2 id="cost-title">A rate is a starting point.<br /><em>A plan tells you more.</em></h2>
            <p>
              Explore how hours add up using Genki and Coast Care’s published base rates. Ask each agency for a written quote, including shift minimums and any additional charges.
            </p>
            <a className="text-link" href="#questions">Take these questions with you <span aria-hidden="true">↗</span></a>
          </div>
          <div className="cost-card">
            <div className="cost-card-top">
              <span className="eyebrow">PUBLISHED BASE-RATE EXAMPLE</span>
              <span className="little-tag">Two San Diego agencies</span>
            </div>
            <label className="slider-label" htmlFor="weekly-hours">
              Hours of care per week
              <output id="hours-value" htmlFor="weekly-hours">{hours} hours</output>
            </label>
            <input
              type="range"
              id="weekly-hours"
              min={SCENARIO.minHours}
              max={SCENARIO.maxHours}
              step="1"
              value={hours}
              onChange={(event) => setHours(Number(event.target.value))}
            />
            <div className="range-labels"><span>{SCENARIO.minHours} hours</span><span>{SCENARIO.maxHours} hours</span></div>
            <p className="budget" id="weekly-budget">
              ${formatDollars(budget.low)}–${formatDollars(budget.high)}<span> / week</span>
            </p>
            <p className="budget-description">{budget.label}</p>
            <p className="cost-fineprint">{FINEPRINT}</p>
          </div>
        </section>

        <section className="sources-section container" id="sources" aria-labelledby="sources-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">04 / TRANSPARENCY, BY DESIGN</p>
              <h2 id="sources-title">Every detail has a source.</h2>
            </div>
            <p>
              A complete profile starts with public information.
              <br />Agencies can confirm the details by email.
              <br />Our team reviews and updates each profile.
            </p>
          </div>
          <div className="source-grid">
            <article>
              <span className="status-badge verified">Agency verified</span>
              <h3>Confirmed by the agency.</h3>
              <p>Reserved for information confirmed by an authorized agency representative. No profiles in this pilot have this status yet. Confirmation describes a stated policy, not an independent endorsement.</p>
            </article>
            <article>
              <span className="status-badge public">Publicly sourced</span>
              <h3>Published, with a source.</h3>
              <p>Information comes from an agency website or a dated public record. Open a source label to see the link and check date. A website statement does not confirm current licensing.</p>
            </article>
            <article>
              <span className="status-badge missing">Not provided</span>
              <h3>An open question.</h3>
              <p>We have not added a sourced answer for this field. It may be available from the agency. The visible gap helps you prepare for your conversation.</p>
            </article>
          </div>
          <div className="process-line" aria-label="How agency profiles work">
            <span>Public sources</span><i aria-hidden="true">→</i>
            <span>Agency profile</span><i aria-hidden="true">→</i>
            <span>Agency replies by email</span><i aria-hidden="true">→</i>
            <span>You compare</span><i aria-hidden="true">→</i>
            <span>You choose who to contact</span>
          </div>
        </section>

        <section className="request-band container" aria-labelledby="request-title">
          <div>
            <p className="eyebrow">A LITTLE DIRECTION FOR YOUR NEXT STEP</p>
            <h2 id="request-title">You don’t have to start<br />with six phone calls.</h2>
            <p>
              Tell us what kind of support you’re looking for.
              <br />The OversightReports team reviews the note before any agency is contacted.
            </p>
          </div>
          <div className="request-band-action">
            <button type="button" className="button button-light" onClick={() => openRequest('')}>
              Request options <span aria-hidden="true">↗</span>
            </button>
            <p>You choose the agencies.<br />You decide when to connect.</p>
          </div>
        </section>

        <section className="questions container section-space" id="questions" aria-labelledby="questions-title">
          <div>
            <p className="eyebrow">BEFORE THE FIRST CALL</p>
            <h2 id="questions-title">Three things<br />worth asking.</h2>
            <button type="button" className="text-link" id="print-questions" onClick={() => window.print()}>
              Print a call checklist <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="question-list">
            {QUESTIONS.map(([title, copy], index) => (
              <details key={title} open={index === 0}>
                <summary>{title}</summary>
                <p>{copy}</p>
              </details>
            ))}
          </div>
          <p className="agency-claim-line">
            <button type="button" className="subtle-link" onClick={() => openDialog({ kind: 'claim', id: '' })}>
              For agencies: claim your profile <span aria-hidden="true">↗</span>
            </button>
          </p>
        </section>
      </main>

      <aside className="compare-tray" aria-label="Selected agencies">
        <div>
          <span className="tray-dots" aria-hidden="true">{active.map(() => '●').join(' ')}</span>
          <strong id="tray-count">{active.length} {active.length === 1 ? 'agency' : 'agencies'} selected</strong>
          <span className="tray-note">See the whole picture.</span>
        </div>
        <a href="#comparison" className="button">
          Compare <span id="tray-number">{active.length}</span> <span aria-hidden="true">↗</span>
        </a>
      </aside>

      <dialog
        ref={dialogRef}
        id="main-dialog"
        aria-labelledby="cah-dialog-title"
        onClose={closeDialog}
        onClick={(event) => {
          const el = dialogRef.current;
          if (!el || event.target !== el) return;
          const rect = el.getBoundingClientRect();
          const { clientX: x, clientY: y } = event;
          if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) closeDialog();
        }}
      >
        <button type="button" className="dialog-close" aria-label="Close dialog" onClick={closeDialog}>×</button>
        <div id="dialog-content">
          <CareAtHomeDialog
            dialog={dialog}
            endpoint={ENDPOINT}
            onClose={closeDialog}
            onProfile={(id) => openDialog({ kind: 'profile', id })}
            onSource={(id, field) => openDialog({ kind: 'source', id, field })}
            onRequest={openRequest}
            onClaim={(id) => openDialog({ kind: 'claim', id })}
            onCopy={copyChecklist}
          />
        </div>
      </dialog>

      <div id="toast" className={`toast${toast ? ' visible' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
