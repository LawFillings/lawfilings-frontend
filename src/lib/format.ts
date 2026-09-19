/** Fills `{name}` placeholders in a translated string — used instead of per-language functions so
 *  every language file stays plain data. Unknown placeholders are left as-is. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
