/** Team names and team codes — the same patterns firestore.rules accepts. */

/** "  Code   Crusaders " → "Code Crusaders" (what the rules accept), or null if not allowed. */
export function cleanTeamName(raw) {
  const name = String(raw ?? '').trim().replace(/\s+/g, ' ');
  return /^[A-Za-z0-9][A-Za-z0-9 ._&'-]{1,39}$/.test(name) ? name : null;
}
export const normaliseCode = (raw) => String(raw ?? '').trim().toUpperCase().replace(/\s+/g, '');
export const isTeamCode = (code) => /^TM-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/.test(code);
