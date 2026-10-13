"use client";
import { useEffect } from "react";

/** Registro do PWA ROTA29, sem SW de terceiros e sem cache de autenticação. */
export default function RegisterPWA() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    // Troca o SW antigo pelo novo em /sw.js e deixa o navegador gerenciar updates.
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(reg => { void reg.update(); })
      .catch(error => console.warn("ROTA29: não foi possível registrar PWA", error));
  }, []);
  return null;
}
