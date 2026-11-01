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
 const [fieldError,setFieldError]=useState<{field:string;message:string}|null>(null);
 const [notice,setNotice]=useState("");
 const [code,setCode]=useState("");
 const [invitedCode,setInvitedCode]=useState("");
 const formRef=useRef<HTMLFormElement|null>(null);
 const submitLockRef=useRef(false);
 const submittedRef=useRef(false);
 useEffect(()=>{
  if(!mode)return;
  const handle=window.setTimeout(()=>{
   formRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
  },60);
  return()=>window.clearTimeout(handle);
 },[mode]);
 const chooseMode=(next:"pastor"|"membro")=>{
  setError("");setNotice("");setFieldError(null);
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
 const register=async(form:HTMLFormElement)=>{
  if(saving||submitLockRef.current||submittedRef.current)return;
  const data=new FormData(form);
  const values={
   nome:String(data.get("nome")||"").trim(),
   cidade:String(data.get("cidade")||"").trim(),
   estado:String(data.get("estado")||"").trim().toUpperCase(),
   pastor:String(data.get("pastor")||"").trim(),
   contato:String(data.get("contato")||"").trim(),
   convidados:String(data.get("convidados")||"").trim(),
   aceite:data.get("aceite")==="on"
  };
  setError("");setNotice("");setFieldError(null);
  // Validação explícita: o Safari/iOS pode impedir o submit sem mostrar qual campo falta.
  const checks:[string,string,boolean][]=[
   ["nome","Informe o nome oficial da igreja (mínimo de 4 caracteres).",values.nome.length>=4&&values.nome.length<=130],
   ["cidade","Informe a cidade da igreja.",values.cidade.length>0],
   ["estado","Informe a UF com duas letras (por exemplo, AP).",/^[A-Z]{2}$/.test(values.estado)],
   ["pastor","Informe o nome do pastor responsável.",values.pastor.length>0],
   ["contato","Informe um e-mail ou telefone para contato com a igreja.",values.contato.length>0],
   ["convidados","Informe a quantidade prevista de participantes, de 0 a 10.",/^\d+$/.test(values.convidados)&&Number(values.convidados)<=10],
   ["aceite","Confirme a autorização institucional para enviar o cadastro.",values.aceite]
  ];
  const invalid=checks.find(([, ,valid])=>!valid);
  if(invalid){
   const [field,message]=invalid;
   setError(message);
   setFieldError({field,message});
   const element=form.elements.namedItem(field);
   if(element instanceof HTMLElement){
    window.requestAnimationFrame(()=>{
     element.scrollIntoView({behavior:"smooth",block:"center"});
     element.focus({preventScroll:true});
    });
   }
   return;
  }
  submitLockRef.current=true;
  setSaving(true);
  try{
   // POST para a própria origem evita restrições do Safari/WhatsApp ao acesso direto ao Supabase.
   const response=await fetch("/api/igreja/cadastro",{
    method:"POST",
    credentials:"same-origin",
    cache:"no-store",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({...values,convidados:Number(values.convidados)})
   });
   let result:{ok?:boolean;message?:string};
   try{
    result=await response.json() as {ok?:boolean;message?:string};
   }catch{
    setError("O servidor retornou uma resposta inesperada. Abra o ROTA29 no Safari e tente novamente.");
    return;
   }
   if(!response.ok||!result.ok){
    setError(result.message||"O cadastro não foi concluído. Tente novamente.");
    return;
   }
   submittedRef.current=true;
   setNotice("Cadastro recebido. A coordenação precisa aprovar sua igreja antes de liberar convites.");
   setMode(null);
   try{await load();}catch{
    setNotice("Cadastro enviado. Não foi possível atualizar a tela; reabra Minha igreja para conferir a aprovação.");
   }
   window.scrollTo({top:0,behavior:"smooth"});
  }catch{
   setError("O envio não chegou ao servidor. Verifique sua conexão e abra o ROTA29 diretamente no Safari, fora do WhatsApp.");
  }finally{
   submitLockRef.current=false;
   setSaving(false);
  }
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
    {mode==="pastor"&&<form ref={formRef} noValidate onSubmit={ev=>{ev.preventDefault();void register(ev.currentTarget);}} onInput={ev=>{const target=ev.target;if(target instanceof HTMLInputElement&&target.name===fieldError?.field){setFieldError(null);setError("");}}} id="rota29-form-pastor" className="bg-white rounded-2xl border-2 border-[#0F3D33] p-5 space-y-4 scroll-mt-4 shadow-lg">
     <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-bold">Cadastrar minha igreja</h2><button type="button" onClick={()=>setMode(null)} className="text-sm underline">Fechar</button></div>
     <p className="text-sm">Preencha os dados abaixo e toque em <strong>Enviar cadastro da igreja</strong>. Só depois disso a coordenação receberá sua solicitação.</p>
     <label className="block text-sm">Nome oficial<input name="nome" className={input} minLength={4} maxLength={130} required aria-invalid={fieldError?.field==="nome"}/>{fieldError?.field==="nome"&&<span className="block text-xs text-red-700 mt-1">{fieldError.message}</span>}</label>
     <div className="grid grid-cols-[1fr_80px] gap-2"><label className="block text-sm">Cidade<input name="cidade" className={input} maxLength={90} required aria-invalid={fieldError?.field==="cidade"}/>{fieldError?.field==="cidade"&&<span className="block text-xs text-red-700 mt-1">{fieldError.message}</span>}</label><label className="block text-sm">UF<input name="estado" className={input} pattern="[A-Za-z]{2}" minLength={2} maxLength={2} required autoCapitalize="characters" aria-invalid={fieldError?.field==="estado"}/>{fieldError?.field==="estado"&&<span className="block text-xs text-red-700 mt-1">{fieldError.message}</span>}</label></div>
     <label className="block text-sm">Pastor responsável<input name="pastor" className={input} maxLength={130} required aria-invalid={fieldError?.field==="pastor"}/>{fieldError?.field==="pastor"&&<span className="block text-xs text-red-700 mt-1">{fieldError.message}</span>}</label>
     <label className="block text-sm">E-mail ou telefone da igreja<input name="contato" className={input} maxLength={150} required aria-invalid={fieldError?.field==="contato"}/>{fieldError?.field==="contato"&&<span className="block text-xs text-red-700 mt-1">{fieldError.message}</span>}</label>
     <label className="block text-sm">Participantes previstos (até 10 além do pastor)<input name="convidados" type="number" min={0} max={10} required inputMode="numeric" className={input} aria-invalid={fieldError?.field==="convidados"}/>{fieldError?.field==="convidados"&&<span className="block text-xs text-red-700 mt-1">{fieldError.message}</span>}</label>
     <label className="flex gap-2 text-sm"><input type="checkbox" name="aceite" required aria-invalid={fieldError?.field==="aceite"}/>Confirmo a autorização institucional e o aviso de tratamento dos dados do piloto.</label>
     {error&&<p role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>}
     <button type="button" onClick={()=>{if(formRef.current)void register(formRef.current);}} disabled={saving} className="w-full rounded-xl bg-[#0F3D33] text-white p-4 font-bold disabled:opacity-60">{saving?"Enviando…":"Enviar cadastro da igreja"}</button>
     <p className="text-xs text-[#547266]">Cadastro compatível com iPhone · versão 2. Se não concluir, a mensagem acima indicará o motivo.</p>
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