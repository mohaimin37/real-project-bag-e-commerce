const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export function countryName(code) {
  if (!code) return '';
  try {
    return regionNames.of(String(code).toUpperCase()) || code;
  } catch {
    return code;
  }
}
