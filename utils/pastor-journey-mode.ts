// Preferência de navegação nesta aba; não concede acesso por si só.
const KEY = "rota29-pastor-journey-user";

export function isPastorJourneyMode(userId: string): boolean {
  try { return sessionStorage.getItem(KEY) === userId; } catch { return false; }
}

export function enablePastorJourneyMode(userId: string): boolean {
  try { sessionStorage.setItem(KEY, userId); return true; } catch { return false; }
}

export function leavePastorJourneyMode() {
  try { sessionStorage.removeItem(KEY); } catch {}
}
