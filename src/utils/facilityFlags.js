import { sffStatusOf } from './sffStatus.js';

/** True only for a current Table A Special Focus Facility — not candidates or graduates. */
export function hasSffFlag(facility) {
  return sffStatusOf(facility) === 'active';
}

export function hasAbuseFlag(facility) {
  if (facility?.abuse_icon) return true;
  return (facility?.flags || []).some((f) => /abuse icon/i.test(String(f)));
}

export { sffStatusOf };
