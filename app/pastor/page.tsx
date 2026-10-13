"use client";
import {useCallback,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "../../utils/supabase/client";
import {Building2,Users,TrendingUp,CalendarDays,BellRing,FileDown,ArrowRight,ShieldCheck,RefreshCw,CheckCircle2} from "lucide-react";

export type PastoralMember={
 user_id:string; nome:string; email:string; last_activity:string|null;
 days_7:number;days_30:number;intimidade:number;familia:number;compaixao:number;
 badge:boolean;iniciou:boolean;inativo:boolean;abandonou:boolean;
 practice_intimidade:number;practice_familia:number;practice_compaixao:number;
};
export type PastoralData={
 igreja_id:string;igreja:string;role:string;plan:string;license_status:string;
 alert_after_days:number;
 members:PastoralMember[];
 totals:{members:number;started:number;completed:number;active_7:number;
 active_30:number;inactive:number;abandoned:number;
 engagement_7_pct:number|null;engagement_30_pct:number|null};
};
export function csvValue(value:unknown) {
 let s=String(value??"");
 if(/^[\s]*[=+@\-]/.test(s))s="'"+s;
 return '"'+s.replaceAll('"','""')+'"';
}
export function exportCsv(rows:unknown[][],filename:string){
 const blob=new Blob(["\uFEFF"+rows.map(r=>r.map(csvValue).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 const anchor=document.createElement("a");anchor.href=url;anchor.download=filename;
 document.body.appendChild(anchor);anchor.click();anchor.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function formatDate(date:string|null){
 if(!date)return "Ainda não iniciou";
 const d=new Date(date+"T12:00:00");
 return Number.isNaN(d.getTime())?date:new Intl.DateTimeFormat("pt-BR").format(d);
}
const count=(num:number|undefined)=>Number(num||0);
export default function PastorDashboard(){
 const router=useRouter();
 const [data,setData]=useState<PastoralData|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [days,setDays]=useState(21);
 const [notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{
   const db=createClient();
   const {data:{user},error:authError}=await db.auth.getUser();
   if(authError||!user){router.replace("/start");return;}
   const {data:response,error:failure}=await db.rpc("rota29_pastoral_dashboard");
   if(failure){setError(failure.message||"Não foi possível acessar o painel pastoral.");setLoading(false);return;}
   const info=response as PastoralData;
   setData(info);setDays(info.alert_after_days);setError("");setLoading(false);
 },[router]);
 useEffect(()=>{void refresh()},[refresh]);
 const saveAlert=async()=>{
   setSaving(true);setNotice("");setError("");
   const {error:failure}=await createClient().rpc("rota29_set_pastoral_alert",{p_days:days});
   setSaving(false);
   if(failure){setError(failure.message);return;}
   setNotice("Prazo de acompanhamento atualizado para sua igreja.");
   await refresh();
 };
 const download=()=>{
   if(!data)return;
   const t=data.totals;
   exportCsv([
     ["ROTA29 — Resumo pastoral",data.igreja],
     ["Plano",data.plan,"Situação",data.license_status],
     ["Membros",t.members,"Iniciaram",t.started,"Concluíram a primeira insígnia",t.completed],
     ["Ativos nos últimos 7 dias",t.active_7,"Ativos nos últimos 30 dias",t.active_30],
     ["Engajamento 7 dias (%)",t.engagement_7_pct??"Não calculável"],
     ["Engajamento 30 dias (%)",t.engagement_30_pct??"Não calculável"],
     ["Inativos",t.inactive,"Iniciaram e estão inativos sem concluir",t.abandoned],
     [],
     ["Membro","E-mail","Última atividade","Dias com acesso 7d","Dias com acesso 30d","Intimidade (dia)","Família (dia)","Compaixão (dia)","Práticas completas Intimidade","Práticas completas Família","Práticas completas Compaixão","Primeira insígnia","Alerta"],
     ...data.members.map(m=>[m.nome,m.email,m.last_activity||"",m.days_7,m.days_30,m.intimidade,m.familia,m.compaixao,m.practice_intimidade,m.practice_familia,m.practice_compaixao,m.badge?"Sim":"Não",m.inativo?"Acompanhar":"Ativo"])
   ],"rota29-acompanhamento-"+new Date().toISOString().slice(0,10)+".csv");
 };
 if(loading)return <main className="min-h-screen flex items-center justify-center bg-bg-main text-text-main" role="status">Carregando painel pastoral…</main>;
 if(error&&!data)return <main className="min-h-screen bg-bg-main p-7 text-text-main space-y-4"><h1 className="text-2xl font-bold">Painel pastoral</h1><p role="alert">{error}</p><button className="underline" onClick={()=>void refresh()}>Tentar novamente</button></main>;
 if(!data)return null;
 const t=data.totals;
 const cards=[
   {name:"Membros vinculados",value:count(t.members),icon:Users},
   {name:"Iniciaram a jornada",value:count(t.started),icon:CalendarDays},
   {name:"Ativos na semana",value:count(t.active_7),icon:TrendingUp},
   {name:"Ativos no mês",value:count(t.active_30),icon:TrendingUp},
   {name:"Primeira insígnia",value:count(t.completed),icon:CheckCircle2},
   {name:"Precisam de atenção",value:count(t.inactive),icon:BellRing}
 ];
 return <main className="min-h-screen bg-bg-main text-text-main pb-24">
   <header className="sticky top-0 z-20 border-b border-accent/20 bg-bg-card px-5 py-4 flex items-center justify-between">
    <div className="flex items-center gap-3"><Building2 size={25} className="text-accent"/><div>
      <h1 className="font-bold text-lg">ROTA29 · Painel Pastoral</h1>
      <p className="text-text-muted text-xs">{data.igreja}</p>
    </div></div>
    <button aria-label="Atualizar indicadores" onClick={()=>void refresh()}><RefreshCw size={20}/></button>
   </header>
   <div className="mx-auto max-w-5xl px-5 py-7 space-y-7">
     <div className="rounded-2xl border border-accent/30 bg-bg-card p-5 space-y-2">
       <div className="flex gap-2 items-center"><ShieldCheck size={20}/><strong>Plano Liderança · {data.license_status==="pilot"?"Piloto":data.license_status}</strong></div>
       <p className="text-sm text-text-muted">Acompanhamento exclusivo dos membros vinculados à sua igreja. O Radar não mede valor espiritual: os indicadores servem ao cuidado, não à cobrança.</p>
     </div>
     <section aria-label="Indicadores da igreja" className="grid grid-cols-2 md:grid-cols-3 gap-3">
       {cards.map(c=><div key={c.name} className="border border-accent/20 rounded-2xl bg-bg-card p-4"><c.icon size={20} className="text-accent"/><p className="text-3xl font-bold mt-3">{c.value}</p><p className="text-xs text-text-muted mt-1">{c.name}</p></div>)}
     </section>
     <section className="rounded-2xl border border-accent/20 bg-bg-card p-5 space-y-3">
       <h2 className="text-lg font-bold">Engajamento da comunidade</h2>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
         <div><p className="text-sm">Últimos 7 dias</p><strong className="text-2xl">{t.engagement_7_pct===null?"—":t.engagement_7_pct+"%"}</strong><p className="text-xs text-text-muted">{t.active_7} de {t.members} membros vinculados</p></div>
         <div><p className="text-sm">Últimos 30 dias</p><strong className="text-2xl">{t.engagement_30_pct===null?"—":t.engagement_30_pct+"%"}</strong><p className="text-xs text-text-muted">{t.active_30} de {t.members} membros vinculados</p></div>
       </div>
       <p className="text-xs text-text-muted">Iniciaram e interromperam a jornada sem concluir a insígnia: <strong>{t.abandoned}</strong>. O sistema registra acessos, não mede intimidade com Deus.</p>
     </section>
     <section className="rounded-2xl border border-accent/20 bg-bg-card p-5 space-y-3">
       <h2 className="text-lg font-bold">Alertas para cuidado pastoral</h2>
       <label className="block text-sm">Sinalizar ausência de atividade após
         <select aria-label="Dias para considerar inatividade" value={days} onChange={e=>setDays(Number(e.target.value))}
           className="mt-2 w-full rounded-xl bg-bg-main border border-accent/30 p-3">
           {[7,14,21,28,30,45,60,90].map(n=><option key={n} value={n}>{n} dias</option>)}
         </select>
       </label>
       <button onClick={()=>void saveAlert()} disabled={saving||days===data.alert_after_days}
         className="rounded-xl bg-accent px-4 py-3 font-bold text-bg-main disabled:opacity-40">
         {saving?"Salvando…":"Salvar prazo"}
       </button>
       {notice&&<p role="status" className="text-sm">{notice}</p>}
       {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
     </section>
     <section className="rounded-2xl border border-accent/20 bg-bg-card p-5 space-y-4">
       <div className="flex flex-wrap justify-between gap-3 items-center"><h2 className="text-lg font-bold">Membros e progresso</h2>
        <button onClick={download} className="flex items-center gap-2 rounded-xl border border-accent/40 px-4 py-3 text-sm font-bold"><FileDown size={18}/> Exportar CSV</button>
       </div>
       {data.members.length===0?<p className="text-sm text-text-muted">Nenhum membro vinculado ainda. Convide participantes pelo código da igreja.</p>:
        <div className="space-y-3">{data.members.map(m=><div key={m.user_id} className="rounded-xl bg-bg-main border border-accent/15 p-4">
         <div className="flex flex-wrap justify-between gap-2"><div><strong>{m.nome}</strong><p className="text-xs text-text-muted">{m.email}</p></div>
           {m.inativo?<span className="text-xs text-amber-700 font-bold">Necessita acompanhamento</span>:<span className="text-xs text-emerald-700 font-bold">Em acompanhamento</span>}
         </div>
         <p className="text-xs text-text-muted mt-2">Última atividade: {formatDate(m.last_activity)} · {m.days_7} dia(s) ativo(s) na semana</p>
         <p className="text-xs text-text-muted mt-2">Práticas completas — Intimidade: {m.practice_intimidade||0} · Família: {m.practice_familia||0} · Compaixão: {m.practice_compaixao||0}</p>
         <div className="mt-2 flex flex-wrap gap-2 text-xs">
           <span className="bg-bg-card border rounded-lg px-2 py-1">Intimidade: {Math.min(21,Math.max(0,m.intimidade-1))}/21</span>
           <span className="bg-bg-card border rounded-lg px-2 py-1">Família: {Math.min(7,Math.max(0,m.familia-1))}/7</span>
           <span className="bg-bg-card border rounded-lg px-2 py-1">Compaixão: {Math.min(7,Math.max(0,m.compaixao-1))}/7</span>
           {m.badge&&<span className="bg-bg-card border rounded-lg px-2 py-1">Insígnia conquistada</span>}
         </div>
        </div>)}</div>}
       <button onClick={()=>router.push("/pastor/membros")} className="flex items-center gap-2 text-sm underline">Ver lista completa <ArrowRight size={16}/></button>
     </section>
     <section className="rounded-xl border border-accent/20 bg-bg-card p-4 text-sm flex items-center justify-between gap-2">
       <span>Convites e cadastro da igreja</span><button className="underline font-bold" onClick={()=>router.push("/igreja")}>Gerenciar convite</button>
     </section>
   </div>
 </main>;
}
