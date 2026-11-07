/**
 * Minimal RFC 4180 CSV writer.
 * Also neutralises spreadsheet formula injection: a cell beginning with
 * = + - @ (or tab / CR) is prefixed with a single quote so Excel/Sheets
 * treat it as text rather than executing it.
 */
export function csvCell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header, rows) {
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** A filesystem-safe slug for the download filename. */
export function slugify(name) {
  return (
    String(name)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'counter'
  );
}
