export function hasSffFlag(facility) {
  if (facility?.sff || facility?.special_focus) return true;
  return (facility?.flags || []).some((f) => /special focus/i.test(String(f)));
}

export function hasAbuseFlag(facility) {
  if (facility?.abuse_icon) return true;
  return (facility?.flags || []).some((f) => /abuse icon/i.test(String(f)));
}
