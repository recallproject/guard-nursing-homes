/**
 * CA news strip is only relevant on California hub / CA state pages.
 * It must not appear on facility pages (including non-CA facilities) or
 * nationally framed surfaces like hospice.
 */
export function shouldShowCaliforniaBanner(pathname) {
  const path = (pathname || '/').split('?')[0].replace(/\/+$/, '') || '/';
  const lower = path.toLowerCase();
  if (lower.startsWith('/facility')) return false;
  if (lower.startsWith('/hospice')) return false;
  if (lower === '/california') return true;
  if (lower === '/state/ca') return true;
  if (lower === '/states/california' || lower.startsWith('/states/california/')) return true;
  return false;
}
