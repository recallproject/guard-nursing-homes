import { AFTER_CARE_DISCLOSURE, AFTER_CARE_PAGE_DISCLOSURE } from '../../data/afterCare';

export function AfterCareDisclosure({ variant = 'compact' }) {
  const page = variant === 'page';
  return (
    <p className={page ? 'ac-disclosure ac-disclosure--line' : 'ac-disclosure'} role="note">
      {page ? AFTER_CARE_PAGE_DISCLOSURE : AFTER_CARE_DISCLOSURE}
    </p>
  );
}
