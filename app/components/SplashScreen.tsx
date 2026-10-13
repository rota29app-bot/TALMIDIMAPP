"use client";
import {useCallback,useEffect,useState} from "react";

// Etapa 1: abertura do ROTA29, ANTES do login.
// Use o vídeo original enviado em public/brand/Splash Rota29.mp4;
// O caminho público preserva as maiúsculas e codifica o espaço do arquivo.
const KEY="rota29-splash-seen";
const VIDEO_PATH="/brand/Splash%20Rota29.mp4";
export default function SplashScreen(){
  const [show,setShow]=useState(false);
  const [ready,setReady]=useState(false);
  const finish=useCallback(()=>{sessionStorage.setItem(KEY,"1");setShow(false)},[]);
  useEffect(()=>{setShow(sessionStorage.getItem(KEY)!=="1");setReady(true)},[]);
  useEffect(()=>{
    if(!show)return;
    const timeout=setTimeout(finish,12500);
    return()=>clearTimeout(timeout);
  },[show,finish]);
  if(!ready||!show)return null;
  return <div role="dialog" aria-label="Abertura ROTA29" className="fixed inset-0 z-[9999] overflow-hidden bg-[#0F3D33] text-white">
    <video src={VIDEO_PATH} autoPlay muted playsInline controls={false} loop={false}
       preload="auto"
       onEnded={finish} onError={finish}
       className="absolute inset-0 h-full w-full object-cover"/>
    <button type="button" onClick={finish}
      className="absolute bottom-8 right-7 z-20 px-5 py-3 rounded-full bg-[#0F3D33]/80 text-[#F8F5F0] border border-[#C79A5B]/60 text-xs tracking-widest font-bold">
      PULAR
    </button>
  </div>;
}
