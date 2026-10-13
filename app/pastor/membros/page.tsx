"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "../../../utils/supabase/client";
import type {PastoralData} from "../page";
import {ArrowLeft,Users} from "lucide-react";
export default function Members() {
 const router=useRouter();
 const [data,setData]=useState<PastoralData|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;
  (async()=>{
   const db=createClient();
   const {data:{user}}=await db.auth.getUser();
   if(!active)return;
   if(!user){router.replace("/start");return;}
   const {data:res,error:err}=await db.rpc("rota29_pastoral_dashboard");
   if(!active)return;
   if(err)setError("Não foi possível acessar os membros desta igreja.");
   else setData(res as PastoralData);
   setLoading(false);
  })();
  return()=>{active=false};
 },[router]);
 return <main className="min-h-screen bg-bg-main text-text-main pb-16">
  <header className="px-5 py-5 border-b border-accent/20 bg-bg-card flex items-center gap-3">
   <button aria-label="Voltar ao painel pastoral" onClick={()=>router.push("/pastor")}><ArrowLeft/></button>
   <Users/><h1 className="font-bold text-lg">Membros · ROTA29</h1>
  </header>
  <div className="max-w-4xl mx-auto p-5 space-y-4">
  {loading?<p>Carregando lista…</p>:error?<p role="alert">{error}</p>:data&&<>
    <h2 className="font-bold">{data.igreja} — {data.members.length} membro(s)</h2>
    <p className="text-sm text-text-muted">Dados de progresso e últimas atividades da sua própria igreja. A ausência é um convite ao cuidado pastoral.</p>
    {data.members.map(m=><article key={m.user_id} className="rounded-2xl bg-bg-card p-5 border border-accent/20">
     <div className="flex justify-between gap-3 items-start">
       <div><h3 className="font-bold">{m.nome}</h3><p className="text-xs text-text-muted">{m.email}</p></div>
       <span className="text-xs">{m.inativo?"Acompanhar":"Em atividade"}</span>
     </div>
     <p className="text-sm mt-3">Última atividade: {m.last_activity?new Date(m.last_activity+"T12:00:00").toLocaleDateString("pt-BR"):"Não registrada"}</p>
     <dl className="grid grid-cols-3 gap-2 text-xs mt-3">
       <div className="p-2 rounded-lg bg-bg-main"><dt>Intimidade</dt><dd className="font-bold">{Math.max(0,m.intimidade-1)}/21</dd></div>
       <div className="p-2 rounded-lg bg-bg-main"><dt>Família</dt><dd className="font-bold">{Math.min(7,Math.max(0,m.familia-1))}/7</dd></div>
       <div className="p-2 rounded-lg bg-bg-main"><dt>Compaixão</dt><dd className="font-bold">{Math.min(7,Math.max(0,m.compaixao-1))}/7</dd></div>
     </dl>
     <p className="text-xs text-text-muted mt-3">Dias ativos nesta semana: {m.days_7} · No mês: {m.days_30} · Insígnia: {m.badge?"Conquistada":"Em andamento"}</p>
    </article>)}
  </>}
  </div>
 </main>;
}
