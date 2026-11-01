"use client";
import { useEffect, useState, useCallback, useRef } from "react";

// Primeiro render já inclui o vídeo; o poster evita tela verde.
const SEEN = "rota29-splash-seen";
const SRC = "/brand/Splash%20Rota29.mp4";
export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundError, setSoundError] = useState(false);
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
  const listenWithSound = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      // Navegadores móveis proíbem autoplay com áudio. O toque do usuário
      // habilita o som e reinicia a vinheta para não perder a narração.
      video.pause();
      video.currentTime = 0;
      video.muted = false;
      video.volume = 1;
      await video.play();
      setSoundEnabled(true);
      setSoundError(false);
    } catch (error) {
      console.warn("ROTA29: áudio depende de permissão de reprodução", error);
      setSoundError(true);
    }
  };
  if (!visible) return null;
  return <div role="dialog" aria-label="Abertura ROTA29"
    className="fixed inset-0 z-[9999] bg-black overflow-hidden">
    <video ref={videoRef} src={SRC} autoPlay muted playsInline preload="auto"
      poster="/brand/rota29-splash-poster.svg"
      loop={false} controls={false} onEnded={finish} onError={finish}
      className="absolute inset-0 w-full h-full object-cover" />
    {!soundEnabled && <button type="button" onClick={() => void listenWithSound()}
      className="absolute bottom-7 left-6 z-20 rounded-full border border-[#C79A5B]/70 bg-black/65 px-4 py-3 text-xs font-bold tracking-wide text-white">
      {soundError ? "TENTAR SOM NOVAMENTE" : "ATIVAR SOM"}
    </button>}
    <button onClick={finish} type="button"
      className="absolute bottom-7 right-6 z-20 rounded-full border border-[#C79A5B]/70 bg-black/65 px-5 py-3 text-xs font-bold tracking-widest text-white">
      PULAR
    </button>
  </div>;
}
