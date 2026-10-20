"use client";
import {useState} from "react";
import {Copy} from "lucide-react";
export default function InvitationShare({code,name}:{code:string;name?:string|null}){
 const [notice,setNotice]=useState("");
 const link=()=>{
  const url=new URL("/igreja",window.location.origin);
  url.searchParams.set("convite",code);
  return url.toString();
 };
 return <div className="space-y-2 text-sm">
  <button type="button" className="flex items-center gap-2 underline" onClick={async()=>{
   try{await navigator.clipboard.writeText(link());setNotice("Link direto copiado.");}
   catch{setNotice("Não foi possível copiar. Use o compartilhamento abaixo.");}
  }}><Copy size={16}/> Copiar convite direto</button>
  <button type="button" className="block underline" onClick={()=>{
   const text="Convite ROTA29 — "+(name||"Igreja")+". Solicite participação: "+link()+". A entrada depende da aprovação do pastor.";
   window.open("https://wa.me/?text="+encodeURIComponent(text),"_blank","noopener,noreferrer");
  }}>Enviar convite pelo WhatsApp</button>
  {notice&&<p role="status" className="text-xs">{notice}</p>}
  <p className="text-xs text-[#547266]">O link identifica sua igreja automaticamente. Cada participante ainda aguarda sua aprovação.</p>
 </div>;
}