import { STATUS_LABELS, normalizeStatus } from '../../data/careAtHome';

export function StatusBadge({ status }) {
  const safe = normalizeStatus(status);
  return <span className={`status-badge ${safe}`}>{STATUS_LABELS[safe]}</span>;
}
