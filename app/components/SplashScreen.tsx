"use client";
import {useCallback,useEffect,useState} from "react";

// Etapa 1: abertura do ROTA29, ANTES do login.
// Use o vídeo original enviado em public/brand/rota29-splash.mp4;
// enquanto o arquivo não estiver publicado, exiba a arte de marca.
const KEY="rota29-splash-seen";
const VIDEO_PATH="/brand/rota29-splash.mp4";
export default function SplashScreen(){
  const [show,setShow]=useState(false);
  const [ready,setReady]=useState(false);
  const [videoUnavailable,setVideoUnavailable]=useState(false);
  const finish=useCallback(()=>{sessionStorage.setItem(KEY,"1");setShow(false)},[]);
  useEffect(()=>{setShow(sessionStorage.getItem(KEY)!=="1");setReady(true)},[]);
  useEffect(()=>{
    if(!show)return;
    const timeout=setTimeout(finish,videoUnavailable?4200:12500);
    return()=>clearTimeout(timeout);
  },[show,videoUnavailable,finish]);
  if(!ready||!show)return null;
  return <div role="dialog" aria-label="Abertura ROTA29" className="fixed inset-0 z-[9999] overflow-hidden bg-[#0F3D33] text-white">
    <div className="absolute inset-0">
      <img src="/brand/rota29-splash-poster.svg" alt="" className="h-full w-full object-cover"/>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0F3D33]/5 via-transparent to-[#0F3D33]/50"/>
    </div>
    {!videoUnavailable&&<video src={VIDEO_PATH} autoPlay muted playsInline controls={false} loop={false}
       preload="auto" poster="/brand/rota29-splash-poster.svg"
       onEnded={finish} onError={()=>setVideoUnavailable(true)}
       className="absolute inset-0 h-full w-full object-cover"/>}
    {videoUnavailable&&<div className="absolute inset-0 flex flex-col items-center justify-end pb-32 pointer-events-none rota29-entrance">
      <img src="/brand/rota29-symbol-negative.svg" alt="ROTA29" className="w-48 h-32 object-contain"/>
      <p className="mt-4 text-xs font-bold uppercase tracking-[.32em] text-[#E9DFCE]">Discipulado no cotidiano</p>
    </div>}
    <button type="button" onClick={finish}
      className="absolute bottom-8 right-7 z-20 px-5 py-3 rounded-full bg-[#0F3D33]/80 text-[#F8F5F0] border border-[#C79A5B]/60 text-xs tracking-widest font-bold">
      PULAR
    </button>
  </div>;
}
