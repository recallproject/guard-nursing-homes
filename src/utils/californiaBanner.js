/**
 * CA AG hospice-fraud promo strip — disabled site-wide.
 * Kept as a single flag so it can be re-enabled without hunting JSX.
 */
export function shouldShowCaliforniaBanner(_pathname) {
  return false;
}
