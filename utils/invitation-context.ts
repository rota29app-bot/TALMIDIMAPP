// Preserva o contexto de um convite institucional durante os redirecionamentos do Google.
// Não confere autorização: toda validação real do convite ocorre no servidor.
const KEY = "rota29-invitation-context";
const TTL_MS = 60 * 60 * 1000;

function normalizeCode(raw: string | null): string | null {
  if (raw === null) return null;
  const normalized = raw.trim().toUpperCase();
  return /^[A-F0-9]{16}$/.test(normalized) ? normalized : "INVALID";
}

export function getInvitationContext(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.has("convite")) {
    const code = normalizeCode(params.get("convite"))!;
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify({ code, expires: Date.now() + TTL_MS }));
    } catch {
      // Em navegação privada, a URL ainda é suficiente para continuar.
    }
    return code;
  }
  try {
    const stored = window.sessionStorage.getItem(KEY);
    if (!stored) return null;
    const data: unknown = JSON.parse(stored);
    if (!data || typeof data !== "object" || !("code" in data) || !("expires" in data)) {
      clearInvitationContext();
      return null;
    }
    const entry = data as { code: unknown; expires: unknown };
    if (typeof entry.code !== "string" || typeof entry.expires !== "number" || entry.expires <= Date.now()) {
      clearInvitationContext();
      return null;
    }
    return normalizeCode(entry.code);
  } catch {
    return null;
  }
}

export function clearInvitationContext(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Armazenamento indisponível não interfere no login.
  }
}
