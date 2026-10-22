"use client";
import {useCallback,useEffect,useRef,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "../../utils/supabase/client";
import InvitationJoin from "./InvitationJoin";
import InvitationShare from "./InvitationShare";
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
 const [currentEmail,setCurrentEmail]=useState("");
 const [access,setAccess]=useState<Access|null>(null);
 const [mode,setMode]=useState<"pastor"|"membro"|null>(null);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [code,setCode]=useState("");
 const [invitedCode,setInvitedCode]=useState("");
 const formRef=useRef<HTMLFormElement|null>(null);
 useEffect(()=>{
  if(!mode)return;
  const handle=window.setTimeout(()=>{
   formRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
  },60);
  return()=>window.clearTimeout(handle);
 },[mode]);
 const chooseMode=(next:"pastor"|"membro")=>{
  setError("");setNotice("");
  setMode(next);
 };
 const load=useCallback(async()=>{
  const db=createClient();
  const incoming=new URLSearchParams(window.location.search).get("convite");
  if(incoming!==null)setInvitedCode(incoming.trim().toUpperCase()||"INVALID");
  const {data:{user}}=await db.auth.getUser();
  if(!user){router.replace("/start"+(incoming!==null?"?convite="+encodeURIComponent(incoming):""));return;}
  setCurrentEmail(user.email||"");
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
  window.scrollTo({top:0,behavior:'smooth'});
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
  window.scrollTo({top:0,behavior:'smooth'});
 };
 if(loading)return <main className="min-h-screen grid place-items-center bg-[#E9DFCE] text-[#0F3D33]">Conferindo autorização…</main>;
 if(invitedCode)return <InvitationJoin code={invitedCode} church={church} refresh={load}/>;
 const pastor=church?.role==="pastor"&&church.pilot;
 const member=church?.role==="membro"&&church.pilot&&church.igreja_id;
 return <main className="min-h-screen bg-[#E9DFCE] text-[#0F3D33] p-5">
 <div className="mx-auto max-w-xl space-y-5 pb-12">
  <header className="space-y-2 text-center pt-5">
   <img src="/brand/rota29-logo.svg" alt="ROTA29" className="mx-auto w-40 h-auto"/>
   <h1 className="font-serif font-bold text-3xl">Acesso por igreja</h1>
   <p className="text-sm">Discipulado no cotidiano · Piloto institucional</p>
   {currentEmail&&<p className="text-xs break-all text-[#547266]">Conta Google: <strong>{currentEmail}</strong></p>}
  </header>
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
      <InvitationShare code={church.codigo_convite||""} name={church.nome}/>
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
   <section className="space-y-3">
    {church?.role==="pastor"&&<p className="rounded-xl bg-white border border-[#C79A5B]/50 p-4 text-sm">Você já usou uma conta pastoral anteriormente. Para participar do novo piloto, cadastre sua igreja aqui. Sua conta Google e seu histórico permanecem preservados.</p>}
    <p className="text-sm font-semibold">Qual é a sua participação?</p>
    <div className={church?.role==="pastor"?"grid grid-cols-1 gap-3":"grid grid-cols-2 gap-3"}>
     <button type="button" aria-pressed={mode==="pastor"} onClick={()=>chooseMode("pastor")} className={`rounded-2xl bg-white border-2 p-4 text-left space-y-2 ${mode==="pastor"?"border-[#0F3D33] shadow-md":"border-[#C79A5B]/40"}`}><Building2/><strong className="block">Cadastrar minha igreja</strong><span className="text-xs">Somente para responsáveis por uma nova igreja</span></button>
     {church?.role!=="pastor"&&<button type="button" aria-pressed={mode==="membro"} onClick={()=>chooseMode("membro")} className={`rounded-2xl bg-white border-2 p-4 text-left space-y-2 ${mode==="membro"?"border-[#0F3D33] shadow-md":"border-[#C79A5B]/40"}`}><Users/><strong className="block">Tenho convite de uma igreja</strong><span className="text-xs">Inclusive pastores convidados como participantes</span></button>}
    </div>
    {mode==="pastor"&&<form ref={formRef} onSubmit={register} id="rota29-form-pastor" className="bg-white rounded-2xl border-2 border-[#0F3D33] p-5 space-y-4 scroll-mt-4 shadow-lg">
     <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-bold">Cadastrar minha igreja</h2><button type="button" onClick={()=>setMode(null)} className="text-sm underline">Fechar</button></div>
     <p className="text-sm">Preencha os dados abaixo e toque em <strong>Enviar cadastro da igreja</strong>. Só depois disso a coordenação receberá sua solicitação.</p>
     <label className="block text-sm">Nome oficial<input name="nome" className={input} minLength={4} maxLength={130} required/></label>
     <div className="grid grid-cols-[1fr_80px] gap-2"><label className="block text-sm">Cidade<input name="cidade" className={input} maxLength={90} required/></label><label className="block text-sm">UF<input name="estado" className={input} pattern="[A-Za-z]{2}" minLength={2} maxLength={2} required/></label></div>
     <label className="block text-sm">Pastor responsável<input name="pastor" className={input} maxLength={130} required/></label>
     <label className="block text-sm">E-mail ou telefone da igreja<input name="contato" className={input} maxLength={150} required/></label>
     <label className="block text-sm">Participantes previstos (até 10 além do pastor)<input name="convidados" type="number" min={0} max={10} required className={input}/></label>
     <label className="flex gap-2 text-sm"><input type="checkbox" name="aceite" required/>Confirmo a autorização institucional e o aviso de tratamento dos dados do piloto.</label>
     {error&&<p role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>}
     <button type="submit" disabled={saving} className="w-full rounded-xl bg-[#0F3D33] text-white p-4 font-bold disabled:opacity-60">{saving?"Enviando…":"Enviar cadastro da igreja"}</button>
    </form>}
    {mode==="membro"&&<form ref={formRef} onSubmit={requestJoin} id="rota29-form-membro" className="bg-white rounded-2xl border-2 border-[#0F3D33] p-5 space-y-4 scroll-mt-4 shadow-lg">
     <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-bold">Código do pastor</h2><button type="button" onClick={()=>setMode(null)} className="text-sm underline">Fechar</button></div>
     <p className="text-sm">Digite o código de 16 caracteres enviado pelo pastor. Após entrar com Google, confirme o pedido tocando em “Solicitar aprovação pastoral” abaixo. O código não libera a jornada sozinho.</p>
     <input className={input+" font-mono tracking-widest"} aria-label="Código de convite" value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g,""))} minLength={16} maxLength={16} required/>
     {error&&<p role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>}
     <button type="submit" disabled={saving||code.length!==16} className="w-full rounded-xl bg-[#0F3D33] text-white p-4 font-bold disabled:opacity-60">{saving?"Enviando…":"Solicitar aprovação pastoral"}</button>
    </form>}
   </section>}
  <section className="rounded-2xl border border-[#C79A5B]/40 bg-white p-5 space-y-2 text-sm">
   <div className="flex items-center gap-2 font-bold text-base"><ShieldCheck size={19}/> Participação autorizada</div>
   <p>1. A coordenação aprova o cadastro da igreja.</p>
   <p>2. O pastor compartilha o código oficial com seus participantes.</p>
   <p>3. Cada participante entra com Google, informa o código e aguarda aprovação individual.</p>
   <p>4. Somente o pastor da igreja libera o acesso à jornada.</p>
   <p className="text-xs text-[#547266]">O acesso individual sem igreja está desativado no piloto.</p>
  </section>
  <button type="button" className="block mx-auto text-xs underline" onClick={async()=>{await createClient().auth.signOut({scope:"local"});router.replace("/start");}}>Sair da conta</button>
  <p className="text-center text-xs text-[#547266]">ROTA29 · Discipulado no cotidiano</p>
 </div></main>;
}