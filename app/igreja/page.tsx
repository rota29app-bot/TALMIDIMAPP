"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { Building2, Copy, Users } from "lucide-react";
type Church = {nome?:string|null;role?:string;pilot?:boolean;is_admin?:boolean;individual?:boolean;codigo_convite?:string|null;status?:string};
const input = "w-full border border-[#c5b696] rounded-xl bg-white px-4 py-3 text-[#0F3D33]";
export default function RegistroIgreja() {
 const router=useRouter();
 const [church,setChurch]=useState<Church|null>(null);
 const [mode,setMode]=useState<"pastor"|"membro"|"basic"|null>(null);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [code,setCode]=useState("");
 useEffect(()=>{
  let alive=true;
  const load=async()=>{
   const db=createClient();
   const {data:{user}}=await db.auth.getUser();
   if(!alive)return;
   if(!user){router.replace("/start");return;}
   const {data,error:e}=await db.rpc("pilot_my_church");
   if(!alive)return;
   if(e)setError("Não foi possível verificar seu cadastro. Atualize a página.");
   else if(data&&(data.is_admin||data.nome||data.individual)){
    const {data:policy,error:policyError}=await db.rpc("rota29_pilot_access");
    if(!alive)return;
    if(policyError)setError("Não foi possível verificar a liberação da igreja.");
    setChurch({...data,status:policy?.status||"pending"});
   }
   setLoading(false);
  };
  void load();
  return()=>{alive=false;};
 },[router]);
 const register=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(saving)return;
  setError("");setSaving(true);
  const values=new FormData(event.currentTarget);
  const {data,error:e}=await createClient().rpc("pilot_register_church",{
   p_nome:String(values.get("nome")||"").trim(),
   p_cidade:String(values.get("cidade")||"").trim(),
   p_estado:String(values.get("estado")||"").trim().toUpperCase(),
   p_pastor:String(values.get("pastor")||"").trim(),
   p_contato:String(values.get("contato")||"").trim(),
   p_convidados:Number(values.get("convidados")),
   p_aceite:values.get("aceite")==="on"
  });
  setSaving(false);
  if(e){setError(e.message);return;}
  setChurch({...data,pilot:true,role:"pastor",status:"pending"});
  setMessage("Cadastro recebido. Aguarde a aprovação da coordenação para compartilhar o convite.");
 };
 const join=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(saving)return;
  setError("");setSaving(true);
  const {data,error:e}=await createClient().rpc("pilot_join_church",{p_codigo:code.trim().toUpperCase()});
  setSaving(false);
  if(e){setError(e.message);return;}
  setChurch({...data,pilot:true,role:"membro"});
  setMessage("Participação vinculada. Sua jornada já pode começar.");
 };
 const selectBasic=async()=> {
   if(saving)return; setSaving(true);setError("");
   const {data,error:e}=await createClient().rpc("rota29_choose_basic");
   setSaving(false);
   if(e){setError(e.message);return;}
   setChurch({...data,individual:true,role:"membro"});
   setMessage("Plano Básico ativado: sua jornada individual está pronta.");
 };
 if(loading)return <main className="min-h-screen bg-[#F8F5F0] flex items-center justify-center">Preparando cadastro…</main>;
 return <main className="min-h-screen bg-[#F8F5F0] text-[#0F3D33] p-6"><div className="max-w-lg mx-auto space-y-5">
  <header className="text-center space-y-3"><Building2 className="mx-auto" size={32}/><p className="text-xs tracking-widest uppercase">ROTA29 · Formação e liderança</p><h1 className="text-3xl font-bold font-serif">Como deseja participar?</h1><p className="text-sm">A igreja licencia o ROTA29 para sua comunidade, enquanto membros utilizam a jornada incluída. Também há o modo Básico individual.</p></header>
  {error&&<p role="alert" className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl">{error}</p>}
  {message&&<p role="status" className="p-3 bg-green-50 border border-green-200 rounded-xl">{message}</p>}
  <section className="rounded-2xl border border-[#c5b696] bg-white p-4 text-sm space-y-2">
    <h2 className="font-bold text-base">Cadastro completo do piloto</h2>
    <p>1. A igreja se cadastra aqui, por meio do seu pastor responsável.</p>
    <p>2. A coordenação aprova a igreja e libera o convite para 10 participantes, além do pastor.</p>
    <p>3. Cada participante entra com Google e se vincula à igreja pelo código.</p>
    <p>4. O pastor acompanha a própria comunidade durante a jornada de 21 dias.</p>
  </section>
  {church?<section className="p-5 border border-[#c5b696] rounded-2xl bg-white space-y-4">
   {church.is_admin?<><h2 className="font-bold text-xl">Conta administrativa</h2><p>Gerencie o piloto no Painel Master.</p><button className="w-full bg-[#0F3D33] text-white rounded-xl p-3 font-bold" onClick={()=>router.push("/admin")}>Abrir administração</button></>:
   church.individual?<><h2 className="font-bold text-xl">Plano Básico individual</h2><p>Sua jornada pessoal segue o período do piloto: 15/10 a 13/11, até a primeira insígnia.</p><button className="w-full bg-[#0F3D33] text-white rounded-xl p-3" onClick={()=>router.push("/onboarding")}>Conhecer minha jornada</button></>:
   church.status==="pending"||church.status==="suspended"?<><h2 className="font-bold text-xl">{church.nome}</h2><p>{church.status==="pending"?"Aguardando aprovação da coordenação. O convite será liberado após a conferência do cadastro.":"A participação desta igreja foi suspensa. Procure a coordenação."}</p><p>São 10 vagas de participantes, além do pastor. Período: 15/10 a 13/11/2026.</p><button type="button" className="underline" onClick={()=>window.location.reload()}>Conferir liberação</button></>:
   church.pilot?<><h2 className="font-bold text-xl">{church.nome}</h2><p>{church.role==="pastor"?"Cadastro realizado. Envie seu código aos participantes.":"Você está vinculado à sua igreja."}</p>
    {church.codigo_convite&&<div className="p-4 rounded-xl bg-[#f7f0df]"><p className="text-sm mb-2">Código de convite da igreja</p><p className="font-mono text-lg font-bold tracking-widest break-all">{church.codigo_convite}</p><button type="button" className="flex gap-2 items-center underline text-sm mt-3" onClick={async()=>{try{await navigator.clipboard.writeText(church.codigo_convite||"");setMessage("Código copiado.");}catch{setMessage("Copie o código exibido.");}}}><Copy size={16}/>Copiar convite</button><a className="block underline text-sm mt-3" target="_blank" rel="noopener noreferrer" href={"https://wa.me/?text="+encodeURIComponent("Você foi convidado para a jornada ROTA29 — Discipulado no cotidiano. Entre com Google em https://rota29-piloto.vercel.app e escolha Sou participante. Código da igreja: "+church.codigo_convite)}>Compartilhar convite pelo WhatsApp</a></div>}
    <button className="w-full bg-[#0F3D33] text-white rounded-xl p-3 font-bold" onClick={()=>router.push(church.role==="pastor"?"/pastor":"/onboarding")}>{church.role==="pastor"?"Abrir painel pastoral":"Começar minha jornada"}</button>
    {church.role==="pastor"&&<button className="w-full border border-[#0F3D33] rounded-xl p-3" onClick={()=>router.push("/pastor")}>Acompanhamento pastoral</button>}</>:
   <><h2 className="font-bold text-xl">Conta anterior ao piloto</h2><p>Seu histórico foi mantido, mas a conta antiga não participa deste piloto. Entre em contato com a coordenação.</p></>}
  </section>:
  <><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
   <button type="button" className="bg-white border rounded-xl p-4 text-left" onClick={()=>setMode("pastor")}><Building2/><strong className="block mt-2">Sou pastor</strong><span className="text-xs">Cadastrar igreja</span></button>
   <button type="button" className="bg-white border rounded-xl p-4 text-left" onClick={()=>setMode("membro")}><Users/><strong className="block mt-2">Sou participante</strong><span className="text-xs">Entrar por convite</span></button>
  </div>
  <button type="button" onClick={()=>setMode("basic")}
    className="w-full rounded-xl border border-[#C79A5B] bg-[#F8F5F0] px-4 py-4 text-left">
    <strong className="block">Usar individualmente — Básico</strong>
    <span className="text-sm">Acesso à jornada sem painel de gestão. Não exige convite de igreja.</span>
  </button>
  {mode==="basic"&&<section className="rounded-2xl bg-white border p-5 space-y-3">
    <h2 className="font-bold text-xl">Plano Básico</h2>
    <p className="text-sm">Uso pessoal. Se participar de uma igreja licenciada, poderá informar o convite posteriormente.</p>
    <button type="button" onClick={()=>void selectBasic()} disabled={saving}
      className="w-full rounded-xl bg-[#0F3D33] text-white p-4 font-bold">{saving?"Ativando…":"Iniciar uso individual"}</button>
  </section>}
  {mode==="pastor"&&<form className="rounded-2xl bg-white border p-5 space-y-4" onSubmit={register}>
   <h2 className="text-xl font-bold">Cadastro da igreja</h2>
   <label className="block text-sm">Nome oficial<input name="nome" className={input} minLength={4} maxLength={130} required/></label>
   <div className="grid grid-cols-[1fr_85px] gap-3"><label className="block text-sm">Cidade<input name="cidade" className={input} required maxLength={90}/></label><label className="block text-sm">UF<input name="estado" className={input} required minLength={2} maxLength={2} pattern="[A-Za-z]{2}"/></label></div>
   <label className="block text-sm">Pastor responsável<input name="pastor" className={input} required maxLength={130}/></label>
   <label className="block text-sm">Contato da igreja<input name="contato" className={input} required maxLength={150} placeholder="E-mail ou telefone"/></label>
   <label className="block text-sm">Participantes previstos (até 10, além do pastor)<input name="convidados" className={input} type="number" required min={0} max={10}/></label>
   <label className="flex gap-2 text-sm"><input name="aceite" type="checkbox" required/>Confirmo que tenho autorização para o cadastro e informarei os convidados sobre a coleta de dados do piloto.</label>
   <button className="w-full rounded-xl bg-[#0F3D33] text-white p-4 font-bold" disabled={saving}>{saving?"Cadastrando…":"Enviar cadastro para aprovação"}</button>
  </form>}
  {mode==="membro"&&<form className="rounded-2xl bg-white border p-5 space-y-4" onSubmit={join}>
   <h2 className="text-xl font-bold">Convite do pastor</h2>
   <p className="text-sm">Digite o código que seu pastor compartilhou.</p>
   <input aria-label="Código de convite" className={input+" font-mono tracking-widest"} value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g,""))} minLength={16} maxLength={16} required/>
   <button className="w-full rounded-xl bg-[#0F3D33] text-white p-4 font-bold" disabled={saving||code.length!==16}>{saving?"Vinculando…":"Entrar na igreja"}</button>
  </form>}
  </>}
  <p className="text-xs text-center text-[#687568]">Cadastros do piloto são monitorados apenas pelos responsáveis autorizados.</p>
 </div></main>;
}
