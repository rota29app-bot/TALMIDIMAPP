"use client";
import {useState} from "react";
import {createClient} from "../../utils/supabase/client";
export default function DailyMemorialForm({stage,day,saved,onSaved}:{
  stage:string;day:number;saved:boolean;onSaved:()=>void;
}){
 const [vivido,setVivido]=useState("");
 const [falou,setFalou]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const save=async()=>{
  if(busy||vivido.trim().length+falou.trim().length<4)return;
  setBusy(true);setError("");
  const {error:e}=await createClient().rpc("rota29_save_daily_memorial",{
    p_stage:stage,p_day:day,p_vivido:vivido,p_deus_falou:falou
  });
  setBusy(false);
  if(e)setError(e.message);else onSaved();
 };
 return <section className="rounded-2xl border border-[#C79A5B]/35 bg-bg-card p-5 space-y-4 my-6">
  <h3 className="font-serif font-bold text-xl text-text-main">Memorial do Dia {day}</h3>
  {saved?<p role="status" className="text-sm text-text-main">Memorial registrado. Você já pode concluir este dia, se completou também as práticas e a reflexão.</p>:<>
   <p className="text-sm text-text-muted">Ao final do dia, registre o que viveu e aprendeu. Seu próximo conteúdo só abre no dia seguinte, na hora escolhida para oração.</p>
   <label className="block text-sm font-bold text-text-main">
    O que vivi hoje?
    <textarea aria-label="O que vivi hoje" rows={3} value={vivido}
      onChange={e=>setVivido(e.target.value)} maxLength={10000}
      className="mt-2 w-full rounded-xl border border-accent/30 bg-bg-main p-3 text-text-main"/>
   </label>
   <label className="block text-sm font-bold text-text-main">
    O que Deus falou ao meu coração?
    <textarea aria-label="O que Deus falou ao meu coração" rows={3} value={falou}
      onChange={e=>setFalou(e.target.value)} maxLength={10000}
      className="mt-2 w-full rounded-xl border border-accent/30 bg-bg-main p-3 text-text-main"/>
   </label>
   <button type="button" onClick={()=>void save()} disabled={busy||vivido.trim().length+falou.trim().length<4}
    className="w-full bg-accent text-bg-main font-bold p-3 rounded-xl disabled:opacity-50">
    {busy?"Salvando…":"Salvar Memorial e preparar conclusão"}
   </button>
   {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
  </>}
 </section>;
}
