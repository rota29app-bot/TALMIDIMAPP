"use client";
import {useCallback,useEffect,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "../../utils/supabase/client";
import {Building2,Copy,Users,ShieldCheck,Clock3} from "lucide-react";

type Church={
 nome?:string|null;igreja_id?:string|null;role?:string;pilot?:boolean;
 is_admin?:boolean;codigo_convite?:string|null;
 approval_status?:string|null;pending_igreja?:string|null;
};
type Access={status?:string;allowed?:boolean;ends_on?:string};
const input="w-full border border-[#C79A5B]/60 rounded-xl bg-white px-4 py-3 text-[#0F3D33]";

export default function RegistroIgreja(){
 const router=useRouter();
 const [church,setChurch]=useState<Church|null>(null);
 const [access,setAccess]=useState<Access|null>(null);
 const [mode,setMode]=useState<"pastor"|"membro"|null>(null);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [code,setCode]=useState("");
 const load=useCallback(async()=>{
  const db=createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user){router.replace("/start");return;}
  const [membership,permission]=await Promise.all([db.rpc("pilot_my_church"),db.rpc("rota29_pilot_access")]);
  if(membership.error||permission.error){
   setError("Não foi possível verificar a sua autorização. Tente novamente.");
  }else{
   setChurch(membership.data as Church);
   setAccess(permission.data as Access);
   setError("");
  }
  setLoading(false);
 },[router]);
 useEffect(()=>{void load();},[load]);
 const register=async(ev:FormEvent<HTMLFormElement>)=>{
  ev.preventDefault();if(saving)return;
  setError("");setNotice("");setSaving(true);
  const data=new FormData(ev.currentTarget);
  const {error:e}=await createClient().rpc("pilot_register_church",{
   p_nome:String(data.get("nome")||"").trim(),
   p_cidade:String(data.get("cidade")||"").trim(),
   p_estado:String(data.get("estado")||"").trim().toUpperCase(),
   p_pastor:String(data.get("pastor")||"").trim(),
   p_contato:String(data.get("contato")||"").trim(),
   p_convidados:Number(data.get("convidados")),p_aceite:data.get("aceite")==="on"
  });
  setSaving(false);
  if(e){setError(e.message);return;}
  setNotice("Cadastro recebido. A coordenação precisa aprovar sua igreja antes de liberar convites.");
  await load();
 };
 const requestJoin=async(ev:FormEvent<HTMLFormElement>)=>{
  ev.preventDefault();if(saving)return;
  setError("");setNotice("");setSaving(true);
  const {data,error:e}=await createClient().rpc("pilot_join_church",{p_codigo:code.trim().toUpperCase()});
  setSaving(false);
  if(e){setError(e.message);return;}
  setChurch(prev=>({...prev,pending_igreja:data?.nome||null,approval_status:data?.status||"pending"}));
  setNotice("Solicitação enviada. Aguarde a aprovação expressa do pastor. O código não libera acesso automaticamente.");
  await load();
 };
 if(loading)return <main className="min-h-screen grid place-items-center bg-[#E9DFCE] text-[#0F3D33]">Conferindo autorização…</main>;
 const pastor=church?.role==="pastor"&&church.pilot;
 const member=church?.role==="membro"&&church.pilot&&church.igreja_id;
 return <main className="min-h-screen bg-[#E9DFCE] text-[#0F3D33] p-5">
 <div className="mx-auto max-w-xl space-y-5 pb-12">
  <header className="space-y-2 text-center pt-5">
   <img src="/brand/rota29-logo.svg" alt="ROTA29" className="mx-auto w-40 h-auto"/>
   <h1 className="font-serif font-bold text-3xl">Acesso por igreja</h1>
   <p className="text-sm">Discipulado no cotidiano · Piloto institucional</p>
  </header>
  <section className="rounded-2xl border border-[#C79A5B]/40 bg-white p-5 space-y-2 text-sm">
   <div className="flex items-center gap-2 font-bold text-base"><ShieldCheck size={19}/> Participação autorizada</div>
   <p>1. A coordenação aprova o cadastro da igreja.</p>
   <p>2. O pastor compartilha o código oficial com seus participantes.</p>
   <p>3. Cada participante entra com Google, informa o código e aguarda aprovação individual.</p>
   <p>4. Somente o pastor da igreja libera o acesso à jornada.</p>
   <p className="text-xs text-[#547266]">O acesso individual sem igreja está desativado no piloto.</p>
  </section>
  {error&&<p role="alert" className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">{error}</p>}
  {notice&&<p role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-[#0F3D33] text-sm">{notice}</p>}
  {church?.is_admin?<section className="rounded-2xl bg-white p-5 space-y-3"><h2 className="text-xl font-bold">Coordenação</h2><button onClick={()=>router.push("/admin")} className="w-full rounded-xl bg-[#0F3D33] text-white p-4 font-bold">Abrir painel administrativo</button></section>:
   pastor?<section className="rounded-2xl bg-white border border-[#C79A5B]/40 p-5 space-y-4">
    <h2 className="text-xl font-bold">{church.nome}</h2>
    {access?.status==="pastor"?<>
     <p className="text-sm">Sua igreja está liberada. Compartilhe este código apenas com os participantes autorizados. Cada pedido precisará de sua aprovação.</p>
     {church.codigo_convite&&<div className="rounded-xl bg-[#F5EFE4] p-4 space-y-3">
      <p className="text-xs uppercase tracking-wide">Código da igreja</p>
      <strong className="block font-mono tracking-wider break-all">{church.codigo_convite}</strong>
      <button className="flex items-center gap-2 text-sm underline" onClick={async()=>{try{await navigator.clipboard.writeText(church.codigo_convite||"");setNotice("Código copiado.");}catch{setNotice("Copie o código exibido.");}}}><Copy size={16}/> Copiar código</button>
      <a className="block text-sm underline" target="_blank" rel="noopener noreferrer" href={"https://wa.me/?text="+encodeURIComponent("Convite ROTA29 — Discipulado no cotidiano. Entre em https://rota29-piloto.vercel.app e informe o código da igreja: "+church.codigo_convite+". Sua participação dependerá da aprovação do pastor.")}>Enviar convite pelo WhatsApp</a>
     </div>}
     <button onClick={()=>router.push("/pastor")} className="w-full rounded-xl bg-[#0F3D33] text-white p-4 font-bold">Abrir painel pastoral e aprovações</button>
    </>:<><div className="flex gap-2 items-center"><Clock3 size={18}/><strong>Aguardando aprovação da coordenação</strong></div><p className="text-sm">O pastor não pode distribuir convites antes da liberação institucional.</p></>}
   </section>:
   member?<section className="rounded-2xl bg-white border border-[#C79A5B]/40 p-5 space-y-4">
    <h2 className="text-xl font-bold">{church.nome}</h2>
    <p className="text-sm">Sua igreja e seu pastor autorizaram sua participação.</p>
    <button onClick={()=>router.push("/onboarding")} className="w-full rounded-xl bg-[#0F3D33] text-white p-4 font-bold">Começar minha jornada</button>
   </section>:
   church?.pending_igreja?<section className="rounded-2xl bg-white border border-[#C79A5B]/40 p-5 space-y-3">
    <div className="flex items-center gap-2"><Clock3 size={20}/><h2 className="text-xl font-bold">Aguardando o pastor</h2></div>
    <p>Pedido encaminhado à igreja <strong>{church.pending_igreja}</strong>.</p>
    <p className="text-sm">Seu login já foi identificado, mas a jornada permanecerá bloqueada até a aprovação do pastor.</p>
    <button type="button" className="w-full rounded-xl border p-3 font-bold" onClick={()=>void load()}>Verificar aprovação</button>
   </section>:
   church?.role==="pastor"?<section className="rounded-2xl bg-white p-5 space-y-2"><h2 className="text-xl font-bold">Conta pastoral anterior</h2><p className="text-sm">Para participar do novo piloto institucional, solicite à coordenação a atualização do seu vínculo.</p></section>:
   <section className="space-y-3">
    <div className="grid grid-cols-2 gap-3">
     <button type="button" onClick={()=>setMode("pastor")} className="rounded-2xl bg-white border p-4 text-left space-y-2"><Building2/><strong className="block">Sou pastor</strong><span className="text-xs">Cadastrar igreja</span></button>
     <button type="button" onClick={()=>setMode("membro")} className="rounded-2xl bg-white border p-4 text-left space-y-2"><Users/><strong className="block">Sou participante</strong><span className="text-xs">Solicitar entrada com código</span></button>
    </div>
    {mode==="pastor"&&<form onSubmit={register} className="bg-white rounded-2xl border p-5 space-y-4">
     <h2 className="text-xl font-bold">Cadastro de igreja</h2>
     <label className="block text-sm">Nome oficial<input name="nome" className={input} minLength={4} maxLength={130} required/></label>
     <div className="grid grid-cols-[1fr_80px] gap-2"><label className="block text-sm">Cidade<input name="cidade" className={input} maxLength={90} required/></label><label className="block text-sm">UF<input name="estado" className={input} pattern="[A-Za-z]{2}" minLength={2} maxLength={2} required/></label></div>
     <label className="block text-sm">Pastor responsável<input name="pastor" className={input} maxLength={130} required/></label>
     <label className="block text-sm">E-mail ou telefone da igreja<input name="contato" className={input} maxLength={150} required/></label>
     <label className="block text-sm">Participantes previstos (até 10 além do pastor)<input name="convidados" type="number" min={0} max={10} required className={input}/></label>
     <label className="flex gap-2 text-sm"><input type="checkbox" name="aceite" required/>Confirmo a autorização institucional e o aviso de tratamento dos dados do piloto.</label>
     <button disabled={saving} className="w-full rounded-xl bg-[#0F3D33] text-white p-4 font-bold">{saving?"Enviando…":"Enviar para aprovação"}</button>
    </form>}
    {mode==="membro"&&<form onSubmit={requestJoin} className="bg-white rounded-2xl border p-5 space-y-4">
     <h2 className="text-xl font-bold">Código do pastor</h2>
     <p className="text-sm">Digite o código de 16 caracteres enviado pelo pastor. O código é uma solicitação de entrada, não uma autorização automática.</p>
     <input className={input+" font-mono tracking-widest"} aria-label="Código de convite" value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g,""))} minLength={16} maxLength={16} required/>
     <button disabled={saving||code.length!==16} className="w-full rounded-xl bg-[#0F3D33] text-white p-4 font-bold">{saving?"Enviando…":"Solicitar aprovação pastoral"}</button>
    </form>}
   </section>}
  <button type="button" className="block mx-auto text-xs underline" onClick={async()=>{await createClient().auth.signOut({scope:"local"});router.replace("/start");}}>Sair da conta</button>
  <p className="text-center text-xs text-[#547266]">ROTA29 · Discipulado no cotidiano</p>
 </div></main>;
}