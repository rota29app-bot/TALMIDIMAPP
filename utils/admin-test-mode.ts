// Preferência de navegação da aba, vinculada ao usuário. Não concede permissões.
const KEY = "rota29-admin-test-user";
export function isAdminTestMode(userId: string): boolean {
  try { return sessionStorage.getItem(KEY) === userId; } catch { return false; }
}
export function enableAdminTestMode(userId: string): boolean {
  try { sessionStorage.setItem(KEY, userId); return true; } catch { return false; }
}
export function leaveAdminTestMode() {
  try { sessionStorage.removeItem(KEY); } catch {}
}
