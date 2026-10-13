"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";
type Church={igreja_id:string;nome:string;pastor_nome:string;contato:string;approval_status:string;members:number;member_limit:number};
export default function PilotApprovals(){
 const [churches,setChurches]=useState<Church[]>([]);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState<string|null>(null);
 const refresh=useCallback(async()=>{
  const {data,error:e}=await createClient().rpc("rota29_admin_pilot_churches");
  if(e)setError("Não foi possível carregar as aprovações.");
  else{setChurches(data||[]);setError("");}
  setLoading(false);
 },[]);
 useEffect(()=>{let alive=true;void Promise.resolve().then(()=>{if(alive)void refresh();});return()=>{alive=false;};},[refresh]);
 const approve=async(id:string,enabled:boolean)=>{
  if(saving)return;setSaving(id);setError("");
  const {error:e}=await createClient().rpc("rota29_admin_approve_church",{p_igreja:id,p_approve:enabled});
  if(e)setError(e.message);else await refresh();
  setSaving(null);
 };
 return <section className="mx-6 mt-5 rounded-2xl border border-accent/30 bg-bg-card p-4 space-y-3">
  <h2 className="font-bold text-lg">Liberar igrejas para o piloto</h2>
  <p className="text-sm text-text-muted">O pastor cadastra a igreja. Você confere os dados e aprova a entrada. Cada igreja tem 10 vagas de participantes, além do pastor. Período: 15/10 a 13/11/2026.</p>
  {loading?<p role="status">Carregando…</p>:churches.length===0?<p className="text-sm">Nenhuma igreja solicitou entrada ainda. As contas antigas não participam deste piloto.</p>:churches.map(c=><article key={c.igreja_id} className="rounded-xl border border-accent/20 p-4 space-y-2">
   <h3 className="font-bold">{c.nome}</h3><p className="text-sm">{c.pastor_nome} · {c.contato}</p>
   <p className="text-sm">{c.members}/{c.member_limit} vagas · {c.approval_status==="approved"?"Liberada":c.approval_status==="suspended"?"Suspensa":"Aguardando aprovação"}</p>
   <button type="button" disabled={saving!==null} onClick={()=>void approve(c.igreja_id,c.approval_status!=="approved")}
    className="rounded-lg bg-[#0F3D33] text-[#E9DFCE] border border-[#C79A5B] px-4 py-3 font-bold disabled:opacity-50">
    {saving===c.igreja_id?"Salvando…":c.approval_status==="approved"?"Suspender entrada":"Aprovar igreja"}
   </button>
  </article>)}
  {error&&<p role="alert" className="text-red-600 text-sm">{error}</p>}
  <button type="button" className="underline text-sm" onClick={()=>void refresh()}>Atualizar solicitações</button>
 </section>;
}
