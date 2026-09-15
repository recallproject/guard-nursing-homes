export function focusHubWhere() {
  const el = document.querySelector('.ia-field-input');
  if (el) {
    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
