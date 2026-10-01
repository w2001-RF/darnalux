// Maps Supabase/PostgREST/PostgreSQL errors to safe French messages; raw
// database text is only shown for errors raised on purpose by our own SQL
// functions (P0001/22023/42501 with a French message).

interface ErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === 'object' && value !== null;
}

const OWN_MESSAGE_CODES = new Set(['P0001', 'P0002', '22023']);

export function toUserMessage(error: unknown): string {
  if (!isErrorLike(error)) return 'Une erreur est survenue. Réessayez.';
  const { code, message = '' } = error;

  if (code === '23P01') return 'Ces dates chevauchent une autre réservation de ce bien.';
  if (code === '23505') return 'Cet élément existe déjà (valeur en double).';
  if (code === '23503') return 'Impossible : cet élément est utilisé ailleurs.';
  if (code === '23514') return 'Certaines valeurs ne respectent pas les règles (vérifiez le formulaire).';
  if (code === '42501' || code === 'PGRST301' || error.status === 403) {
    return /[àâçéèêëîïôûùüÿœ]/i.test(message) ? message : "Vous n'avez pas l'autorisation d'effectuer cette action.";
  }
  if (code && OWN_MESSAGE_CODES.has(code) && message) return message;
  if (code === 'PGRST116') return 'Élément introuvable.';
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
  }
  return 'Une erreur est survenue. Réessayez.';
}

// Throws the Supabase error (if any) so callers can use try/catch uniformly.
export function unwrap<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data as T;
}
