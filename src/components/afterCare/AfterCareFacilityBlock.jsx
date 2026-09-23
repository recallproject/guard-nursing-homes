import { AfterCareDisclosure } from './AfterCareDisclosure';
import { AfterCarePicker } from './AfterCarePicker';
import '../../styles/after-care.css';

export function AfterCareFacilityBlock() {
  return (
    <div className="ac-embed">
      <h2 id="after-care-facility-question" className="ac-question">
        What does your loved one need help with at home?
      </h2>
      <p className="ac-lead">
        Choose one need. You’ll see two options, not a catalog. This is separate from the facility score above.
      </p>
      <AfterCareDisclosure />
      <AfterCarePicker surface="facility" labelId="after-care-facility-question" />
    </div>
  );
}
