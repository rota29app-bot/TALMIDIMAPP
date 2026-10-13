"use client";
import { useCallback, useEffect, useState } from "react";
// Usa a arte oficial ROTA29 na abertura. O vídeo fornecido pode ser hospedado
// por URL própria e ativado pela variável NEXT_PUBLIC_ROTA29_SPLASH_VIDEO_URL.
const KEY="rota29-splash-seen";
const VIDEO_URL=process.env.NEXT_PUBLIC_ROTA29_SPLASH_VIDEO_URL;
export default function SplashScreen(){
 const [show,setShow]=useState(false);
 const [checked,setChecked]=useState(false);
 const finish=useCallback(()=>{sessionStorage.setItem(KEY,"1");setShow(false)},[]);
 useEffect(()=>{setShow(sessionStorage.getItem(KEY)!=="1");setChecked(true)},[]);
 useEffect(()=>{if(!show)return;const t=setTimeout(finish,VIDEO_URL?12000:4200);return()=>clearTimeout(t)},[show,finish]);
 if(!checked||!show)return null;
 return <div role="dialog" aria-label="Abertura ROTA29" className="fixed inset-0 z-[9999] overflow-hidden bg-[#0F3D33] text-white">
   <div className="absolute inset-0"><img src="/brand/rota29-splash-poster.svg" alt="" className="h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-b from-[#0F3D33]/5 via-transparent to-[#0F3D33]/60"/></div>
   {VIDEO_URL?<video src={VIDEO_URL} autoPlay muted playsInline controls={false} poster="/brand/rota29-splash-poster.svg" onEnded={finish} onError={finish} className="absolute inset-0 h-full w-full object-cover"/>:
   <div className="absolute inset-0 flex flex-col items-center justify-end pb-32 pointer-events-none rota29-entrance"><img src="/brand/rota29-symbol-negative.svg" alt="ROTA29" className="w-48 h-32 object-contain"/><p className="mt-4 text-xs font-bold uppercase tracking-[.32em] text-[#E9DFCE]">Discipulado no cotidiano</p></div>}
   <button onClick={finish} className="absolute bottom-8 right-7 z-20 px-5 py-3 rounded-full bg-[#0F3D33]/80 text-[#F8F5F0] border border-[#C79A5B]/60 text-xs tracking-widest font-bold">PULAR</button>
 </div>;
}
