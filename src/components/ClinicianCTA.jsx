import { Link } from 'react-router-dom';
import '../styles/clinician-cta.css';

export default function ClinicianCTA() {
  return (
    <div className="clin-cta-wrapper">
      <div className="clin-cta-banner">
        <div className="clin-cta-text">
          <h3 className="clin-cta-heading">Not sure what this data means for your family?</h3>
          <p className="clin-cta-sub">Get a plain-English interpretation of this facility's public safety record — prepared by a nurse practitioner, not a search algorithm.</p>
        </div>
        <Link to="/ask-a-clinician" className="clin-cta-btn">Ask a Clinician — $49</Link>
      </div>
      <p className="clin-cta-disclaimer">
        This service provides interpretation of publicly available government data about nursing facilities. It does not constitute medical advice, clinical guidance, or a professional recommendation about the care of any individual. No nurse-patient or provider-patient relationship is created by purchasing or receiving this report. This is not a substitute for consultation with a healthcare provider, attorney, or in-person facility evaluation.
      </p>
    </div>
  );
}
