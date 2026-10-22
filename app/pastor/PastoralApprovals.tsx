"use client";
import {useCallback,useEffect,useState} from "react";
import {createClient} from "../../utils/supabase/client";
import {Check,Clock3,ShieldCheck,UserX,RefreshCw} from "lucide-react";
type Request={user_id:string;nome:string;email:string;status:"pending"|"approved";requested_at:string};
export default function PastoralApprovals(){
 const [requests,setRequests]=useState<Request[]>([]);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{
  const {data,error:e}=await createClient().rpc("rota29_pastor_pending_members");
  if(e){setError(e.message||"Falha ao consultar solicitações.");}
  else{setRequests((data||[]) as Request[]);setError("");}
  setLoading(false);
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 const review=async(userId:string,approve:boolean)=>{
  if(busy)return;setBusy(userId);setError("");setNotice("");
  const {error:e}=await createClient().rpc("rota29_pastor_review_member",{p_user_id:userId,p_approve:approve});
  if(e)setError(e.message);
  else {setNotice(approve?"Participante aprovado.":"Solicitação recusada ou acesso suspenso.");await refresh();}
  setBusy(null);
 };
 const pending=requests.filter(r=>r.status==="pending");
 const approved=requests.filter(r=>r.status==="approved");
 return <section className="rounded-2xl border border-accent/30 bg-bg-card p-5 space-y-4" aria-label="Autorizações pastorais">
  <div className="flex justify-between gap-3 items-center"><div><h2 className="text-lg font-bold flex gap-2 items-center"><ShieldCheck size={20}/> Autorizar participantes</h2><p className="text-sm text-text-muted">Código informado não significa acesso concedido. Cada pessoa aguarda sua aprovação.</p></div><button onClick={()=>void refresh()} aria-label="Atualizar pedidos"><RefreshCw/></button></div>
  {loading?<p>Consultando pedidos…</p>:<>
   <h3 className="font-semibold flex items-center gap-2"><Clock3 size={18}/> Pendentes ({pending.length})</h3>
   {pending.length===0?<p className="text-sm text-text-muted">Nenhuma solicitação aguardando sua análise.</p>:pending.map(item=><article key={item.user_id} className="rounded-xl border border-accent/20 bg-bg-main p-4 space-y-3">
    <div><strong className="block">{item.nome}</strong><span className="text-xs text-text-muted break-all">{item.email}</span></div>
    <div className="flex gap-2 flex-wrap">
     <button disabled={busy!==null} onClick={()=>void review(item.user_id,true)} className="rounded-lg px-4 py-2 bg-[#0F3D33] text-white flex gap-2 items-center disabled:opacity-40"><Check size={16}/> Aprovar</button>
     <button disabled={busy!==null} onClick={()=>void review(item.user_id,false)} className="rounded-lg px-4 py-2 border border-red-400 text-red-600 flex gap-2 items-center disabled:opacity-40"><UserX size={16}/> Recusar</button>
    </div>
   </article>)}
   <h3 className="font-semibold">Participantes aprovados ({approved.length})</h3>
   {approved.map(item=><article key={item.user_id} className="flex flex-wrap justify-between items-center gap-2 rounded-xl border border-accent/20 p-3">
    <div><strong className="block text-sm">{item.nome}</strong><span className="text-xs text-text-muted break-all">{item.email}</span></div>
    <button disabled={busy!==null} onClick={()=>void review(item.user_id,false)} className="rounded-lg border border-red-400 text-red-600 px-3 py-2 text-xs disabled:opacity-40">Suspender acesso</button>
   </article>)}
  </>}
  {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
  {notice&&<p role="status" className="text-sm">{notice}</p>}
 </section>;
}