"use client";
import { useEffect, useState, useCallback } from "react";

// Primeiro render já inclui o vídeo; o poster evita tela verde.
const SEEN = "rota29-splash-seen";
const SRC = "/brand/Splash%20Rota29.mp4";
export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const finish = useCallback(() => {
    try { sessionStorage.setItem(SEEN, "1"); } catch {}
    setVisible(false);
  }, []);
  useEffect(() => {
    try { if (sessionStorage.getItem(SEEN) === "1") { setVisible(false); return; } }
    catch {}
    const timer = setTimeout(finish, 13500);
    return () => clearTimeout(timer);
  }, [finish]);
  if (!visible) return null;
  return <div role="dialog" aria-label="Abertura ROTA29"
    className="fixed inset-0 z-[9999] bg-black overflow-hidden">
    <video src={SRC} autoPlay muted playsInline preload="auto"
      poster="/brand/rota29-splash-poster.svg"
      loop={false} controls={false} onEnded={finish} onError={finish}
      className="absolute inset-0 w-full h-full object-cover" />
    <button onClick={finish} type="button"
      className="absolute bottom-7 right-6 z-20 rounded-full border border-[#C79A5B]/70 bg-black/65 px-5 py-3 text-xs font-bold tracking-widest text-white">
      PULAR
    </button>
  </div>;
}
