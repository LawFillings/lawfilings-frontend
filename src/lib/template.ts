/** Replaces {{key}} placeholders in a template with values from data, or a bracketed placeholder if missing. */
export function fillTemplate(template: string, data: Record<string, string | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = data[key];
    return value && value.trim().length > 0 ? value : `[${key.replace(/_/g, ' ')}]`;
  });
}
