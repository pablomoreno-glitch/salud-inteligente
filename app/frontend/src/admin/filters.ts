/** Accent- and case-insensitive text used by the admin search boxes. */
export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function matchesSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const needle = normalizeSearch(query);
  if (!needle) return true;
  return fields.some((field) => field && normalizeSearch(field).includes(needle));
}
