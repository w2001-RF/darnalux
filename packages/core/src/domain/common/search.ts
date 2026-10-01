// User search input is embedded in PostgREST filter strings (or=(...)), where
// commas, parentheses and wildcard characters change the filter's meaning.
// Strip them instead of escaping so a search can never alter the query.
export function sanitizeSearchTerm(term: string, maxLength = 60): string {
  return term
    .replace(/[%_,()*\\:"'`;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}
