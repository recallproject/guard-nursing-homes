import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/know-your-rights.css';

export default function KnowYourRightsPage() {
  const [activeAccordion, setActiveAccordion] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    window.plausible && window.plausible('Know-Your-Rights-View');
  }, []);

  const toggleAccordion = (index) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  return (
    <div className="kyr-page">
      <Helmet>
        <title>Know Your Rights — Nursing Home Discharge &amp; Safety | The Oversight Report</title>
        <meta name="description" content="Your legal rights when a nursing home tries to discharge your loved one before they're ready. Step-by-step appeal process, free resources, and how to fight an unsafe discharge." />
        <meta property="og:title" content="Know Your Rights — Nursing Home Discharge & Safety" />
        <meta property="og:description" content="If your loved one is being discharged from a nursing home before they're ready, you have legal rights. Here's how to use them." />
        <meta property="og:url" content="https://oversightreports.com/know-your-rights" />
        <link rel="canonical" href="https://oversightreports.com/know-your-rights" />
      </Helmet>

      {/* HERO */}
      <section className="kyr-hero">
        <div className="kyr-hero-content">
          <div className="kyr-hero-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Know Your Rights
          </div>
          <h1>Nursing Home Discharge &amp; Safety</h1>
          <p className="kyr-hero-subtitle">
            If your loved one is being discharged from a nursing home before they're ready, you have legal rights. Here's how to use them.
          </p>
          <div className="kyr-hero-trust">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Written by a nurse practitioner &bull; Based on federal law &bull; Updated March 2026
          </div>
        </div>
      </section>

      {/* PAGE BODY */}
      <div className="kyr-body">

        {/* SECTION 1: BEING DISCHARGED TOO EARLY */}
        <section className="kyr-section">
          <div className="kyr-section-card">
            <div className="kyr-section-header">
              <div className="kyr-section-icon red">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div>
                <h2>Being Discharged Too Early?</h2>
                <p>What to do if a nursing home is pushing your loved one out before they're safe</p>
              </div>
            </div>

            <p>If your family member is in a nursing home or skilled nursing facility and you've been told they're being discharged — but they can't safely care for themselves at home — you are not powerless. Federal law gives residents specific rights, and facilities have legal obligations they can't ignore.</p>

            <div className="kyr-definition-box">
              <div className="kyr-term">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                NOMNC — Notice of Medicare Non-Coverage
              </div>
              <p>This is the official notice your facility is <strong>required</strong> to give you when Medicare will stop paying for the stay. It is <em>not</em> a discharge order. It's a billing notice. You have the right to appeal it — and you should, especially if the resident isn't safe to go home.</p>
            </div>

            <div className="kyr-urgent-callout">
              <div className="kyr-urgent-label">Time-Sensitive</div>
              <p>You must file your appeal <strong>before noon the day before the last covered day</strong> listed on the NOMNC. If you miss this deadline, you may still be able to appeal — but acting fast protects your rights.</p>
            </div>

            <h3 className="kyr-steps-heading">How to Appeal: Step by Step</h3>

            <div className="kyr-steps">
              <div className="kyr-step">
                <div className="kyr-step-marker">1</div>
                <div className="kyr-step-line"></div>
                <div className="kyr-step-content">
                  <h4>Get the NOMNC in writing</h4>
                  <p>The facility must give you a paper copy. If they haven't, ask for it. The appeal phone number is printed on the form.</p>
                </div>
              </div>
              <div className="kyr-step">
                <div className="kyr-step-marker">2</div>
                <div className="kyr-step-line"></div>
                <div className="kyr-step-content">
                  <h4>Call the Quality Improvement Organization (QIO)</h4>
                  <p>The phone number is on the NOMNC. Tell them you want to appeal the discharge. They'll review whether it's medically appropriate. This is a free, independent review.</p>
                  <div className="kyr-step-deadline">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:'14px',height:'14px'}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Deadline: Noon the day before last covered day
                  </div>
                </div>
              </div>
              <div className="kyr-step">
                <div className="kyr-step-marker">3</div>
                <div className="kyr-step-line"></div>
                <div className="kyr-step-content">
                  <h4>Coverage continues during the appeal</h4>
                  <p>If you file on time, Medicare must continue covering the stay while the appeal is being reviewed. The facility cannot charge you for these days.</p>
                </div>
              </div>
              <div className="kyr-step">
                <div className="kyr-step-marker">4</div>
                <div className="kyr-step-line"></div>
                <div className="kyr-step-content">
                  <h4>Get the decision</h4>
                  <p>The QIO will issue a decision, usually within 1-2 days. If they rule in your favor, coverage continues. If not, you can still file a second-level appeal.</p>
                </div>
              </div>
              <div className="kyr-step">
                <div className="kyr-step-marker">5</div>
                <div className="kyr-step-content">
                  <h4>Contact the Ombudsman for backup</h4>
                  <p>Whether you win or lose the appeal, your state's Long-Term Care Ombudsman can advocate for the resident's safety and help ensure any discharge is safe and legal.</p>
                </div>
              </div>
            </div>

            <div className="kyr-definition-box kyr-definition-orange">
              <div className="kyr-term" style={{color: 'var(--accent-orange)'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                What is an "unsafe discharge"?
              </div>
              <p>Under federal law (42 CFR §483.15), a nursing home must provide a <strong>safe and orderly discharge plan</strong>. This means the facility must ensure the resident has somewhere safe to go and the support they need. Discharging a non-weight-bearing patient who lives alone with no home care arranged is a textbook unsafe discharge — and it's illegal.</p>
            </div>
          </div>
        </section>

        {/* SECTION 2: YOUR RIGHTS */}
        <section className="kyr-section">
          <div className="kyr-section-card">
            <div className="kyr-section-header">
              <div className="kyr-section-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <h2>Your Rights as a Resident or Family Member</h2>
                <p>These are federal rights — they apply in every state</p>
              </div>
            </div>

            <div className="kyr-rights-grid">
              {[
                { title: 'Right to appeal a discharge', desc: "You can challenge any discharge decision through the QIO appeal process. The facility must give you written notice (NOMNC) and cannot force you out while an appeal is pending." },
                { title: 'Right to a safe discharge plan', desc: "The facility must arrange safe transportation, ensure medications are transferred, coordinate with receiving providers, and confirm the destination is appropriate. \"Figure it out yourself\" is not a discharge plan." },
                { title: 'Right to choose your facility', desc: "If a transfer is necessary, you have the right to choose where you go (subject to bed availability and ability to meet your needs). The facility cannot dictate your next placement." },
                { title: 'Right to access inspection records', desc: "Every nursing home's federal inspection results, deficiency citations, fines, and staffing data are public record. You can use this data to evaluate any facility — current or prospective." },
                { title: 'Right to be free from retaliation', desc: "A facility cannot retaliate against you for filing a complaint, requesting an appeal, or contacting the ombudsman. If they do, report it to your state survey agency immediately." },
              ].map((right, i) => (
                <div className="kyr-right-item" key={i}>
                  <div className="kyr-right-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div className="kyr-right-text">
                    <h4>{right.title}</h4>
                    <p>{right.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3: FREE RESOURCES */}
        <section className="kyr-section">
          <div className="kyr-section-card">
            <div className="kyr-section-header">
              <div className="kyr-section-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <h2>Who Can Help — Free Resources</h2>
                <p>You don't have to navigate this alone. These are all free.</p>
              </div>
            </div>

            <div className="kyr-resources-grid">
              {[
                { icon: 'person', title: 'Long-Term Care Ombudsman', desc: "Free advocates who investigate complaints, mediate disputes, and protect residents' rights. They can attend care conferences and push back on unsafe discharges.", contact: 'Google "LTC Ombudsman" + your county' },
                { icon: 'phone', title: 'Medicare Hotline', desc: 'Can answer questions about Medicare coverage, help you understand your benefits, and direct you to your QIO for appeal.', contact: '1-800-MEDICARE (1-800-633-4227)' },
                { icon: 'pin', title: 'State Survey Agency', desc: 'The state agency that inspects nursing homes and enforces federal standards. File a complaint if you believe a discharge is unsafe or your rights are being violated.', contact: 'Find yours at Medicare.gov/care-compare' },
                { icon: 'home', title: 'Area Agency on Aging', desc: 'Local agencies that connect seniors with services: home care, meals, transportation, and help navigating benefits. They can help with post-discharge planning.', contact: 'eldercare.acl.gov or 1-800-677-1116' },
                { icon: 'screen', title: 'Legal Aid', desc: "Free legal services for low-income individuals. Many have elder law divisions that specifically handle nursing home discharge disputes and Medicaid issues.", contact: 'lawhelp.org — find free legal aid by state' },
                { icon: 'globe', title: 'ACENTRA Health (QIO)', desc: "The Quality Improvement Organization that handles Medicare appeals. If you can't find the appeal number on your NOMNC, you can look up your state's QIO directly.", contact: 'qioprogram.org' },
                { icon: 'alert', title: 'HHS Office of Inspector General', desc: 'Report fraud, abuse, neglect, or unsafe conditions at any facility receiving Medicare or Medicaid funding. Tips can be submitted anonymously.', contact: 'tips.hhs.gov' },
              ].map((res, i) => (
                <div className="kyr-resource-card" key={i}>
                  <h4>{res.title}</h4>
                  <p>{res.desc}</p>
                  <span className="kyr-resource-contact">{res.contact}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4: CHECK YOUR FACILITY */}
        <section className="kyr-section">
          <div className="kyr-facility-cta">
            <h2>Check Your Facility's Track Record</h2>
            <p>Look up your facility's federal inspection history. If they've been cited for discharge violations, staffing problems, or safety issues before — that's ammunition for your appeal and any complaint you file.</p>
            <Link to="/" className="kyr-cta-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Search 14,713 Nursing Homes
            </Link>
            <p className="kyr-cta-subtext">Free. No login required. Data sourced from CMS federal records.</p>
          </div>
        </section>

        {/* SECTION 5: COMMON SITUATIONS */}
        <section className="kyr-section">
          <div className="kyr-section-card">
            <div className="kyr-section-header">
              <div className="kyr-section-icon orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <h2>Common Situations</h2>
                <p>Practical advice for scenarios we hear about every week</p>
              </div>
            </div>

            <div className="kyr-accordion">
              {[
                {
                  q: '"My loved one is being discharged but can\'t care for themselves"',
                  a: [
                    "This is the most common situation we hear about. A resident is non-weight-bearing, needs wound care, can't manage medications, or can't safely perform daily activities — and the facility is saying they have to leave.",
                    "Your immediate steps: Request the NOMNC in writing. Call the QIO appeal number on the form before the deadline. Contact the Long-Term Care Ombudsman in your county. If the social worker is unhelpful, go to the administrator or director of nursing.",
                    "The facility has a legal obligation to ensure a safe discharge plan — which means confirming the person has appropriate care at their destination. \"They can't stay here anymore\" is not a plan. Make them put their discharge plan in writing."
                  ]
                },
                {
                  q: '"The social worker says there\'s nothing they can do"',
                  a: [
                    "Unfortunately, this is something we hear a lot. Some social workers genuinely don't know the appeal process. Others are under pressure from administration to move patients out quickly.",
                    "Go above their head. Ask to speak with the administrator or the director of nursing. Ask for the NOMNC form directly. You don't need the social worker's permission to appeal — you just need the phone number on that form.",
                    "If the facility is stonewalling you, call your Long-Term Care Ombudsman. They have legal authority to enter the facility and advocate for the resident. They deal with situations like this every day."
                  ]
                },
                {
                  q: '"Insurance says they won\'t cover more days"',
                  a: [
                    "Insurance denial is not the same as discharge. These are two separate decisions. The insurance company decides what they'll pay for. The facility decides whether to discharge you. Even if Medicare stops paying, the facility still has to ensure a safe discharge.",
                    "If you have Medicare Advantage (like Kaiser): You can appeal through the QIO just like traditional Medicare. But you can also appeal directly through your Medicare Advantage plan. You may even be able to switch to traditional Medicare during Open Enrollment for more flexibility.",
                    "If you have Medicaid: Medicaid may cover a continued stay if the resident is willing to pay their income toward the cost. Ask the business office about Medicaid-pending status. Many families don't realize this is an option."
                  ]
                },
                {
                  q: '"The facility is threatening to charge us for extra days"',
                  a: [
                    "If you filed a timely appeal: The facility cannot charge you for the days while the appeal is under review. This is federal law. If they try to bill you, that's a violation — report it to the ombudsman and the state survey agency.",
                    "If you didn't appeal (or missed the deadline): The facility may be able to bill you for days after the Medicare coverage ended. However, they still cannot discharge you to an unsafe situation. The obligation to provide a safe discharge plan exists regardless of payment status.",
                    "Document everything in writing. If anyone tells you something verbally, follow up with an email: \"Per our conversation, you stated that...\" This protects you if you need to file a complaint later."
                  ]
                },
              ].map((item, i) => (
                <div className={`kyr-accordion-item ${activeAccordion === i ? 'active' : ''}`} key={i}>
                  <button className="kyr-accordion-trigger" onClick={() => toggleAccordion(i)}>
                    <span>{item.q}</span>
                    <svg className="kyr-accordion-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  <div className="kyr-accordion-body" style={{ maxHeight: activeAccordion === i ? '600px' : '0' }}>
                    <div className="kyr-accordion-body-inner">
                      {item.a.map((para, j) => (
                        <p key={j}>{para}</p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ASK A CLINICIAN CTA */}
        <div className="kyr-clinician-cta">
          <div className="kyr-clinician-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <h3>Need Personalized Help?</h3>
          <p>Every situation is different. If you're not sure how this applies to your family's case, a clinician can walk you through your facility's data and help you understand your options.</p>
          <p className="kyr-clinician-pricing">One-time $49 fee · Data interpretation using public CMS records · Not legal or clinical advice</p>
          <Link to="/ask-a-clinician" className="kyr-clinician-button">
            Ask a Clinician
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
        </div>

        {/* FOOTER TEXT */}
        <div className="kyr-footer-text">
          <p>Data sourced from CMS federal records. This page provides general information about federal regulations — it is not legal advice. Consult with an attorney or ombudsman for guidance specific to your situation.</p>
          <p style={{marginTop: '12px'}}>The Oversight Report — Built by Robert Benard, NP · DataLink Clinical LLC</p>
        </div>

      </div>
    </div>
  );
}
